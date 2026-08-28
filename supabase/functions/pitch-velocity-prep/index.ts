import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";


/**
 * Pre-release access gate for the single-camera pitch velocity pipeline.
 *
 * The hosted Roboflow inference path bills real credits per frame and is not
 * yet accuracy-validated. Until it ships, ONLY `owner` and `admin` roles may
 * reach this function. UI gating alone is insufficient because edge functions
 * are directly invocable by any authenticated client. Fails closed.
 */
const PITCH_VELOCITY_RESTRICTED_TO_STAFF = true;

async function assertPitchVelocityAccess(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  if (!PITCH_VELOCITY_RESTRICTED_TO_STAFF) return null;
  const { data, error } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .limit(1);
  if (error) {
    console.error("[pitchVelocityAccess] role lookup failed", error);
    return "Could not verify access";
  }
  if (!data || data.length === 0) {
    return "Pitch velocity measurement is not available yet";
  }
  return null;
}
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FrameSchema = z.object({
  frame_index: z.number().int().min(0).max(1_000_000),
  timestamp_seconds: z.number().min(0).max(3_600),
  data_url: z
    .string()
    .max(4_500_000)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/, "frame must be a JPEG data URL"),
  width: z.number().int().min(16).max(4096),
  height: z.number().int().min(16).max(4096),
});

const BodySchema = z.object({
  video_id: z.string().uuid(),
  reference_distance_ft: z.number().gt(0).max(500),
  frames: z.array(FrameSchema).min(3).max(60),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("Invalid frame data URL");
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Server is not configured" }, 500);
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
      return json({ error: "Invalid calibration request", details: parsed.error.flatten().fieldErrors }, 400);
    }
    body = parsed.data;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const frameIndexes = new Set(body.frames.map((frame) => frame.frame_index));
  if (frameIndexes.size !== body.frames.length) {
    return json({ error: "Frame indexes must be unique" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const accessError = await assertPitchVelocityAccess(supabase, user.id);
  if (accessError) return json({ error: accessError }, 403);


  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, user_id, module, sport")
    .eq("id", body.video_id)
    .maybeSingle();

  if (videoError) {
    console.error("[pitch-velocity-prep] video lookup failed", videoError);
    return json({ error: "Could not load video" }, 500);
  }
  if (!video) return json({ error: "Video not found" }, 404);
  if (video.user_id !== user.id) return json({ error: "You do not own this video" }, 403);
  if (video.module !== "pitching") {
    return json({ error: "Pitch velocity calibration requires a pitching video" }, 409);
  }

  const { data: session, error: sessionError } = await supabase
    .from("cv_calibration_sessions")
    .insert({
      user_id: user.id,
      video_id: body.video_id,
      reference_distance_ft: body.reference_distance_ft,
      calibration_status: "processing",
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    console.error("[pitch-velocity-prep] session insert failed", sessionError);
    return json({ error: "Could not create calibration session" }, 500);
  }

  const uploadedPaths: string[] = [];
  const failSession = async (reason: string, status = 500) => {
    await supabase
      .from("cv_calibration_sessions")
      .update({ calibration_status: "failed", failure_reason: reason.slice(0, 500) })
      .eq("id", session.id)
      .eq("user_id", user.id);
    if (uploadedPaths.length > 0) {
      await supabase.storage.from("videos").remove(uploadedPaths);
    }
    return json({ error: reason }, status);
  };

  const frameRows: Array<{
    calibration_session_id: string;
    frame_index: number;
    timestamp_seconds: number;
    storage_path: string;
    sha256_hex: string;
    width: number;
    height: number;
  }> = [];

  for (const frame of body.frames) {
    let bytes: Uint8Array;
    try {
      bytes = dataUrlToBytes(frame.data_url);
    } catch {
      return await failSession(`Frame ${frame.frame_index} could not be decoded`, 400);
    }

    if (bytes.byteLength === 0 || bytes.byteLength > 3_500_000) {
      return await failSession(`Frame ${frame.frame_index} has an invalid image size`, 400);
    }

    const storagePath = `${user.id}/cv-calibration/${session.id}/frame-${frame.frame_index}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(storagePath, bytes, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error("[pitch-velocity-prep] frame upload failed", uploadError);
      return await failSession(`Frame ${frame.frame_index} could not be stored`);
    }
    uploadedPaths.push(storagePath);

    frameRows.push({
      calibration_session_id: session.id,
      frame_index: frame.frame_index,
      timestamp_seconds: frame.timestamp_seconds,
      storage_path: storagePath,
      sha256_hex: await sha256Hex(bytes),
      width: frame.width,
      height: frame.height,
    });
  }

  const { error: framesError } = await supabase
    .from("cv_calibration_frames")
    .insert(frameRows);

  if (framesError) {
    console.error("[pitch-velocity-prep] frame rows insert failed", framesError);
    return await failSession("Frame metadata could not be saved");
  }

  const { error: readyError } = await supabase
    .from("cv_calibration_sessions")
    .update({ calibration_status: "frames_ready", failure_reason: null })
    .eq("id", session.id)
    .eq("user_id", user.id);

  if (readyError) {
    console.error("[pitch-velocity-prep] ready update failed", readyError);
    return await failSession("Calibration session could not be finalized");
  }

  return json({
    session_id: session.id,
    calibration_status: "frames_ready",
    reference_distance_ft: body.reference_distance_ft,
    frame_count: frameRows.length,
    frames: frameRows.map(({ calibration_session_id: _sessionId, ...frame }) => frame),
  });
});
