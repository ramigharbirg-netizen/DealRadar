import { createClient } from "npm:@supabase/supabase-js@2";

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type FcmErrorDetail = {
  "@type"?: string;
  errorCode?: string;
};

type FcmResponseBody = {
  error?: {
    status?: string;
    message?: string;
    details?: FcmErrorDetail[];
  };
};

type ExpiryNotification = {
  id: string;
  opportunity_id: string;
  user_id: string;
  notification_type: "expiry_7d" | "expiry_3d";
  expires_at_snapshot: string;
  scheduled_for: string;
  attempts: number;
};

type PurgeJob = {
  id: string;
  opportunity_id: string;
  image_urls: unknown;
  attempts: number;
};

const responseHeaders = {
  "Content-Type": "application/json",
};

const encoder = new TextEncoder();

function base64UrlEncode(input: ArrayBuffer | string) {
  const bytes =
    typeof input === "string" ? encoder.encode(input) : new Uint8Array(input);

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string) {
  const cleanPem = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binary = atob(cleanPem);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

async function createFirebaseAccessToken(serviceAccount: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsignedJwt = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(claimSet),
  )}`;

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    encoder.encode(unsignedJwt),
  );

  const jwt = `${unsignedJwt}.${base64UrlEncode(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    console.error("Firebase OAuth error:", data);
    throw new Error("Firebase OAuth token creation failed");
  }

  return data.access_token as string;
}

function getFirebaseServiceAccount(): ServiceAccount {
  const encoded = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_BASE64");
  if (!encoded) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64 secret");

  const json = new TextDecoder().decode(
    Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0)),
  );

  return JSON.parse(json);
}

function getFcmErrorCode(fcmData: FcmResponseBody) {
  return (
    fcmData.error?.details?.find((detail) =>
      detail["@type"]?.includes("firebase.fcm")
    )?.errorCode ||
    fcmData.error?.status ||
    null
  );
}

function opportunityImagePath(url: string) {
  const marker = "/opportunity-images/";
  const index = url.indexOf(marker);
  if (index === -1) return null;

  const value = url.slice(index + marker.length).split("?")[0];
  if (!value) return null;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseImagePaths(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map(opportunityImagePath)
        .filter((item): item is string => Boolean(item)),
    ),
  );
}

