// Generate Elite Layer — translates a hammer_state snapshot into elite athlete-facing
// directive copy. Called fire-and-forget by compute-hammer-state. Non-blocking.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type State = "prime" | "ready" | "caution" | "recover";

const COPY: Record<State, { elite_message: string; micro_directive: string; constraint_text: string }> = {
  prime: {
    elite_message: "You're in a rare window — press for high-skill dominance.",
    micro_directive: "Attack complexity. Don't waste reps.",
    constraint_text: "Avoid junk volume.",
  },
  ready: {
    elite_message: "System is stable. Stack quality reps.",
    micro_directive: "Build precision under mild fatigue.",
    constraint_text: "Do not spike intensity unnecessarily.",
  },
  caution: {
    elite_message: "Signal degradation detected.",
    micro_directive: "Shift to skill refinement.",
    constraint_text: "Avoid explosive output.",
  },
  recover: {
    elite_message: "System is in rebuild mode.",
    micro_directive: "Prioritize restoration inputs.",
    constraint_text: "No performance chasing.",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    let { snapshot_id, user_id, state, confidence } = body as {
      snapshot_id?: string; user_id?: string; state?: State; confidence?: number;
    };

    // Fallback: if only snapshot_id provided, fetch the rest
    if (snapshot_id && (!user_id || !state)) {
      const { data: snap } = await supabase
        .from("hammer_state_snapshots")
        .select("user_id, overall_state, confidence")
        .eq("id", snapshot_id).maybeSingle();
      if (snap) {
        user_id = snap.user_id;
        state = snap.overall_state as State;
        confidence = Number(snap.confidence);
      }
    }

    if (!snapshot_id || !user_id || !state || !COPY[state]) {
      return new Response(JSON.stringify({ error: "missing or invalid params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const copy = COPY[state];
    const conf = Math.round(Math.max(0, Math.min(1, confidence ?? 0)) * 100);

    const { error } = await supabase.from("hammer_state_explanations_v2").insert({
      user_id, snapshot_id, state,
      elite_message: copy.elite_message,
      micro_directive: copy.micro_directive,
      constraint_text: copy.constraint_text,
      confidence: conf,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-elite-layer]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
