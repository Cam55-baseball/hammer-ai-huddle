import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
      return new Response(
        JSON.stringify({ error: "queue_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[render-promo] Processing queue_id: ${queue_id}`);

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
      console.error(`[render-promo] Queue job not found: ${queue_id}`);
      return new Response(
        JSON.stringify({ error: "Queue job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (queueRow.status !== "queued") {
      console.log(`[render-promo] Job status is '${queueRow.status}', skipping`);
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
    const format = project.format || queueRow.format || "tiktok";
    const formatConfig = FORMAT_CONFIGS[format] || FORMAT_CONFIGS.tiktok;
    const payload = {
      title: project.title,
      format,
      width: formatConfig.width,
      height: formatConfig.height,
      sceneSequence: assembledSequence,
    };

    // --- Attempt Remotion Lambda dispatch ---
    const awsAccessKey = Deno.env.get("AWS_ACCESS_KEY_ID");
    const awsSecretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
    const lambdaFunctionName = Deno.env.get("REMOTION_LAMBDA_FUNCTION_NAME");
    const lambdaRegion = Deno.env.get("REMOTION_LAMBDA_REGION") || "us-east-1";
    const s3Bucket = Deno.env.get("REMOTION_S3_BUCKET");
    const remotionSiteUrl = Deno.env.get("REMOTION_SITE_URL");

    const lambdaConfigured = awsAccessKey && awsSecretKey && lambdaFunctionName;

    if (lambdaConfigured) {
      console.log(`[render-promo] Lambda configured. Dispatching render for queue_id: ${queue_id}`);

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
          render_metadata: { ...payload, lambda_region: lambdaRegion },
        })
        .eq("id", project.id);

      // Invoke Lambda — type: "start" returns immediately with renderId
      try {
        const lambdaPayload = {
          type: "start",
          serveUrl: remotionSiteUrl,
          composition: "main",
          codec: "h264",
          inputProps: { sceneSequence: assembledSequence },
          imageFormat: "jpeg",
          maxRetries: 1,
          privacy: "public",
          outName: `promo-${queue_id}.mp4`,
          ...(s3Bucket ? { forceBucketName: s3Bucket } : {}),
        };

        const lambdaUrl = `https://lambda.${lambdaRegion}.amazonaws.com/2015-03-31/functions/${lambdaFunctionName}/invocations`;
        const bodyStr = JSON.stringify(lambdaPayload);
        const now = new Date();
        const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        const shortDate = dateStamp.substring(0, 8);

        // AWS Signature V4 signing
        const algorithm = "AWS4-HMAC-SHA256";
        const credentialScope = `${shortDate}/${lambdaRegion}/lambda/aws4_request`;
        const canonicalUri = `/2015-03-31/functions/${lambdaFunctionName}/invocations`;

        const bodyHash = await sha256Hex(bodyStr);
        const canonicalHeaders = `content-type:application/json\nhost:lambda.${lambdaRegion}.amazonaws.com\nx-amz-date:${dateStamp}\n`;
        const signedHeaders = "content-type;host;x-amz-date";
        const canonicalRequest = `POST\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${bodyHash}`;

        const stringToSign = `${algorithm}\n${dateStamp}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;

        const signingKey = await getSignatureKey(awsSecretKey!, shortDate, lambdaRegion, "lambda");
        const signature = await hmacHex(signingKey, stringToSign);

        const authHeader = `${algorithm} Credential=${awsAccessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        console.log(`[render-promo] Invoking Lambda: ${lambdaFunctionName}`);

        // Retry logic with exponential backoff for Lambda cold starts
        const MAX_ATTEMPTS = 3;
        const TIMEOUT_MS = 120000; // 120s per attempt
        const BACKOFF_MS = [5000, 10000]; // wait 5s after 1st timeout, 10s after 2nd

        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

        let lambdaResponse: Response | undefined;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

          try {
            console.log(`[render-promo] Lambda attempt ${attempt}/${MAX_ATTEMPTS}`);
            lambdaResponse = await fetch(lambdaUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Amz-Date": dateStamp,
                "Authorization": authHeader,
                "X-Amz-Invocation-Type": "RequestResponse",
              },
              body: bodyStr,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            break; // success — exit retry loop
          } catch (fetchErr: any) {
            clearTimeout(timeoutId);
            if (fetchErr.name === "AbortError") {
              if (attempt < MAX_ATTEMPTS) {
                const waitMs = BACKOFF_MS[attempt - 1];
                console.warn(`[render-promo] Attempt ${attempt} timed out after ${TIMEOUT_MS / 1000}s. Retrying in ${waitMs / 1000}s...`);
                await sleep(waitMs);
                continue;
              }
              // All attempts exhausted — mark job failed
              const timeoutMsg = `Lambda invocation timed out after ${MAX_ATTEMPTS} attempts (${TIMEOUT_MS / 1000}s each). Lambda may need a larger timeout or warmer configuration.`;
              console.error(`[render-promo] ${timeoutMsg}`);
              await supabase
                .from("promo_render_queue")
                .update({ status: "failed", error_message: timeoutMsg })
                .eq("id", queue_id);
              await supabase
                .from("promo_projects")
                .update({ status: "failed" })
                .eq("id", project.id);
              return new Response(
                JSON.stringify({ error: timeoutMsg }),
                { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            throw fetchErr;
          }
        }

        const lambdaResultText = await lambdaResponse.text();
        console.log(`[render-promo] Lambda response status: ${lambdaResponse.status}`);
        console.log(`[render-promo] Lambda response body: ${lambdaResultText.substring(0, 1000)}`);

        if (!lambdaResponse.ok) {
          const errMsg = `Lambda returned HTTP ${lambdaResponse.status}: ${lambdaResultText.substring(0, 200)}`;
          console.error(`[render-promo] ${errMsg}`);
          await failJob(supabase, queue_id, project.id, errMsg);
          return new Response(
            JSON.stringify({ error: errMsg }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let lambdaResult: any;
        try {
          lambdaResult = JSON.parse(lambdaResultText);
        } catch {
          lambdaResult = {};
        }

        const renderId = lambdaResult?.renderId || lambdaResult?.id || null;
        console.log(`[render-promo] Got renderId: ${renderId}`);

        if (!renderId) {
          const errMsg = `Lambda responded but no renderId found. Body: ${lambdaResultText.substring(0, 300)}`;
          console.error(`[render-promo] ${errMsg}`);
          await failJob(supabase, queue_id, project.id, errMsg);
          return new Response(
            JSON.stringify({ error: errMsg }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Store render_id for status polling
        await supabase
          .from("promo_render_queue")
          .update({ render_id: renderId })
          .eq("id", queue_id);

        return new Response(
          JSON.stringify({ success: true, mode: "lambda", renderId, payload }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (lambdaErr: any) {
        console.error(`[render-promo] Lambda invocation failed: ${lambdaErr.message}`);
        await failJob(supabase, queue_id, project.id, `Lambda invocation failed: ${lambdaErr.message}`);
        return new Response(
          JSON.stringify({ error: `Lambda error: ${lambdaErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.log(`[render-promo] Lambda NOT configured. Missing credentials.`);
      await supabase
        .from("promo_render_queue")
        .update({
          status: "failed",
          error_message: "Render service not configured. Add AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and REMOTION_LAMBDA_FUNCTION_NAME secrets to enable automated rendering.",
        })
        .eq("id", queue_id);

      await supabase
        .from("promo_projects")
        .update({
          status: "draft",
          render_metadata: payload,
        })
        .eq("id", project.id);

      return new Response(
        JSON.stringify({
          success: false,
          mode: "unconfigured",
          message: "Render service not configured.",
          payload,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    console.error(`[render-promo] Unhandled error: ${err.message}`);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// --- Helpers ---

async function failJob(supabase: any, queueId: string, projectId: string, errorMessage: string) {
  console.error(`[render-promo] Failing job ${queueId}: ${errorMessage}`);
  await supabase
    .from("promo_render_queue")
    .update({ status: "failed", error_message: errorMessage })
    .eq("id", queueId);

  await supabase
    .from("promo_projects")
    .update({ status: "failed" })
    .eq("id", projectId);
}

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

async function hmacHex(key: ArrayBuffer, message: string): Promise<string> {
  const sig = await hmacSha256(key, message);
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode("AWS4" + secretKey).buffer, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return await hmacSha256(kService, "aws4_request");
}
