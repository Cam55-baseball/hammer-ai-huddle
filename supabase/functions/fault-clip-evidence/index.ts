/**
 * fault-clip-evidence — Stage 2 (clean-clip fade), owner-authorised 2026-10-05.
 *
 * Returns, for the SIGNED-IN athlete only, each of their own completed
 * hitting / throwing / pitching clips with the stored yes/no fault answers
 * (`ai_analysis.violations_detected`) and nothing else. No scores, no other
 * user, no write. The app uses it to ease drills for a fault a newer clip
 * genuinely checked and did not see.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Not signed in" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: authError } = await userClient.auth.getClaims(auth.slice(7));
    const userId = claims?.claims?.sub;
    if (authError || !userId) return json({ error: "Not signed in" }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const since = new Date(Date.now() - 120 * 86_400_000).toISOString();
    const { data, error } = await admin
      .from("videos")
      .select("id,module,created_at,violations:ai_analysis->violations_detected")
      .eq("user_id", userId)
      .eq("status", "completed")
      .in("module", ["hitting", "throwing", "pitching"])
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) return json({ error: "Could not read your clips" }, 500);

    const clips = (data ?? []).map((r: any) => ({
      video_id: r.id,
      module: r.module,
      created_at: r.created_at,
      violations: r.violations && typeof r.violations === "object" ? r.violations : null,
    }));
    return json({ clips });
  } catch (_e) {
    return json({ error: "Could not read your clips" }, 500);
  }
});
