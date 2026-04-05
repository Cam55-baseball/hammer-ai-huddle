import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

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

    const awsAccessKey = Deno.env.get("AWS_ACCESS_KEY_ID");
    const awsSecretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
    const lambdaFunctionName = Deno.env.get("REMOTION_LAMBDA_FUNCTION_NAME");
    const lambdaRegion = Deno.env.get("REMOTION_LAMBDA_REGION") || "us-east-1";
    const lambdaConfigured = awsAccessKey && awsSecretKey && lambdaFunctionName;

    const results: any[] = [];

    // 1. Timeout stuck processing jobs
    const { data: stuckJobs } = await supabase
      .from("promo_render_queue")
      .select("*")
      .eq("status", "processing");

    for (const job of stuckJobs || []) {
      const startedAt = new Date(job.started_at).getTime();
      const elapsed = Date.now() - startedAt;

      if (elapsed > TIMEOUT_MS) {
        // Check if retryable
        if (job.retry_count < job.max_retries) {
          await supabase
            .from("promo_render_queue")
            .update({
              status: "queued",
              retry_count: job.retry_count + 1,
              error_message: `Timed out after ${Math.round(elapsed / 1000)}s (retry ${job.retry_count + 1}/${job.max_retries})`,
              started_at: null,
              render_id: null,
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

      // If Lambda is configured and job has a render_id, check Lambda status
      if (lambdaConfigured && job.render_id) {
        try {
          const progress = await checkLambdaProgress(
            awsAccessKey!,
            awsSecretKey!,
            lambdaFunctionName!,
            lambdaRegion,
            job.render_id
          );

          if (progress.done && progress.outputUrl) {
            // Download from S3 and upload to Supabase storage
            const videoResponse = await fetch(progress.outputUrl);
            const videoBlob = await videoResponse.blob();
            const storagePath = `renders/${job.project_id}/${job.id}.mp4`;

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
          } else if (progress.fatalError) {
            if (job.retry_count < job.max_retries) {
              await supabase
                .from("promo_render_queue")
                .update({
                  status: "queued",
                  retry_count: job.retry_count + 1,
                  error_message: `Lambda error: ${progress.fatalError} (retry ${job.retry_count + 1}/${job.max_retries})`,
                  started_at: null,
                  render_id: null,
                })
                .eq("id", job.id);
              results.push({ id: job.id, action: "retried_after_error" });
            } else {
              await supabase
                .from("promo_render_queue")
                .update({
                  status: "permanently_failed",
                  error_message: `Lambda error: ${progress.fatalError}. Max retries exhausted.`,
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
          })
          .eq("id", job.id);
        results.push({ id: job.id, action: "retry_queued", retry: job.retry_count + 1 });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Check Remotion Lambda render progress
async function checkLambdaProgress(
  accessKey: string,
  secretKey: string,
  functionName: string,
  region: string,
  renderId: string
): Promise<{ done: boolean; outputUrl?: string; fatalError?: string; overallProgress?: number }> {
  const payload = JSON.stringify({
    type: "status",
    renderId,
  });

  const lambdaUrl = `https://lambda.${region}.amazonaws.com/2015-03-31/functions/${functionName}/invocations`;
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const shortDate = dateStamp.substring(0, 8);

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${shortDate}/${region}/lambda/aws4_request`;
  const canonicalUri = `/2015-03-31/functions/${functionName}/invocations`;

  const bodyHash = await sha256Hex(payload);
  const canonicalHeaders = `content-type:application/json\nhost:lambda.${region}.amazonaws.com\nx-amz-date:${dateStamp}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const canonicalRequest = `POST\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${bodyHash}`;

  const stringToSign = `${algorithm}\n${dateStamp}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;
  const signingKey = await getSignatureKey(secretKey, shortDate, region, "lambda");
  const signature = await hmacHex(signingKey, stringToSign);
  const authHeader = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(lambdaUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Amz-Date": dateStamp,
      "Authorization": authHeader,
      "X-Amz-Invocation-Type": "RequestResponse",
    },
    body: payload,
  });

  const result = await response.json();

  if (result.done) {
    return { done: true, outputUrl: result.outputFile || result.outputUrl };
  }
  if (result.fatalErrorEncountered) {
    return { done: false, fatalError: result.errors?.[0]?.message || "Unknown Lambda error" };
  }
  return { done: false, overallProgress: result.overallProgress || 0 };
}

// --- Crypto helpers ---
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
