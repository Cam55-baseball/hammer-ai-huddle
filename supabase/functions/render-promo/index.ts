import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

// Dual-safe import: try npm: first, fall back to esm.sh CDN if npm resolution fails.
let renderMediaOnLambda: any;
let getCompositionsOnLambda: any;
try {
  const mod = await import("npm:@remotion/lambda-client@4.0.445");
  renderMediaOnLambda = mod.renderMediaOnLambda;
  getCompositionsOnLambda = mod.getCompositionsOnLambda;
} catch (_e) {
  const mod = await import("https://esm.sh/@remotion/lambda-client@4.0.445");
  renderMediaOnLambda = mod.renderMediaOnLambda;
  getCompositionsOnLambda = mod.getCompositionsOnLambda;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const FORMAT_CONFIGS: Record<string, { width: number; height: number }> = {
  tiktok: { width: 1080, height: 1920 },
  reels: { width: 1080, height: 1920 },
  shorts: { width: 1080, height: 1920 },
  youtube: { width: 1920, height: 1080 },
  hero: { width: 1920, height: 1080 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { queue_id } = await req.json();
    if (!queue_id) {
      return new Response(JSON.stringify({ error: "queue_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[render-promo] Processing queue_id: ${queue_id}`);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    // Load queue row
    const { data: queueRow, error: qErr } = await supabase
      .from("promo_render_queue")
      .select("*")
      .eq("id", queue_id)
      .single();

    if (qErr || !queueRow) {
      console.error(`[render-promo] Queue job not found: ${queue_id}`);
      return new Response(JSON.stringify({ error: "Queue job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (queueRow.status !== "queued") {
      console.log(`[render-promo] Job status is '${queueRow.status}', skipping`);
      return new Response(JSON.stringify({ error: `Job status is '${queueRow.status}', expected 'queued'` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load project
    const { data: project, error: pErr } = await supabase
      .from("promo_projects")
      .select("*")
      .eq("id", queueRow.project_id)
      .single();

    if (pErr || !project) {
      await failJob(supabase, queue_id, queueRow.project_id, "Project not found");
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sequence = project.scene_sequence || [];

    if (!Array.isArray(sequence) || sequence.length === 0) {
      await failJob(supabase, queue_id, project.id, "Scene sequence is empty");
      return new Response(JSON.stringify({ error: "Scene sequence is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load all scenes referenced
    const sceneIds = sequence.map((s: any) => s.scene_id).filter(Boolean);
    const { data: scenes } = await supabase.from("promo_scenes").select("*").in("id", sceneIds);

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
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build payload
    const format = project.format || queueRow.format || "tiktok";
    const formatConfig = FORMAT_CONFIGS[format] || FORMAT_CONFIGS.tiktok;
    const payload = {
      title: project.title,
      format,
      width: formatConfig.width,
      height: formatConfig.height,
      sceneSequence: assembledSequence,
    };

    // --- Validate required secrets ---
    const awsAccessKey = Deno.env.get("AWS_ACCESS_KEY_ID");
    const awsSecretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
    const awsSessionToken = Deno.env.get("AWS_SESSION_TOKEN");
    const lambdaFunctionName = Deno.env.get("REMOTION_LAMBDA_FUNCTION_NAME");
    const lambdaRegion = Deno.env.get("REMOTION_LAMBDA_REGION") || "us-east-1";
    const s3Bucket = Deno.env.get("REMOTION_S3_BUCKET");
    const remotionSiteUrl = Deno.env.get("REMOTION_SITE_URL");

    const missingSecrets: string[] = [];
    if (!awsAccessKey) missingSecrets.push("AWS_ACCESS_KEY_ID");
    if (!awsSecretKey) missingSecrets.push("AWS_SECRET_ACCESS_KEY");
    if (!lambdaFunctionName) missingSecrets.push("REMOTION_LAMBDA_FUNCTION_NAME");
    if (!remotionSiteUrl) missingSecrets.push("REMOTION_SITE_URL");

    if (missingSecrets.length > 0) {
      const msg = `Missing required secrets: ${missingSecrets.join(", ")}`;
      console.error(`[render-promo] ${msg}`);
      await failJob(supabase, queue_id, project.id, msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(
      `[render-promo] Lambda configured. Dispatching render via @remotion/lambda@4.0.445 for queue_id: ${queue_id}`,
    );
    console.log(`[render-promo] function=${lambdaFunctionName}, region=${lambdaRegion}, serveUrl=${remotionSiteUrl}`);

    // --- Discover available compositions ---
    let compositionId = "MainVideo";
    let compositionIds: string[] = [];
    try {
      console.log(`[render-promo] Discovering compositions from serveUrl...`);
      const compositions = await getCompositionsOnLambda({
        region: lambdaRegion as any,
        functionName: lambdaFunctionName!,
        serveUrl: remotionSiteUrl!,
        inputProps: { sceneSequence: assembledSequence },
      });
      compositionIds = compositions.map((c: any) => c.id);
      console.log(`[render-promo] Available compositions: ${JSON.stringify(compositionIds)}`);

      if (compositions.length === 0) {
        await failJob(supabase, queue_id, project.id, "No compositions found in Remotion bundle");
        return new Response(JSON.stringify({ error: "No compositions found in Remotion bundle" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      compositionId = compositionIds[0];
      console.log(`[render-promo] Using composition: '${compositionId}'`);
    } catch (discoverErr: any) {
      console.warn(
        `[render-promo] Composition discovery failed, falling back to 'main': ${discoverErr?.message || discoverErr}`,
      );
      compositionId = "MainVideo";
    }

    // Mark as processing
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
        render_metadata: { ...payload, lambda_region: lambdaRegion, compositionId, compositionIds },
      })
      .eq("id", project.id);

    try {
      const { renderId, bucketName } = await renderMediaOnLambda({
        region: lambdaRegion as any,
        functionName: lambdaFunctionName!,
        serveUrl: remotionSiteUrl!,
        composition: MyComp,
        codec: "h264",
        inputProps: { sceneSequence: assembledSequence },
        imageFormat: "jpeg",
        maxRetries: 1,
        privacy: "public",
        outName: `promo-${queue_id}.mp4`,
        ...(s3Bucket ? { forceBucketName: s3Bucket } : {}),
      });

      console.log(`[render-promo] Got renderId: ${renderId}, bucketName: ${bucketName}`);

      // Persist render_id and bucket immediately
      const { error: updateErr } = await supabase
        .from("promo_render_queue")
        .update({
          render_id: renderId,
          render_metadata: { bucketName },
        })
        .eq("id", queue_id);

      if (updateErr) {
        console.error(`[render-promo] Failed to persist render_id: ${updateErr.message}`);
        // Don't fail the job — the render is running on Lambda. Log and continue.
      }

      return new Response(
        JSON.stringify({ success: true, mode: "lambda", renderId, bucketName, compositionId, compositionIds, payload }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (lambdaErr: any) {
      const errorDetail = lambdaErr?.message || String(lambdaErr);
      console.error(`[render-promo] renderMediaOnLambda failed: ${errorDetail}`);
      console.error(`[render-promo] Full error:`, JSON.stringify(lambdaErr, Object.getOwnPropertyNames(lambdaErr)));
      await failJob(supabase, queue_id, project.id, `Lambda invocation failed: ${errorDetail}`);
      return new Response(JSON.stringify({ error: `Lambda error: ${errorDetail}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err: any) {
    console.error(`[render-promo] Unhandled error: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// --- Helpers ---

async function failJob(supabase: any, queueId: string, projectId: string, errorMessage: string) {
  console.error(`[render-promo] Failing job ${queueId}: ${errorMessage}`);
  await supabase.from("promo_render_queue").update({ status: "failed", error_message: errorMessage }).eq("id", queueId);

  await supabase.from("promo_projects").update({ status: "failed" }).eq("id", projectId);
}
