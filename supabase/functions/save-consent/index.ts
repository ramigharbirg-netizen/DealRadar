import { createClient } from "npm:@supabase/supabase-js@2";

const CURRENT_CONSENT_VERSION = "1.0";
const CURRENT_PRIVACY_VERSION = "1.0";
const CURRENT_TERMS_VERSION = "1.0";

const ALLOWED_ORIGINS = new Set([
  "https://dealradarapp.it",
  "https://www.dealradarapp.it",
  "http://localhost",
  "https://localhost",
  "http://localhost:3000",
  "https://localhost:3000",
  "http://127.0.0.1:3000",
  "capacitor://localhost",
]);

const MAX_BODY_BYTES = 8192;
const MAX_SESSION_ID_LENGTH = 128;
const MAX_USER_AGENT_LENGTH = 256;

type ConsentPayload = {
  session_id?: unknown;
  consent?: {
    analytics?: unknown;
    marketing?: unknown;
    geolocation?: unknown;
  };
  consent_version?: unknown;
  privacy_version?: unknown;
  terms_version?: unknown;
};

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function jsonResponse(req: Request, body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

function normalizeSessionId(value: unknown) {
  if (typeof value !== "string") return null;
  const sessionId = value.trim();

  if (
    sessionId.length < 8 ||
    sessionId.length > MAX_SESSION_ID_LENGTH ||
    !/^[A-Za-z0-9._:-]+$/.test(sessionId)
  ) {
    return null;
  }

  return sessionId;
}

function anonymizeIp(rawIp: string | null) {
  if (!rawIp) return null;
  const value = rawIp.trim();

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    const parts = value.split(".").map(Number);
    if (parts.some((part) => part < 0 || part > 255)) return null;
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }

  if (value.includes(":")) {
    const groups = value.split(":").filter(Boolean).slice(0, 4);
    return groups.length > 0 ? `${groups.join(":")}::` : null;
  }

  return null;
}

async function resolveAuthenticatedUserId(
  req: Request,
  supabaseUrl: string,
  supabaseAnonKey: string,
) {
  const authorization = req.headers.get("authorization");
  if (!authorization) return null;

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) throw new Error("INVALID_AUTHORIZATION");

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(match[1]);

  if (error || !user) throw new Error("INVALID_JWT");
  return user.id;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse(req, { success: false, error: "Origin not allowed" }, 403);
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { success: false, error: "Method not allowed" }, 405);
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse(req, { success: false, error: "Payload too large" }, 413);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
      console.error("save-consent missing Supabase environment variables");
      return jsonResponse(req, { success: false, error: "Service unavailable" }, 503);
    }

    let payload: ConsentPayload;
    try {
      payload = (await req.json()) as ConsentPayload;
    } catch {
      return jsonResponse(req, { success: false, error: "Invalid JSON body" }, 400);
    }

    const sessionId = normalizeSessionId(payload.session_id);
    if (!sessionId) {
      return jsonResponse(req, { success: false, error: "Invalid session_id" }, 400);
    }

    if (
      payload.consent_version !== CURRENT_CONSENT_VERSION ||
      payload.privacy_version !== CURRENT_PRIVACY_VERSION ||
      payload.terms_version !== CURRENT_TERMS_VERSION
    ) {
      return jsonResponse(req, { success: false, error: "Unsupported consent version" }, 400);
    }

    let userId: string | null = null;
    try {
      userId = await resolveAuthenticatedUserId(req, supabaseUrl, supabaseAnonKey);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "INVALID_JWT" || error.message === "INVALID_AUTHORIZATION")
      ) {
        return jsonResponse(req, { success: false, error: "Invalid authentication" }, 401);
      }
      throw error;
    }

    const analytics = payload.consent?.analytics === true;
    const marketing = payload.consent?.marketing === true;
    const geolocation = payload.consent?.geolocation === true;

    const preferences = {
      necessary: true,
      analytics,
      marketing,
      geolocation,
    };

    const rawIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      null;

    const ipAnonymized = anonymizeIp(rawIp);
    const userAgent =
      req.headers.get("user-agent")?.slice(0, MAX_USER_AGENT_LENGTH) || null;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabaseAdmin.rpc("record_privacy_consent", {
      p_user_id: userId,
      p_session_id: sessionId,
      p_ip_anonymized: ipAnonymized,
      p_user_agent: userAgent,
      p_consent_version: CURRENT_CONSENT_VERSION,
      p_privacy_version: CURRENT_PRIVACY_VERSION,
      p_terms_version: CURRENT_TERMS_VERSION,
      p_analytics: analytics,
      p_marketing: marketing,
      p_geolocation: geolocation,
      p_preferences: preferences,
    });

    if (error) {
      if (error.message?.includes("Consent rate limit exceeded")) {
        return jsonResponse(req, { success: false, error: "Too many consent updates" }, 429);
      }

      console.error("save-consent record_privacy_consent error:", error);
      return jsonResponse(req, { success: false, error: "Unable to save consent" }, 500);
    }

    return jsonResponse(req, {
      success: true,
      inserted: Boolean(data?.inserted),
    });
  } catch (error) {
    console.error("save-consent unexpected error:", error);
    return jsonResponse(req, { success: false, error: "Unexpected server error" }, 500);
  }
});
