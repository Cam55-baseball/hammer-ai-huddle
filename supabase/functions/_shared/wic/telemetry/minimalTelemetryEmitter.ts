// Phase 12+ — Minimal Telemetry Emitter
// Production emits ONLY SystemStateV1. Raw engine logs gated behind DEBUG_WIC=1.

import type { SystemStateV1 } from "../stateCompression/systemStateCompressor.ts";
import { systemStateHash } from "../stateCompression/systemStateCompressor.ts";

function debugEnabled(): boolean {
  try {
    // deno-lint-ignore no-explicit-any
    const env = (globalThis as any).Deno?.env;
    if (env && typeof env.get === "function") return env.get("DEBUG_WIC") === "1";
  } catch (_) { /* noop */ }
  return false;
}

export function emitSystemState(state: SystemStateV1): void {
  console.info("[wic.system_state]", JSON.stringify({ hash: systemStateHash(state), state }));
}

export function debugEmit(tag: string, payload: unknown): void {
  if (!debugEnabled()) return;
  console.debug(`[wic.debug.${tag}]`, JSON.stringify(payload));
}
