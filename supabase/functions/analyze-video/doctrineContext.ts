/**
 * STAGED — NOT WIRED. Owner approved applying the doctrine on 2026-10-02,
 * but project standing rules still prohibit deploy/redeploy, including changes
 * under supabase/functions (which go live automatically).
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
- When discussing hitting, use ONLY the owner's phase names: Phase 1 — Create Balance; Phase 2 — Gather; Phase 3 — Load by Stride; Phase 4 — Hitter's Move. These names override any alternate headings in the source document (including "P1 — Hip Load"). Never write a bare "P1" or call Phase 1 "Hip Load".
- In every other analysis, write a phase with its number and name when a numbered phase model is supplied. Never write a bare abbreviated phase key.
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
