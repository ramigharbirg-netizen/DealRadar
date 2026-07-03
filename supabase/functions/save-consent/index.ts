// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const rawIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "0.0.0.0";

    const anonymizedIp = rawIp.includes(".")
      ? rawIp.split(".").slice(0, 3).join(".") + ".0"
      : rawIp.split(":").slice(0, 4).join(":") + "::";

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/privacy_consents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: body.user_id || null,
        session_id: body.session_id || null,
        ip_anonymized: anonymizedIp,
        user_agent: req.headers.get("user-agent") || null,
        consent_version: body.consent_version || "1.0",
        privacy_version: body.privacy_version || "1.0",
        terms_version: body.terms_version || "1.0",
        necessary: true,
        analytics: Boolean(body.consent?.analytics),
        marketing: Boolean(body.consent?.marketing),
        geolocation: Boolean(body.consent?.geolocation),
        preferences: body.consent || {},
        source: "edge_function",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Errore salvataggio consenso");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Errore sconosciuto",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});