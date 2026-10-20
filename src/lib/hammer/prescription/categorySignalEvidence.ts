/**
 * Builds real per-category signals from two canonical sources:
 *  - video: the athlete's latest completed same-sport clip for the category's
 *    module — findings mean needs-work, a clean completed clip means looks-good.
 *  - games: the last-7-days game ledger judgments, reusing the existing
 *    whiff/chase/miscue thresholds (never new invented cut-offs).
 * A signal is only emitted from real evidence; missing data emits nothing.
 */
import type { CategorySignal } from "./mixedSignals";

export interface SignalClip {
  readonly module: string | null;
  readonly created_at: string;
  readonly violations: Record<string, unknown> | null;
}

export interface GameSignalSummary {
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
      return Number.isFinite(t) && now.getTime() - t <= CLIP_FRESH_DAYS * 86400 * 1000;
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return fresh[0] ?? null;
}

function hasFindings(clip: SignalClip): boolean {
  return !!clip.violations && Object.keys(clip.violations).length > 0;
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
    signals.push(
      hasFindings(clip)
        ? { category, source: "video", direction: "needs-work", says: `issues on your latest ${modules[0]} video` }
        : { category, source: "video", direction: "looks-good", says: `your latest ${modules[0]} video looked clean` },
    );
  }

  // Game signals: existing thresholds only, and only with a real sample.
  if (games) {
    if (games.whiffPct != null || games.chasePct != null) {
      const whiffBad = games.whiffPct != null && games.whiffPct > GAME_WHIFF_NEEDS_WORK;
      const chaseBad = games.chasePct != null && games.chasePct > GAME_CHASE_NEEDS_WORK;
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
    if (games.miscueClusters.length > 0) {
      const top = games.miscueClusters[0]!;
      signals.push({ category: "fielding", source: "games", direction: "needs-work", says: `${top.errors} errors at ${top.position} in the last week` });
    }
  }

  return signals;
}
