import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

// Dual-safe import: try npm: first, fall back to esm.sh CDN if npm resolution fails.
let getRenderProgress: any;
try {
  const mod = await import("npm:@remotion/lambda-client@4.0.445");
  getRenderProgress = mod.getRenderProgress;
} catch (_e) {
  const mod = await import("https://esm.sh/@remotion/lambda-client@4.0.445");
  getRenderProgress = mod.getRenderProgress;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const lambdaFunctionName = Deno.env.get("REMOTION_LAMBDA_FUNCTION_NAME");
    const lambdaRegion = Deno.env.get("REMOTION_LAMBDA_REGION") || "us-east-1";
    const s3BucketEnv = Deno.env.get("REMOTION_S3_BUCKET");
    const lambdaConfigured = !!lambdaFunctionName;

    const results: any[] = [];

    console.log(`[check-render-status] Starting status check. Lambda configured: ${lambdaConfigured}`);

    // 1. Timeout stuck processing jobs
    const { data: stuckJobs } = await supabase
      .from("promo_render_queue")
      .select("*")
      .eq("status", "processing");

    console.log(`[check-render-status] Found ${stuckJobs?.length || 0} processing jobs`);

    for (const job of stuckJobs || []) {
      const startedAt = new Date(job.started_at).getTime();
      const elapsed = Date.now() - startedAt;

      // Handle jobs stuck without a render_id (dispatch failed silently)
      if (!job.render_id && elapsed > 2 * 60 * 1000) {
        console.warn(`[check-render-status] Job ${job.id} has no render_id after ${Math.round(elapsed / 1000)}s — dispatch likely failed`);
        if (job.retry_count < job.max_retries) {
          await supabase
            .from("promo_render_queue")
            .update({
              status: "queued",
              retry_count: job.retry_count + 1,
              error_message: `No render_id after ${Math.round(elapsed / 1000)}s — Lambda dispatch failed (retry ${job.retry_count + 1}/${job.max_retries})`,
              started_at: null,
              render_id: null,
              render_metadata: {},
            })
            .eq("id", job.id);
          results.push({ id: job.id, action: "retried_no_render_id", retry: job.retry_count + 1 });
        } else {
          await supabase
            .from("promo_render_queue")
            .update({
              status: "permanently_failed",
              error_message: `No render_id received. Lambda dispatch failed. Max retries (${job.max_retries}) exhausted.`,
            })
            .eq("id", job.id);
          await supabase
            .from("promo_projects")
            .update({ status: "failed" })
            .eq("id", job.project_id);
          results.push({ id: job.id, action: "permanently_failed_no_render_id" });
        }
        continue;
      }

      if (elapsed > TIMEOUT_MS) {
        if (job.retry_count < job.max_retries) {
          await supabase
            .from("promo_render_queue")
            .update({
              status: "queued",
              retry_count: job.retry_count + 1,
              error_message: `Timed out after ${Math.round(elapsed / 1000)}s (retry ${job.retry_count + 1}/${job.max_retries})`,
              started_at: null,
              render_id: null,
              render_metadata: {},
            })
            .eq("id", job.id);
          results.push({ id: job.id, action: "retried", retry: job.retry_count + 1 });
        } else {
          await supabase
            .from("promo_render_queue")
            .update({
              status: "permanently_failed",
              error_message: `Timed out after ${Math.round(elapsed / 1000)}s. Max retries (${job.max_retries}) exhausted.`,
            })
            .eq("id", job.id);

          await supabase
            .from("promo_projects")
            .update({ status: "failed" })
            .eq("id", job.project_id);

          results.push({ id: job.id, action: "permanently_failed" });
        }
        continue;
      }

      // If Lambda is configured and job has a render_id, check progress
      if (lambdaConfigured && job.render_id) {
        try {
          // Read bucketName from queue metadata first, fall back to env
          const bucketName = job.render_metadata?.bucketName || s3BucketEnv;

          console.log(`[check-render-status] Checking Lambda progress for render_id: ${job.render_id}, bucket: ${bucketName || "auto"}`);

          const progress = await getRenderProgress({
            renderId: job.render_id,
            functionName: lambdaFunctionName!,
            bucketName: bucketName || undefined,
            region: lambdaRegion as any,
          });

          console.log(`[check-render-status] Progress for ${job.render_id}: done=${progress.done}, progress=${progress.overallProgress}, fatal=${progress.fatalErrorEncountered || "none"}`);

          if (progress.done && progress.outputFile) {
            console.log(`[check-render-status] Render complete! Output: ${progress.outputFile}`);

            // Download from S3 and upload to Supabase storage
            const videoResponse = await fetch(progress.outputFile);
            const videoBlob = await videoResponse.blob();
            const storagePath = `renders/${job.project_id}/${job.id}.mp4`;

            console.log(`[check-render-status] Uploading to storage: ${storagePath} (${videoBlob.size} bytes)`);

            await supabase.storage
              .from("promo-videos")
              .upload(storagePath, videoBlob, {
                contentType: "video/mp4",
                upsert: true,
              });

            const { data: urlData } = supabase.storage
              .from("promo-videos")
              .getPublicUrl(storagePath);

            const publicUrl = urlData.publicUrl;

            console.log(`[check-render-status] Public URL: ${publicUrl}`);

            // Update queue and project
            await supabase
              .from("promo_render_queue")
              .update({
                status: "complete",
                completed_at: new Date().toISOString(),
                output_url: publicUrl,
              })
              .eq("id", job.id);

            await supabase
              .from("promo_projects")
              .update({
                status: "complete",
                output_url: publicUrl,
              })
              .eq("id", job.project_id);

            results.push({ id: job.id, action: "completed", output_url: publicUrl });
          } else if (progress.fatalErrorEncountered) {
            const errorMsg = progress.errors?.[0]?.message || "Unknown Lambda error";
            console.error(`[check-render-status] Fatal error for ${job.render_id}: ${errorMsg}`);

            if (job.retry_count < job.max_retries) {
              await supabase
                .from("promo_render_queue")
                .update({
                  status: "queued",
                  retry_count: job.retry_count + 1,
                  error_message: `Lambda error: ${errorMsg} (retry ${job.retry_count + 1}/${job.max_retries})`,
                  started_at: null,
                  render_id: null,
                  render_metadata: {},
                })
                .eq("id", job.id);
              results.push({ id: job.id, action: "retried_after_error" });
            } else {
              await supabase
                .from("promo_render_queue")
                .update({
                  status: "permanently_failed",
                  error_message: `Lambda error: ${errorMsg}. Max retries exhausted.`,
                })
                .eq("id", job.id);

              await supabase
                .from("promo_projects")
                .update({ status: "failed" })
                .eq("id", job.project_id);

              results.push({ id: job.id, action: "permanently_failed" });
            }
          } else {
            results.push({ id: job.id, action: "still_processing", progress: progress.overallProgress });
          }
        } catch (err: any) {
          console.error(`[check-render-status] Lambda check error for ${job.id}: ${err.message}`);
          results.push({ id: job.id, action: "lambda_check_error", error: err.message });
        }
      }
    }

    // 2. Retry eligible failed jobs
    const { data: failedJobs } = await supabase
      .from("promo_render_queue")
      .select("*")
      .eq("status", "failed");

    for (const job of failedJobs || []) {
      if (job.retry_count < job.max_retries) {
        await supabase
          .from("promo_render_queue")
          .update({
            status: "queued",
            retry_count: job.retry_count + 1,
            error_message: null,
            started_at: null,
            render_id: null,
            render_metadata: {},
          })
          .eq("id", job.id);
        results.push({ id: job.id, action: "retry_queued", retry: job.retry_count + 1 });
      }
    }

    console.log(`[check-render-status] Processed ${results.length} jobs`);

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error(`[check-render-status] Unhandled error: ${err.message}`);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
