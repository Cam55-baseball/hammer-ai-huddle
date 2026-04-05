import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const VALID_SCENE_KEYS = [
  "hook-problem",
  "dashboard-hero",
  "mpi-engine",
  "tex-vision-drill",
  "vault-progress",
  "cta-closer",
];

const DURATION_MAP: Record<string, number> = {
  "3s": 90,
  "7s": 210,
  "15s": 450,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { queue_id } = await req.json();
    if (!queue_id) {
      return new Response(
        JSON.stringify({ error: "queue_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Load queue row
    const { data: queueRow, error: qErr } = await supabase
      .from("promo_render_queue")
      .select("*")
      .eq("id", queue_id)
      .single();

    if (qErr || !queueRow) {
      return new Response(
        JSON.stringify({ error: "Queue job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (queueRow.status !== "queued") {
      return new Response(
        JSON.stringify({ error: `Job status is '${queueRow.status}', expected 'queued'` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load project
    const { data: project, error: pErr } = await supabase
      .from("promo_projects")
      .select("*")
      .eq("id", queueRow.project_id)
      .single();

    if (pErr || !project) {
      await failJob(supabase, queue_id, queueRow.project_id, "Project not found");
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sequence = project.scene_sequence || [];

    // Validate non-empty
    if (!Array.isArray(sequence) || sequence.length === 0) {
      await failJob(supabase, queue_id, project.id, "Scene sequence is empty");
      return new Response(
        JSON.stringify({ error: "Scene sequence is empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load all scenes referenced
    const sceneIds = sequence.map((s: any) => s.scene_id).filter(Boolean);
    const { data: scenes } = await supabase
      .from("promo_scenes")
      .select("*")
      .in("id", sceneIds);

    const sceneMap = new Map((scenes || []).map((s: any) => [s.id, s]));

    // Validate each entry
    const errors: string[] = [];
    const assembledSequence: any[] = [];

    for (const entry of sequence) {
      const sceneKey = entry.scene_key;

      if (!VALID_SCENE_KEYS.includes(sceneKey)) {
        errors.push(`Unknown scene_key: '${sceneKey}'`);
        continue;
      }

      const scene = sceneMap.get(entry.scene_id);
      const simData = scene?.sim_data || entry.overrides || {};

      if (!simData || Object.keys(simData).length === 0) {
        errors.push(`Missing sim_data for scene '${sceneKey}' (${entry.scene_id})`);
        continue;
      }

      const durationInFrames = DURATION_MAP[entry.duration_variant] || 210;

      assembledSequence.push({
        sceneKey,
        simData,
        durationInFrames,
      });
    }

    if (errors.length > 0) {
      const errorMsg = errors.join("; ");
      await failJob(supabase, queue_id, project.id, errorMsg);
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build payload
    const payload = {
      title: project.title,
      format: project.format || queueRow.format,
      sceneSequence: assembledSequence,
    };

    // Mark as processing and store payload
    await supabase
      .from("promo_render_queue")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", queue_id);

    await supabase
      .from("promo_projects")
      .update({
        status: "rendering",
        render_metadata: payload,
      })
      .eq("id", project.id);

    return new Response(
      JSON.stringify({ success: true, payload }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function failJob(supabase: any, queueId: string, projectId: string, errorMessage: string) {
  await supabase
    .from("promo_render_queue")
    .update({ status: "failed", error_message: errorMessage })
    .eq("id", queueId);

  await supabase
    .from("promo_projects")
    .update({ status: "failed" })
    .eq("id", projectId);
}
