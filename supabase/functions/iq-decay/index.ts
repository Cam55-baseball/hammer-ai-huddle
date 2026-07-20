// iq-decay — nightly job.
// 1) Rolls user attempts into per-concept mastery
//      concept_score = weighted avg of touched situations' mastery_score
// 2) Applies linear decay (5% / week since last_touched_at)
// 3) Upserts into iq_user_concept_mastery.
//
// Runs under service role via pg_cron http_post; no user JWT needed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const DECAY_PCT_PER_WEEK = 5;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: mappings, error: mErr } = await supabase
      .from("iq_situation_concepts")
      .select("situation_id, concept_id, weight");
    if (mErr) throw mErr;

    const byConcept = new Map<string, { situation_id: string; weight: number }[]>();
    (mappings ?? []).forEach((m) => {
      const arr = byConcept.get(m.concept_id) ?? [];
      arr.push({ situation_id: m.situation_id, weight: m.weight ?? 1 });
      byConcept.set(m.concept_id, arr);
    });

    const { data: progress, error: pErr } = await supabase
      .from("iq_user_progress")
      .select("user_id, situation_id, mastery_score, last_seen_at");
    if (pErr) throw pErr;

    // user_id -> situation_id -> { mastery, lastSeen }
    const perUser = new Map<string, Map<string, { s: number; last: string | null }>>();
    (progress ?? []).forEach((p) => {
      const u = perUser.get(p.user_id) ?? new Map();
      u.set(p.situation_id, { s: p.mastery_score ?? 0, last: p.last_seen_at });
      perUser.set(p.user_id, u);
    });

    const now = Date.now();
    const rows: {
      user_id: string; concept_id: string;
      mastery_score: number; last_touched_at: string | null;
      updated_at: string;
    }[] = [];
    for (const [user_id, sitMap] of perUser.entries()) {
      for (const [concept_id, mappings] of byConcept.entries()) {
        let num = 0; let den = 0; let lastMs = 0;
        for (const m of mappings) {
          const rec = sitMap.get(m.situation_id);
          if (!rec) continue;
          num += rec.s * m.weight; den += m.weight;
          if (rec.last) {
            const t = new Date(rec.last).getTime();
            if (Number.isFinite(t) && t > lastMs) lastMs = t;
          }
        }
        if (den === 0) continue;
        const raw = num / den;
        const weeks = lastMs ? Math.max(0, (now - lastMs) / WEEK_MS) : 0;
        const decayed = Math.max(0, raw - weeks * DECAY_PCT_PER_WEEK);
        rows.push({
          user_id, concept_id,
          mastery_score: Math.round(decayed * 100) / 100,
          last_touched_at: lastMs ? new Date(lastMs).toISOString() : null,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (rows.length > 0) {
      // Chunk to keep payloads modest.
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error: upErr } = await supabase
          .from("iq_user_concept_mastery")
          .upsert(rows.slice(i, i + CHUNK), { onConflict: "user_id,concept_id" });
        if (upErr) throw upErr;
      }
    }

    return new Response(JSON.stringify({ ok: true, rolled: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("iq-decay failed", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
