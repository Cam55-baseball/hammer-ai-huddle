/**
 * Lifting Blueprint B5 — testing battery + progress from the player's OWN numbers.
 * No outside targets: every change is against the player's own baseline.
 */
export interface BatteryTest {
  key: string;
  label: string;
  unit: string;
  lowerIsBetter?: boolean;
  sided?: boolean;
}

export const BATTERY: BatteryTest[] = [
  { key: "test.broad_jump_in", label: "Broad jump", unit: "in" },
  { key: "test.vertical_jump_in", label: "Vertical jump", unit: "in" },
  { key: "test.sl_broad_jump_in", label: "Single-leg broad jump", unit: "in", sided: true },
  { key: "test.sprint_10yd_s", label: "10-yard sprint", unit: "s", lowerIsBetter: true },
  { key: "test.sprint_30yd_s", label: "30-yard sprint", unit: "s", lowerIsBetter: true },
  { key: "test.sprint_60yd_s", label: "60-yard sprint", unit: "s", lowerIsBetter: true },
  { key: "test.rot_mb_throw_ft", label: "Rotational med-ball throw", unit: "ft", sided: true },
  { key: "test.throw_velo_mph", label: "Throwing velocity", unit: "mph" },
  { key: "test.bat_speed_mph", label: "Bat speed", unit: "mph" },
  { key: "test.exit_velo_mph", label: "Exit velo", unit: "mph" },
];

export interface Obs { key: string; value: number; at: string; side?: string | null }

export interface QualityProgress {
  key: string;
  label: string;
  unit: string;
  side: string | null;
  baseline: number;
  latest: number;
  /** % change, positive = better (sprints flipped). */
  changePct: number;
  count: number;
}

/** Baseline = average of the first two results; latest = most recent. */
export function progressFor(obs: ReadonlyArray<Obs>): QualityProgress[] {
  const out: QualityProgress[] = [];
  for (const t of BATTERY) {
    const sides = t.sided ? ["left", "right"] : [null];
    for (const side of sides) {
      const rows = obs
        .filter((o) => o.key === t.key && (side ? o.side === side : true))
        .sort((a, b) => a.at.localeCompare(b.at));
      if (!rows.length) continue;
      const first = rows.slice(0, 2);
      const baseline = first.reduce((s, r) => s + r.value, 0) / first.length;
      const latest = rows[rows.length - 1].value;
      const raw = baseline ? ((latest - baseline) / baseline) * 100 : 0;
      out.push({ key: t.key, label: t.label, unit: t.unit, side, baseline, latest, changePct: +(t.lowerIsBetter ? -raw : raw).toFixed(1), count: rows.length });
    }
  }
  return out;
}

/** Slowest-improving (or declining) quality with at least 2 results. */
export function slowestQuality(p: ReadonlyArray<QualityProgress>): QualityProgress | null {
  const eligible = p.filter((q) => q.count >= 2);
  if (!eligible.length) return null;
  return [...eligible].sort((a, b) => a.changePct - b.changePct)[0];
}

/** Left/right imbalance > 10% on the latest result, weaker side named. */
export function sideImbalances(p: ReadonlyArray<QualityProgress>, threshold = 10): { label: string; weaker: string; diffPct: number }[] {
  const res: { label: string; weaker: string; diffPct: number }[] = [];
  for (const t of BATTERY.filter((b) => b.sided)) {
    const l = p.find((q) => q.key === t.key && q.side === "left");
    const r = p.find((q) => q.key === t.key && q.side === "right");
    if (!l || !r) continue;
    const hi = Math.max(l.latest, r.latest);
    const diffPct = +((Math.abs(l.latest - r.latest) / hi) * 100).toFixed(1);
    if (diffPct > threshold) res.push({ label: t.label, weaker: l.latest < r.latest ? "left" : "right", diffPct });
  }
  return res;
}

/** Strength relative to body weight (verified max ÷ body weight). Null until both exist. */
export function relativeStrength(verifiedMax: number | null, bodyWeight: number | null): number | null {
  if (!verifiedMax || !bodyWeight || bodyWeight <= 0) return null;
  return +(verifiedMax / bodyWeight).toFixed(2);
}
