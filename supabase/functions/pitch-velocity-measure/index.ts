import { assertPitchVelocityAccess } from "../_shared/pitchVelocityAccess.ts";
/**
 * pitch-velocity-measure
 *
 * Runs real ball detection over a calibration session's stored frames via the
 * Roboflow hosted inference API, then computes single-camera pitch velocity
 * from the apparent ball diameter (see _shared/pitchMath.ts).
 *
 * Honesty doctrine: if the ball is not detected reliably the function stores
 * and returns status 'low_confidence' / 'unavailable' with velocity_mph null.
 * It never fabricates a number.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  computeVelocity,
  type BallDetection,
  type FrameObservation,
} from "../_shared/pitchMath.ts";

const BodySchema = z.object({
  calibration_session_id: z.string().uuid(),
});

// BaseballCV ball_tracking_v4 (YOLOv11) weights imported into our Roboflow workspace
// as an external-upload checkpoint. Classes: glove, homeplate, baseball, rubber.
const DEFAULT_MODEL_ID = "baseball-pitch-velocity/1";
const ROBOFLOW_CONFIDENCE = 15; // detector threshold (percent) — BaseballCV runs lower-confidence on phone footage

const ROBOFLOW_OVERLAP = 30;
const CONCURRENCY = 3;

/**
 * HARD SAFETY CAP — absolute maximum billable Roboflow inference calls for a
 * single analysis. Enforced in three independent places below:
 *   1. the frames query is `.limit(MAX_INFERENCE_CALLS_PER_ANALYSIS)`
 *   2. the frame list is truncated after the query
 *   3. an atomic pre-flight counter refuses to issue a call once the budget
 *      is spent, even if 1 and 2 were somehow bypassed
 * No code path may exceed this, regardless of how many frame rows exist.
 */
const MAX_INFERENCE_CALLS_PER_ANALYSIS = 60;


function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

interface RoboflowResponse {
  predictions?: RoboflowPrediction[];
  error?: { message?: string };
}

