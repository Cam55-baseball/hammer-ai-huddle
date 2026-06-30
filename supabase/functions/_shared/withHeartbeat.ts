// Shared heartbeat helper for long-running edge functions.
// Logs start, periodic progress, and terminal success/fail/timeout rows to
// public.engine_function_logs via the service role.
//
// Usage:
//   const hb = startHeartbeat("analyze-video", { user_id, video_id });
//   try {
//     const result = await doWork();
//     await hb.success({ result_id: result.id });
//     return result;
//   } catch (e) {
//     await hb.fail(e);
//     throw e;
//   }

import { createClient } from "npm:@supabase/supabase-js@2";

type Status = "success" | "fail" | "timeout";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function adminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface HeartbeatHandle {
  /** Update in-flight metadata (writes a fresh "running" row). */
  beat: (extra?: Record<string, unknown>) => Promise<void>;
  /** Terminal success row + stops the interval. */
  success: (extra?: Record<string, unknown>) => Promise<void>;
  /** Terminal fail row + stops the interval. */
  fail: (err: unknown, extra?: Record<string, unknown>) => Promise<void>;
  /** Terminal timeout row + stops the interval. */
  timeout: (extra?: Record<string, unknown>) => Promise<void>;
  /** Stop the interval without writing a terminal row (e.g. handing off). */
  stop: () => void;
}

interface StartOpts {
  /** Heartbeat interval in ms. Default 8000. */
  intervalMs?: number;
  /** Initial metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * Starts a heartbeat for a long-running function. Safe to call even when
 * the service-role key is missing — degrades to a no-op so we never break
 * the function path.
 */
export function startHeartbeat(
  functionName: string,
  opts: StartOpts = {},
): HeartbeatHandle {
  const supabase = adminClient();
  const intervalMs = opts.intervalMs ?? 8_000;
  const startedAt = Date.now();
  let stopped = false;
  let beats = 0;

  const write = async (status: Status | "running", extra?: Record<string, unknown>) => {
    if (!supabase) return;
    const duration_ms = Date.now() - startedAt;
    const payload = {
      function_name: functionName,
      // engine_function_logs CHECK only allows success/fail/timeout.
      // We piggy-back "running" beats as success rows with a `phase: "beat"`
      // marker — terminal rows always use the true status.
      status: status === "running" ? "success" : status,
      duration_ms,
      error_message: extra?.error_message as string | undefined,
      metadata: {
        ...(opts.metadata ?? {}),
        ...(extra ?? {}),
        phase: status === "running" ? "beat" : status,
        beat_count: beats,
        ts: new Date().toISOString(),
      },
    };
    try {
      await supabase.from("engine_function_logs").insert(payload);
    } catch {
      // Swallow — heartbeat must never break the real call.
    }
  };

  // Initial "started" row.
  void write("running", { phase: "start" });

  const handle = setInterval(() => {
    beats += 1;
    void write("running");
  }, intervalMs);

  const clear = () => {
    if (stopped) return;
    stopped = true;
    try {
      clearInterval(handle);
    } catch {
      /* noop */
    }
  };

  return {
    beat: (extra) => write("running", extra),
    success: async (extra) => {
      clear();
      await write("success", extra);
    },
    fail: async (err, extra) => {
      clear();
      const msg = err instanceof Error ? err.message : String(err);
      await write("fail", { ...(extra ?? {}), error_message: msg });
    },
    timeout: async (extra) => {
      clear();
      await write("timeout", extra);
    },
    stop: clear,
  };
}
