/**
 * STAGED — NOT WIRED. Owner-approved 2026-10-02 ("feed the model the full
 * doctrine"), held here because any edit under supabase/functions goes live
 * on its own and the standing rule forbids deploying.
 *
 * To apply (owner's call):
 *   1. bash scripts/build-doctrine-bundle.sh supabase/functions/analyze-video/doctrine.bundle.ts
 *   2. copy this file to supabase/functions/analyze-video/doctrineContext.ts
 *   3. in analyze-video/index.ts append `+ doctrineContextBlock(module, sport)`
 *      to the `systemPrompt` line (after constructiveCriticismBlock). Nothing else.
 *
 * Each analysis gets ONLY its own doctrine, gated exactly like the tiles.
 * The existing fault bullets stay; this is added alongside them.
 */
import { DOCTRINE } from "./doctrine.bundle.ts";

const RULES = `
HOW TO USE THIS DOCTRINE (mandatory):
- It is context for reading the clip, not a script. Describe what you actually see in the frames.
- Never assert a fault you cannot observe in the frames. If the frames do not show a moment, say it was not visible.
- Always write phases with their number and name, e.g. "Phase 1 — Create Balance". Never write a bare "P1".
- The fault bullets above remain the checklist; this doctrine explains why they matter.`;

export function doctrineSources(module: string, sport: string): Array<keyof typeof DOCTRINE> {
  const m = (module || "").toLowerCase();
  const s = (sport || "").toLowerCase();
  if (m === "hitting") return ["hitting"];
  if (m === "throwing") return ["throwing", "throwing_research"];
  if (m === "pitching" && s === "softball") return ["softball_pitching"];
  if (m === "pitching") return ["baseball_pitching"];
  return [];
}

export function doctrineContextBlock(module: string, sport: string): string {
  const parts = doctrineSources(module, sport)
    .map((k) => DOCTRINE[k])
    .filter((t): t is string => typeof t === "string" && t.length > 0);
  if (parts.length === 0) return "";
  return `\n\n=== FULL OWNER DOCTRINE FOR THIS ANALYSIS TYPE ===\n${parts.join("\n\n---\n\n")}\n${RULES}\n=== END DOCTRINE ===`;
}
