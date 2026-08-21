import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!token || token.length < 16 || token.length > 128 || !/^[a-f0-9]+$/i.test(token)) {
      return json({ error: "Invalid token" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("gp_reports")
      .select("snapshot, share_expires_at, share_revoked")
      .eq("share_token", token)
      .maybeSingle();

    if (error) {
      console.error("gp-shared-report lookup failed", error.message);
      return json({ error: "Lookup failed" }, 500);
    }
    if (!data || data.share_revoked) return json({ error: "Not found" }, 404);
    if (data.share_expires_at && new Date(data.share_expires_at) < new Date()) {
      return json({ error: "Expired" }, 410);
    }

    return json({ snapshot: data.snapshot });
  } catch (e) {
    console.error("gp-shared-report error", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
