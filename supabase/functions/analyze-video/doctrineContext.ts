/**
 * Each analysis gets ONLY its own doctrine, gated exactly like the tiles.
 * The existing fault bullets stay; this is added alongside them.
 */
import { DOCTRINE } from "./doctrine.bundle.ts";

const RULES = `
HOW TO USE THIS DOCTRINE (mandatory):
- It is context for reading the clip, not a script. Describe what you actually see in the frames.
- Never assert a fault you cannot observe in the frames. If the frames do not show a moment, say it was not visible.
- When discussing hitting, use ONLY the owner's phase names: Phase 1 — Create Balance; Phase 2 — Gather; Phase 3 — Load by Stride; Phase 4 — Hitter's Move. These names override any alternate headings in the source document (including "P1 — Hip Load"). Never write a bare "P1" or call Phase 1 "Hip Load".
- When discussing baseball pitching, use ONLY these owner-approved ANALYSIS phase names: Phase 1 — Create Balance (set through gather to peak leg lift); Phase 2 — Load and Drive (energy angle with lift and thrust together); Phase 3 — Stride to Landing (tempo, stride length, front-foot strike); Phase 4 — The Pitcher's Move (release, stack and track, extension); The Finish (drag line, glove, balance after release). Editorial headings in the source and landing-first checklist order are not phase names. Never write a bare phase number or abbreviation. These are not Report Card phase labels.
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
