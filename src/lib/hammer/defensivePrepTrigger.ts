/**
 * Owner Nov 5 round 2 Part 4: "Watch before defensive work" shows ONLY for a
 * specific defensive issue from the last 28 days — a finding that came back
 * (2+ observations) in analyses, or an issue from logged games/practice.
 * No trigger → nothing shows. The video must match that issue.
 */
import type { FaultSignal } from "@/lib/wic/faultLedger/ranking";

export const DEFENSE_TRIGGER_DAYS = 28;

export interface DefenseTrigger { faultKey: string; because: string }

const label = (k: string) => k.replace(/^(bb|sb|th|fd)_/, "").replace(/_/g, " ");

export function defensivePrepTriggers(signals: readonly FaultSignal[], now = Date.now()): DefenseTrigger[] {
  const since = now - DEFENSE_TRIGGER_DAYS * 86_400_000;
  const by = new Map<string, { analysis: number; games: number; practice: number }>();
  for (const s of signals) {
    if (s.discipline !== "fielding" || !s.fault_key) continue;
    const t = Date.parse(s.observed_at);
    if (!Number.isFinite(t) || t < since || t > now) continue;
    const n = Math.max(1, Number(s.sample_size) || 1);
    const e = by.get(s.fault_key) ?? { analysis: 0, games: 0, practice: 0 };
    if (s.source === "game_hub") e.games += n;
    else if (s.source === "log_trend") e.practice += n;
    else e.analysis += n;
    by.set(s.fault_key, e);
  }
  const out: DefenseTrigger[] = [];
  for (const [k, e] of by) {
    const issue = label(k);
    if (e.games > 0) out.push({ faultKey: k, because: `Because your logged games in the last 4 weeks showed ${issue}, watch this before defense.` });
    else if (e.practice > 0) out.push({ faultKey: k, because: `Because your practice logs in the last 4 weeks showed ${issue}, watch this before defense.` });
    else if (e.analysis >= 2) out.push({ faultKey: k, because: `Because ${issue} showed up ${e.analysis} times in your clips in the last 4 weeks, watch this before defense.` });
  }
  return out.slice(0, 6);
}