function pickBallPrediction(predictions: RoboflowPrediction[]): BallDetection | null {
  if (predictions.length === 0) return null;
  // BaseballCV emits glove / homeplate / baseball / rubber — only the ball is a flight signal.
  const ballLike = predictions.filter((p) => /^(base|soft)?ball$/i.test((p.class ?? "").trim()));
  const looseBall = ballLike.length > 0 ? ballLike : predictions.filter((p) => /ball/i.test(p.class ?? ""));
  const pool = looseBall.length > 0 ? looseBall : [];
  if (pool.length === 0) return null;
  const best = pool.reduce((a, b) => (b.confidence > a.confidence ? b : a));

  return {
    x: best.x,
    y: best.y,
    width: best.width,
    height: best.height,
    confidence: best.confidence,
    class: best.class,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const roboflowKey = Deno.env.get("ROBOFLOW_API_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Server is not configured" }, 500);
  }
  if (!roboflowKey) {
    return json({ error: "Ball detection is not configured yet" }, 503);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Authentication required" }, 401);

  const authClient = createClient(supabaseUrl, anonKey);
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Authentication required" }, 401);
  const user = authData.user;

  let body: z.infer<typeof BodySchema>;
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "Invalid measurement request", details: parsed.error.flatten().fieldErrors }, 400);
    }
    body = parsed.data;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const accessError = await assertPitchVelocityAccess(supabase, user.id);
  if (accessError) return json({ error: accessError }, 403);


  const { data: session, error: sessionError } = await supabase
    .from("cv_calibration_sessions")
    .select("id, user_id, video_id, reference_distance_ft, calibration_status")
    .eq("id", body.calibration_session_id)
    .maybeSingle();

  if (sessionError) {
    console.error("[pitch-velocity-measure] session lookup failed", sessionError);
    return json({ error: "Could not load calibration session" }, 500);
  }
  if (!session) return json({ error: "Calibration session not found" }, 404);
  if (session.user_id !== user.id) return json({ error: "You do not own this calibration session" }, 403);

  const measurable = ["frames_ready", "measured", "low_confidence", "unavailable"];
  if (!measurable.includes(session.calibration_status)) {
    return json({ error: `Session is not ready to measure (status: ${session.calibration_status})` }, 409);
  }

  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, sport")
    .eq("id", session.video_id)
    .single();
  if (videoError || !video) return json({ error: "Source video not found" }, 404);
  const sport = video.sport === "softball" ? "softball" : "baseball";

  const { data: frameRows, error: framesError } = await supabase
    .from("cv_calibration_frames")
    .select("frame_index, timestamp_seconds, storage_path, width, height")
    .eq("calibration_session_id", session.id)
    .order("frame_index", { ascending: true })
    .limit(MAX_INFERENCE_CALLS_PER_ANALYSIS);

  if (framesError) {
    console.error("[pitch-velocity-measure] frames lookup failed", framesError);
    return json({ error: "Could not load calibration frames" }, 500);
  }
  if (!frameRows || frameRows.length < 3) {
    return json({ error: "Not enough stored frames to measure" }, 409);
  }
  // Second, belt-and-braces truncation in case the query limit ever changes.
  const frames = frameRows.slice(0, MAX_INFERENCE_CALLS_PER_ANALYSIS);
  if (frameRows.length > MAX_INFERENCE_CALLS_PER_ANALYSIS) {
    console.warn(
      "[pitch-velocity-measure] frame set truncated to inference cap",
      session.id,
      frameRows.length,
    );
  }


  const failSession = async (reason: string, status = 500) => {
    await supabase
      .from("cv_calibration_sessions")
      .update({ calibration_status: "failed", failure_reason: reason.slice(0, 500) })
      .eq("id", session.id);
    return json({ error: reason }, status);
  };

  await supabase
    .from("cv_calibration_sessions")
    .update({ calibration_status: "measuring", failure_reason: null })
    .eq("id", session.id);

  const modelId = Deno.env.get("ROBOFLOW_MODEL_ID") ?? DEFAULT_MODEL_ID;

  // Download frames and run detection with bounded concurrency.
  const observations: FrameObservation[] = new Array(frames.length);
  const rawDetections: Array<{
    frame_index: number;
    timestamp_seconds: number;
    image_width: number;
    image_height: number;
    predictions: RoboflowPrediction[];
    chosen: BallDetection | null;
  }> = new Array(frames.length);
  let roboflowCalls = 0;
  let roboflowFailures = 0;
  let downloadFailures = 0;
  let capHits = 0;

  // Third guard: a synchronously-incremented budget. JS is single-threaded per
  // isolate, so reserving before the await makes this unbypassable — no
  // concurrent batch, retry, or future refactor can spend past the cap.
  let inferenceBudget = MAX_INFERENCE_CALLS_PER_ANALYSIS;
  const reserveInferenceCall = (): boolean => {
    if (inferenceBudget <= 0) {
      capHits++;
      return false;
    }
    inferenceBudget--;
    return true;
  };

  const runOne = async (i: number): Promise<void> => {
    const frame = frames[i];

    observations[i] = {
      frame_index: frame.frame_index,
      timestamp_seconds: Number(frame.timestamp_seconds),
      detection: null,
    };
    rawDetections[i] = {
      frame_index: frame.frame_index,
      timestamp_seconds: Number(frame.timestamp_seconds),
      image_width: frame.width,
      image_height: frame.height,
      predictions: [],
      chosen: null,
    };

    if (!reserveInferenceCall()) {
      console.warn("[pitch-velocity-measure] inference cap reached, skipping frame", frame.frame_index);
      return;
    }

    const { data: blob, error: downloadError } = await supabase.storage

      .from("videos")
      .download(frame.storage_path);
    if (downloadError || !blob) {
      downloadFailures++;
      console.warn("[pitch-velocity-measure] frame download failed", frame.storage_path, downloadError);
      return;
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const started = Date.now();
    let res: Response;
    try {
      res = await fetch(
        `https://detect.roboflow.com/${modelId}?api_key=${roboflowKey}&confidence=${ROBOFLOW_CONFIDENCE}&overlap=${ROBOFLOW_OVERLAP}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: bytesToBase64(bytes),
        },
      );
    } catch (e) {
      roboflowFailures++;
      console.warn("[pitch-velocity-measure] roboflow network error", frame.frame_index, e);
      return;
    }
    roboflowCalls++;

    if (!res.ok) {
      roboflowFailures++;
      const text = await res.text().catch(() => "");
      console.warn("[pitch-velocity-measure] roboflow error", res.status, text.slice(0, 300));
      return;
    }

    let data: RoboflowResponse;
    try {
      data = (await res.json()) as RoboflowResponse;
    } catch {
      roboflowFailures++;
      return;
    }
    void started;

    const predictions = Array.isArray(data.predictions)
      ? data.predictions.slice(0, 10).map((p) => ({
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          confidence: p.confidence,
          class: p.class,
        }))
      : [];
    const chosen = pickBallPrediction(predictions);
    observations[i].detection = chosen;
    rawDetections[i].predictions = predictions;
    rawDetections[i].chosen = chosen;
  };

  for (let start = 0; start < frames.length; start += CONCURRENCY) {
    const batch = [];
    for (let i = start; i < Math.min(start + CONCURRENCY, frames.length); i++) {
      batch.push(runOne(i));
    }
    await Promise.all(batch);
  }

  if (roboflowCalls === 0) {
    // Detector never ran successfully — infrastructure failure, not a
    // measurement. Distinguish from "ball not found".
    const reason = downloadFailures > 0
      ? "Stored frames could not be read for measurement"
      : "Ball detector is unavailable right now";
    return await failSession(reason, 503);
  }

  const result = computeVelocity(observations, sport);

  const { data: measurement, error: insertError } = await supabase
    .from("cv_velocity_measurements")
    .insert({
      calibration_session_id: session.id,
      video_id: session.video_id,
      user_id: user.id,
      status: result.status,
      velocity_mph: result.velocity_mph,
      confidence: result.confidence,
      missingness_reason: result.missingness_reason,
      method: result.method,
      model_id: modelId,
      sport,
      reference_distance_ft: session.reference_distance_ft,
      frames_total: result.frames_total,
      frames_detected: result.frames_detected,
      frames_missed: result.frames_missed,
      roboflow_calls: roboflowCalls,
      track_summary: result.track,
      pair_samples: result.pair_samples,
      detections: rawDetections,
    })
    .select("id, created_at")
    .single();

  if (insertError || !measurement) {
    console.error("[pitch-velocity-measure] measurement insert failed", insertError);
    return await failSession("Measurement could not be saved");
  }

  await supabase
    .from("cv_calibration_sessions")
    .update({ calibration_status: result.status, failure_reason: null })
    .eq("id", session.id);

  return json({
    measurement_id: measurement.id,
    measured_at: measurement.created_at,
    status: result.status,
    velocity_mph: result.velocity_mph,
    confidence: result.confidence,
    missingness_reason: result.missingness_reason,
    method: result.method,
    model_id: modelId,
    sport,
    reference_distance_ft: Number(session.reference_distance_ft),
    frames_total: result.frames_total,
    frames_detected: result.frames_detected,
    frames_missed: result.frames_missed,
    roboflow_calls: roboflowCalls,
    roboflow_failures: roboflowFailures,
    inference_cap: MAX_INFERENCE_CALLS_PER_ANALYSIS,
    frames_skipped_by_cap: capHits,

    track: result.track,
    pair_samples: result.pair_samples,
  });
});