function retryAt(attempts: number) {
  const hours = Math.min(24, Math.max(1, 2 ** Math.min(attempts, 4)));
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

Deno.serve(async (req) => {

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: responseHeaders },
    );
  }

  const expectedSecret = Deno.env.get("DEALRADAR_INTERNAL_SECRET");
  const receivedSecret = req.headers.get("x-dealradar-secret");

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: responseHeaders },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Safe to call even though the DB cron also runs it: the SQL function is idempotent.
    const { data: lifecycleResult, error: lifecycleError } = await supabaseAdmin.rpc(
      "process_opportunity_lifecycle",
    );

    if (lifecycleError) {
      console.error("Lifecycle RPC error:", lifecycleError);
    }

    const nowIso = new Date().toISOString();

    const { data: dueNotifications, error: notificationError } =
      await supabaseAdmin.rpc("claim_due_expiry_notifications", {
        p_limit: 100,
        p_lease_minutes: 10,
      });

    if (notificationError) throw notificationError;

    let firebaseAccessToken: string | null = null;
    let serviceAccount: ServiceAccount | null = null;
    let notificationsSent = 0;
    let notificationsSkipped = 0;
    let notificationFailures = 0;

    for (const notification of (dueNotifications || []) as ExpiryNotification[]) {
      const { data: opportunity } = await supabaseAdmin
        .from("opportunities")
        .select("id, title, content_type, lifecycle_status, expires_at")
        .eq("id", notification.opportunity_id)
        .maybeSingle();

      const cycleStillValid =
        opportunity &&
        opportunity.lifecycle_status === "active" &&
        new Date(opportunity.expires_at).getTime() ===
          new Date(notification.expires_at_snapshot).getTime() &&
        new Date(opportunity.expires_at).getTime() > Date.now();

      if (!cycleStillValid) {
        await supabaseAdmin
          .from("opportunity_expiry_notifications")
          .update({
            status: "skipped_obsolete",
            sent_at: nowIso,
            last_error: "Obsolete lifecycle cycle",
            processing_started_at: null,
          })
          .eq("id", notification.id);
        notificationsSkipped += 1;
        continue;
      }

      const { data: tokens, error: tokensError } = await supabaseAdmin
        .from("push_tokens")
        .select("id, token")
        .eq("user_id", notification.user_id);

      if (tokensError) {
        await supabaseAdmin
          .from("opportunity_expiry_notifications")
          .update({
            status: "retry",
            attempts: notification.attempts + 1,
            next_attempt_at: retryAt(notification.attempts + 1),
            last_error: tokensError.message.slice(0, 500),
            processing_started_at: null,
          })
          .eq("id", notification.id);
        notificationFailures += 1;
        continue;
      }

      if (!tokens || tokens.length === 0) {
        await supabaseAdmin
          .from("opportunity_expiry_notifications")
          .update({
            status: "skipped_no_token",
            sent_at: nowIso,
            last_error: "No push tokens",
            processing_started_at: null,
          })
          .eq("id", notification.id);
        notificationsSkipped += 1;
        continue;
      }

      if (!serviceAccount || !firebaseAccessToken) {
        serviceAccount = getFirebaseServiceAccount();
        firebaseAccessToken = await createFirebaseAccessToken(serviceAccount);
      }

      const days = notification.notification_type === "expiry_7d" ? 7 : 3;
      const noun = opportunity.content_type === "deal" ? "affare" : "annuncio";
      const title = `Il tuo ${noun} scade tra ${days} giorni`;
      const body = `“${String(opportunity.title || "Pubblicazione").slice(0, 80)}” sta per scadere. Apri DealRadar per controllarlo o rinnovarlo.`;

      let sentToAtLeastOneToken = false;
      const invalidTokenCodes = ["UNREGISTERED"];
      const errors: string[] = [];

      for (const token of tokens) {
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firebaseAccessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                token: token.token,
                notification: { title, body },
                data: {
                  type: "opportunity_expiry_reminder",
                  opportunity_id: opportunity.id,
                  reminder: notification.notification_type,
                },
                android: {
                  priority: "high",
                  notification: { channel_id: "opportunity_updates", sound: "default" },
                },
              },
            }),
          },
        );

        const fcmData = (await response.json()) as FcmResponseBody;
        const errorCode = getFcmErrorCode(fcmData);

        if (response.ok) {
          sentToAtLeastOneToken = true;
        } else {
          errors.push(errorCode || fcmData.error?.message || `HTTP ${response.status}`);
          if (errorCode && invalidTokenCodes.includes(errorCode)) {
            const { error: deleteTokenError } = await supabaseAdmin
              .from("push_tokens")
              .delete()
              .eq("id", token.id);

            if (deleteTokenError) {
              console.error(
                "Invalid lifecycle push token cleanup failed:",
                deleteTokenError,
              );
            }
          }
        }
      }

      if (sentToAtLeastOneToken) {
        await supabaseAdmin
          .from("opportunity_expiry_notifications")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            last_error: errors.length > 0 ? errors.join(" | ").slice(0, 500) : null,
            processing_started_at: null,
          })
          .eq("id", notification.id);
        notificationsSent += 1;
      } else {
        await supabaseAdmin
          .from("opportunity_expiry_notifications")
          .update({
            status: "retry",
            attempts: notification.attempts + 1,
            next_attempt_at: retryAt(notification.attempts + 1),
            last_error: (errors.join(" | ") || "FCM delivery failed").slice(0, 500),
            processing_started_at: null,
          })
          .eq("id", notification.id);
        notificationFailures += 1;
      }
    }

    const { data: purgeJobs, error: purgeError } =
      await supabaseAdmin.rpc("claim_due_purge_jobs", {
        p_limit: 50,
        p_lease_minutes: 10,
      });

    if (purgeError) throw purgeError;

    let storageCompleted = 0;
    let storageFailures = 0;

    for (const job of (purgeJobs || []) as PurgeJob[]) {
      const paths = parseImagePaths(job.image_urls);

      if (paths.length === 0) {
        await supabaseAdmin
          .from("opportunity_purge_queue")
          .update({
            storage_status: "completed",
            completed_at: new Date().toISOString(),
            last_error: null,
            processing_started_at: null,
          })
          .eq("id", job.id);
        storageCompleted += 1;
        continue;
      }

      const { error: removeError } = await supabaseAdmin.storage
        .from("opportunity-images")
        .remove(paths);

      if (!removeError) {
        await supabaseAdmin
          .from("opportunity_purge_queue")
          .update({
            storage_status: "completed",
            completed_at: new Date().toISOString(),
            last_error: null,
            processing_started_at: null,
          })
          .eq("id", job.id);
        storageCompleted += 1;
      } else {
        await supabaseAdmin
          .from("opportunity_purge_queue")
          .update({
            storage_status: "retry",
            attempts: job.attempts + 1,
            next_attempt_at: retryAt(job.attempts + 1),
            last_error: removeError.message.slice(0, 500),
            processing_started_at: null,
          })
          .eq("id", job.id);
        storageFailures += 1;
      }
    }

    return Response.json(
      {
        success: true,
        lifecycle: lifecycleResult || null,
        notifications: {
          sent: notificationsSent,
          skipped: notificationsSkipped,
          failed: notificationFailures,
        },
        storage: {
          completed: storageCompleted,
          failed: storageFailures,
        },
      },
      { status: 200, headers: responseHeaders },
    );
  } catch (error) {
    console.error("Opportunity lifecycle worker error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500, headers: responseHeaders },
    );
  }
});
