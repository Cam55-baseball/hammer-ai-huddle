import { useCallback, useRef, useState } from "react";
import { runSessionPipeline } from "@/lib/delaycam/session/sessionPipeline";
import { createSession, linkSessionVideo, markSessionFailed, saveSessionResults, type NewSessionInput } from "@/lib/delaycam/session/sessionStore";
import type { SessionSummary } from "@/lib/delaycam/session/sessionSummary";

export type GatherStatus = "idle" | "sampling" | "reps" | "saving" | "done" | "failed";

/**
 * Background gathering for a DelayCam session. Starts automatically after a
 * recording stops, regardless of the display toggle, and writes the session +
 * reps to the athlete's record whether or not they open Analyze Session.
 */
export function useDelayCamSessionGathering() {
  const [status, setStatus] = useState<GatherStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const pendingVideoRef = useRef<string | null>(null);
  const runRef = useRef(0);

  const reset = useCallback(() => {
    runRef.current++;
    sessionIdRef.current = null;
    pendingVideoRef.current = null;
    setStatus("idle");
    setProgress(0);
    setSummary(null);
    setError(null);
  }, []);

  const gather = useCallback(async (file: Blob, meta: NewSessionInput) => {
    const run = ++runRef.current;
    setError(null);
    setSummary(null);
    setStatus("sampling");
    setProgress(0);
    let sessionId: string | null = null;
    try {
      sessionId = await createSession(meta);
      sessionIdRef.current = sessionId;
      if (pendingVideoRef.current) await linkSessionVideo(sessionId, pendingVideoRef.current);
      const fps = meta.achieved_fps ?? 0;
      const result = await runSessionPipeline({
        file,
        fps,
        duration_sec: meta.duration_sec ?? 0,
        module: meta.module,
        sport: meta.sport,
        onProgress: (stage, done, total) => {
          if (run !== runRef.current) return;
          setStatus(stage);
          setProgress(total > 0 ? done / total : 0);
        },
      });
      if (run !== runRef.current) return;
      setStatus("saving");
      const s = await saveSessionResults({
        sessionId,
        userId: meta.user_id,
        module: meta.module,
        sport: meta.sport,
        duration_sec: meta.duration_sec,
        fps: meta.achieved_fps,
        result,
      });
      if (run !== runRef.current) return;
      setSummary(s);
      setStatus("done");
    } catch (e: any) {
      const msg = e?.message || "unknown error";
      console.error("[DelayCam session] gathering failed", e);
      if (sessionId) await markSessionFailed(sessionId, msg).catch(() => {});
      if (run !== runRef.current) return;
      setError(msg);
      setStatus("failed");
    }
  }, []);

  /** Attach the saved Players Club clip to this session (whenever it happens). */
  const linkVideo = useCallback(async (videoId: string) => {
    pendingVideoRef.current = videoId;
    if (sessionIdRef.current) await linkSessionVideo(sessionIdRef.current, videoId).catch(() => {});
  }, []);

  return { status, progress, summary, error, gather, linkVideo, reset };
}
