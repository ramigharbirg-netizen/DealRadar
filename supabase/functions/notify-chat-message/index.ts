import { createClient } from "npm:@supabase/supabase-js@2";

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type ChatMessagePayload = {
  message_id?: string;
  record?: {
    id?: string;
    conversation_id?: string;
    sender_id?: string | null;
    sender_name?: string | null;
    message?: string | null;
  };
};

const responseHeaders = {
  "Content-Type": "application/json",
};

const encoder = new TextEncoder();

function base64UrlEncode(input: ArrayBuffer | string) {
  const bytes =
    typeof input === "string"
      ? encoder.encode(input)
      : new Uint8Array(input);

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

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

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

async function createFirebaseAccessToken(serviceAccount: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const claimSet = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsignedJwt = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(claimSet)
  )}`;

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    encoder.encode(unsignedJwt)
  );

  const jwt = `${unsignedJwt}.${base64UrlEncode(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
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

  if (!encoded) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64 secret");
  }

  const json = new TextDecoder().decode(
    Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0))
  );

  return JSON.parse(json);
}

function previewMessage(message: string) {
  const clean = message.replace(/\s+/g, " ").trim();

  if (clean.length <= 90) return clean;

  return `${clean.slice(0, 87)}...`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: responseHeaders }
    );
  }

    const expectedSecret = Deno.env.get("DEALRADAR_INTERNAL_SECRET");
  const receivedSecret = req.headers.get("x-dealradar-secret");

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: responseHeaders }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const payload = (await req.json()) as ChatMessagePayload;

    const messageId = payload.message_id || payload.record?.id;

    if (!messageId) {
      return Response.json(
        { error: "Missing message_id" },
        { status: 400, headers: responseHeaders }
      );
    }

    const { data: message, error: messageError } = await supabaseAdmin
      .from("conversation_messages")
      .select("id, conversation_id, sender_id, sender_name, message")
      .eq("id", messageId)
      .single();

    if (messageError || !message) {
      console.error("Message fetch error:", messageError);
      return Response.json(
        { error: "Message not found" },
        { status: 404, headers: responseHeaders }
      );
    }

    if (!message.sender_id) {
      return Response.json(
        { skipped: true, reason: "Missing sender_id" },
        { status: 200, headers: responseHeaders }
      );
    }

    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from("conversations")
      .select("id, requester_id, owner_id")
      .eq("id", message.conversation_id)
      .single();

    if (conversationError || !conversation) {
      console.error("Conversation fetch error:", conversationError);
      return Response.json(
        { error: "Conversation not found" },
        { status: 404, headers: responseHeaders }
      );
    }

    let recipientId: string | null = null;

    if (message.sender_id === conversation.requester_id) {
      recipientId = conversation.owner_id;
    } else if (message.sender_id === conversation.owner_id) {
      recipientId = conversation.requester_id;
    }

    if (!recipientId) {
      return Response.json(
        { skipped: true, reason: "Recipient not found" },
        { status: 200, headers: responseHeaders }
      );
    }

    if (recipientId === message.sender_id) {
      return Response.json(
        { skipped: true, reason: "Sender is recipient" },
        { status: 200, headers: responseHeaders }
      );
    }

    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from("push_tokens")
      .select("id, token")
      .eq("user_id", recipientId);

    if (tokensError) {
      console.error("Push tokens fetch error:", tokensError);
      throw new Error("Push tokens fetch failed");
    }

    if (!tokens || tokens.length === 0) {
      return Response.json(
        { skipped: true, reason: "No push tokens" },
        { status: 200, headers: responseHeaders }
      );
    }

    const serviceAccount = getFirebaseServiceAccount();
    const accessToken = await createFirebaseAccessToken(serviceAccount);

    const senderName = message.sender_name || "DealRadar";
    const body = previewMessage(message.message || "Hai ricevuto un nuovo messaggio");

        const results = [];

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

const getFcmErrorCode = (fcmData: FcmResponseBody) => {
  return (
    fcmData.error?.details?.find((detail) =>
      detail["@type"]?.includes("firebase.fcm")
    )?.errorCode ||
    fcmData.error?.status ||
    null
  );
};
const sanitizeUnknownFcmError = (
  errorCode: string | null,
  errorMessage: string | null
) => {
  const knownCodes = new Set([
    "UNREGISTERED",
    "INVALID_ARGUMENT",
    "SENDER_ID_MISMATCH",
    "QUOTA_EXCEEDED",
    "UNAVAILABLE",
    "INTERNAL",
  ]);

  if (!errorMessage || (errorCode && knownCodes.has(errorCode))) {
    return null;
  }

  return errorMessage.replace(/\s+/g, " ").trim().slice(0, 200) || null;
};

    const invalidTokenCodes = ["UNREGISTERED"];

    for (const item of tokens) {
      const fcmResponse = await fetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: item.token,
              notification: {
                title: `Nuovo messaggio da ${senderName}`,
                body,
              },
              data: {
                type: "chat_message",
                conversation_id: message.conversation_id,
                message_id: message.id,
                sender_id: message.sender_id,
              },
              android: {
                priority: "high",
                notification: {
                  channel_id: "chat_messages",
                  sound: "default",
                },
              },
            },
          }),
        }
      );

      const fcmData = (await fcmResponse.json()) as FcmResponseBody;
      const errorCode = getFcmErrorCode(fcmData);
      const rawErrorMessage = fcmData?.error?.message || null;
      const storedErrorMessage = sanitizeUnknownFcmError(
        errorCode,
        rawErrorMessage
      );

      const { error: logError } = await supabaseAdmin
        .from("push_notification_logs")
        .insert({
          message_id: message.id,
          conversation_id: message.conversation_id,
          recipient_id: recipientId,
          token_id: item.id,
          status: fcmResponse.ok ? "sent" : "failed",
          fcm_status: fcmResponse.status,
          error_code: errorCode,
          error_message: storedErrorMessage,
        });

      if (logError) {
        console.error("Push notification log insert failed:", logError);
      }

      if (!fcmResponse.ok) {
        console.error("FCM send failed", {
          status: fcmResponse.status,
          errorCode,
        });

        if (errorCode && invalidTokenCodes.includes(errorCode)) {
          const { error: deleteTokenError } = await supabaseAdmin
            .from("push_tokens")
            .delete()
            .eq("id", item.id);

          if (deleteTokenError) {
            console.error(
              "Invalid push token cleanup failed:",
              deleteTokenError
            );
          }
        }
      }

      results.push({
        token_id: item.id,
        ok: fcmResponse.ok,
        status: fcmResponse.status,
        error_code: errorCode,
      });
    }

    return Response.json(
      {
        success: true,
        message_id: message.id,
        conversation_id: message.conversation_id,
        recipient_id: recipientId,
        sent: results.filter((result) => result.ok).length,
        failed: results.filter((result) => !result.ok).length,
        results,
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error("notify-chat-message error:", error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: responseHeaders }
    );
  }
});