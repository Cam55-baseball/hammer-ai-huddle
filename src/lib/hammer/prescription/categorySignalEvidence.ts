/**
 * Builds real per-category signals from two canonical sources:
 *  - video: the athlete's latest completed same-sport clip for the category's
 *    module — findings mean needs-work, a clean completed clip means looks-good.
 *  - games: the last-7-days game ledger judgments, reusing the existing
 *    whiff/chase/miscue thresholds (never new invented cut-offs).
 * A signal is only emitted from real evidence; missing data emits nothing.
 */
import type { CategorySignal } from "./mixedSignals";
import { isAssessedBy } from "@/lib/wic/faultLedger/cleanClipFade";

export interface SignalClip {
  readonly module: string | null;
  readonly created_at: string;
  readonly violations: Record<string, unknown> | null;
}

export interface GameSignalSummary {
  readonly atBats?: number;
  readonly pitchesSeen?: number;
  readonly whiffPct: number | null;
  readonly chasePct: number | null;
  readonly miscueClusters: ReadonlyArray<{ position: string; errors: number }>;
}

/** Reuse the existing game-ledger advisory thresholds; do not invent new ones. */
export const GAME_WHIFF_NEEDS_WORK = 30;
export const GAME_CHASE_NEEDS_WORK = 35;

const CATEGORY_MODULES: Record<string, readonly string[]> = {
  hitting: ["hitting"],
  fielding: ["fielding", "defense"],
};

const CLIP_FRESH_DAYS = 21;

function latestClip(clips: readonly SignalClip[], modules: readonly string[], now: Date): SignalClip | null {
  const fresh = clips
    .filter((c) => c.module && modules.includes(c.module))
    .filter((c) => {
      const t = Date.parse(c.created_at);
      const age = now.getTime() - t;
      return Number.isFinite(t) && age >= 0 && age <= CLIP_FRESH_DAYS * 86400 * 1000;
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return fresh[0] ?? null;
}

function measuredDirection(clip: SignalClip): "needs-work" | "looks-good" | null {
  if (!clip.violations) return null;
  const answers = Object.entries(clip.violations);
  if (answers.some(([, value]) => value === true)) return "needs-work";
  // Some analyzer false fields are mandatory placeholders, not assessments.
  // Reuse the canonical assessed-fault contract rather than treating those as clean.
  return answers.some(([fault, value]) => value === false && !!clip.module && isAssessedBy(clip.module, fault)) ? "looks-good" : null;
}

export function categorySignalEvidence(
  clips: readonly SignalClip[],
  games: GameSignalSummary | null,
  now: Date = new Date(),
): CategorySignal[] {
  const signals: CategorySignal[] = [];

  // Video signals: one per category, from the latest fresh completed clip only.
  for (const [category, modules] of Object.entries(CATEGORY_MODULES)) {
    const clip = latestClip(clips, modules, now);
    if (!clip) continue;
    const direction = measuredDirection(clip);
    if (!direction) continue;
    signals.push(
      direction === "needs-work"
        ? { category, source: "video", direction: "needs-work", says: `issues on your latest ${modules[0]} video` }
        : { category, source: "video", direction: "looks-good", says: `your latest ${modules[0]} video looked clean` },
    );
  }

  // Game signals: existing thresholds only, and only with a real sample.
  if (games) {
    const validPercent = (value: number | null) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
    // Same existing minimum as game-plan influence: 6 ABs or 20 pitches.
    // Missing/invalid counts cannot turn a stored 0% into clean evidence.
    const count = (value: number | undefined) => typeof value === "number" && Number.isInteger(value) && value >= 0;
    const enoughSample = (count(games.atBats) && (games.atBats ?? 0) >= 6) ||
      (count(games.pitchesSeen) && (games.pitchesSeen ?? 0) >= 20);
    if (enoughSample && (validPercent(games.whiffPct) || validPercent(games.chasePct))) {
      const whiffBad = validPercent(games.whiffPct) && (games.whiffPct ?? 0) > GAME_WHIFF_NEEDS_WORK;
      const chaseBad = validPercent(games.chasePct) && (games.chasePct ?? 0) > GAME_CHASE_NEEDS_WORK;
      if (whiffBad || chaseBad) {
        const parts = [
          whiffBad ? `whiff rate ${games.whiffPct}%` : null,
          chaseBad ? `chase rate ${games.chasePct}%` : null,
        ].filter(Boolean).join(" and ");
        signals.push({ category: "hitting", source: "games", direction: "needs-work", says: parts });
      } else {
        signals.push({ category: "hitting", source: "games", direction: "looks-good", says: "your contact and pitch selection in games" });
      }
    }
    const top = games.miscueClusters.find(cluster => cluster.position.trim() && Number.isInteger(cluster.errors) && cluster.errors > 0);
    if (top) {
      signals.push({ category: "fielding", source: "games", direction: "needs-work", says: `${top.errors} errors at ${top.position} in the last week` });
    }
  }

  return signals;
}
