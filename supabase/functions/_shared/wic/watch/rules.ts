/**
 * Step 13 Part B — the watchdog rules.
 *
 * Pure. Every rule takes plain numbers and returns the note it would write, so
 * the tests, the nightly job and the Control Center all agree on what counts
 * as a problem. Nothing here reads the database and nothing here changes a card.
 */

export type WatchSeverity = "info" | "warn" | "critical";

export type WatchNote = {
  severity: WatchSeverity;
  category: string;
  user_id?: string | null;
  decision_id?: string | null;
  title: string;
  detail: Record<string, unknown>;
  auto_action?: string | null;
};

/** Thresholds. Never loosened to make something pass. */
export const WATCH = {
  FALLBACK_WARN: 0.005,
  FALLBACK_CRITICAL: 0.02,
  MAX_LIFTS_PER_7_DAYS: 3,
  MAX_DAYS_WITHOUT_LIFT: 10,
  MIX_DRIFT: 0.10,
  SLOWDOWN_RATIO: 1.5,
  SKIP_RISE: 0.10,
} as const;

export const WATCH_CATEGORIES = [
  "card_build",
  "empty_card",
  "rule_violation",
  "determinism",
  "fallback_rate",
  "lift_frequency",
  "mix_drift",
  "generation_speed",
  "skipped_sessions",
  "switch_down",
  "athlete_report",
] as const;

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

// ── critical: the card itself ───────────────────────────────────────────────

export function cardBuildFailedNote(i: {
  userId: string;
  planDate: string;
  reason: string;
  fatals?: unknown[];
}): WatchNote {
  return {
    severity: "critical",
    category: "card_build",
    user_id: i.userId,
    title: "A card failed to build",
    detail: { plan_date: i.planDate, reason: i.reason, fatals: i.fatals ?? [] },
    auto_action: "The athlete was served the safe fallback day",
  };
}

export function emptyCardNote(i: { userId: string; planDate: string }): WatchNote {
  return {
    severity: "critical",
    category: "empty_card",
    user_id: i.userId,
    title: "A card came out empty",
    detail: { plan_date: i.planDate },
    auto_action: "Recorded for the owner; the athlete sees the recovery day",
  };
}

/**
 * A live prescription is checked against the decision that produced it: no
 * heavier work than the class allows, and a "none" day is never empty.
 */
export function livePrescriptionViolations(i: {
  userId: string;
  planDate: string;
  allowedClass: "none" | "L" | "M" | "H";
  liftCount: number;
  maxCnsCost: number;
  cnsCap: number;
  itemCount: number;
  decisionId?: string | null;
}): WatchNote[] {
  const out: WatchNote[] = [];
  if (i.allowedClass === "none" && i.liftCount > 0) {
    out.push({
      severity: "critical",
      category: "rule_violation",
      user_id: i.userId,
      decision_id: i.decisionId ?? null,
      title: "A rest day was given lifts",
      detail: { plan_date: i.planDate, allowed_class: "none", lifts: i.liftCount },
      auto_action: null,
    });
  }
  if (i.maxCnsCost > i.cnsCap) {
    out.push({
      severity: "critical",
      category: "rule_violation",
      user_id: i.userId,
      decision_id: i.decisionId ?? null,
      title: "A movement went above today's ceiling",
      detail: {
        plan_date: i.planDate,
        allowed_class: i.allowedClass,
        heaviest: i.maxCnsCost,
        ceiling: i.cnsCap,
      },
      auto_action: null,
    });
  }
  if (i.itemCount === 0) {
    out.push(emptyCardNote({ userId: i.userId, planDate: i.planDate }));
  }
  return out;
}

// ── critical: the nightly re-check ──────────────────────────────────────────

export function determinismNote(i: {
  checkedDate: string;
  mismatches: number;
  decisions: number;
  sample?: string[];
}): WatchNote | null {
  if (i.mismatches <= 0) return null;
  return {
    severity: "critical",
    category: "determinism",
    title: `Last night's re-check found ${i.mismatches} mismatch(es)`,
    detail: {
      checked_date: i.checkedDate,
      mismatches: i.mismatches,
      decisions: i.decisions,
      sample_users: (i.sample ?? []).slice(0, 10),
    },
    auto_action: "The safety ladder steps the switch down",
  };
}

export function fallbackRateNote(i: { checkedDate: string; rate: number; decisions: number }): WatchNote | null {
  if (i.rate > WATCH.FALLBACK_CRITICAL) {
    return {
      severity: "critical",
      category: "fallback_rate",
      title: `Backup plan used on ${pct(i.rate)} of days`,
      detail: { checked_date: i.checkedDate, rate: i.rate, decisions: i.decisions, limit: WATCH.FALLBACK_CRITICAL },
      auto_action: "The safety ladder steps the switch down",
    };
  }
  if (i.rate > WATCH.FALLBACK_WARN) {
    return {
      severity: "warn",
      category: "fallback_rate",
      title: `Backup plan used on ${pct(i.rate)} of days`,
      detail: { checked_date: i.checkedDate, rate: i.rate, decisions: i.decisions, limit: WATCH.FALLBACK_WARN },
      auto_action: "The safety ladder steps the switch down",
    };
  }
  return null;
}

// ── warn: how the training is landing ───────────────────────────────────────

export function liftFrequencyNotes(
  athletes: Array<{ userId: string; liftsLast7Days: number; daysSinceLastLift: number | null }>,
): WatchNote[] {
  const out: WatchNote[] = [];
  for (const a of athletes) {
    if (a.liftsLast7Days > WATCH.MAX_LIFTS_PER_7_DAYS) {
      out.push({
        severity: "warn",
        category: "lift_frequency",
        user_id: a.userId,
        title: `${a.liftsLast7Days} lifts in 7 days`,
        detail: { lifts_last_7_days: a.liftsLast7Days, limit: WATCH.MAX_LIFTS_PER_7_DAYS },
      });
    }
    if (a.daysSinceLastLift !== null && a.daysSinceLastLift > WATCH.MAX_DAYS_WITHOUT_LIFT) {
      out.push({
        severity: "warn",
        category: "lift_frequency",
        user_id: a.userId,
        title: `No lift for ${a.daysSinceLastLift} days`,
        detail: { days_since_last_lift: a.daysSinceLastLift, limit: WATCH.MAX_DAYS_WITHOUT_LIFT },
      });
    }
  }
  return out;
}

export type ClassMix = { none: number; L: number; M: number; H: number };

/** Share of each class, drifting more than 10 points from the shadow baseline. */
export function mixDriftNote(baseline: ClassMix, current: ClassMix): WatchNote | null {
  const share = (m: ClassMix) => {
    const total = m.none + m.L + m.M + m.H;
    if (total === 0) return null;
    return { none: m.none / total, L: m.L / total, M: m.M / total, H: m.H / total };
  };
  const b = share(baseline);
  const c = share(current);
  if (!b || !c) return null;
  const drift: Record<string, number> = {};
  let worst = 0;
  for (const k of ["none", "L", "M", "H"] as const) {
    const d = c[k] - b[k];
    drift[k] = Number(d.toFixed(4));
    if (Math.abs(d) > Math.abs(worst)) worst = d;
  }
  if (Math.abs(worst) <= WATCH.MIX_DRIFT) return null;
  return {
    severity: "warn",
    category: "mix_drift",
    title: `Day mix moved ${pct(Math.abs(worst))} from the shadow baseline`,
    detail: { baseline: b, current: c, drift, limit: WATCH.MIX_DRIFT },
  };
}

export function slowdownNote(i: { baselineMs: number; currentMs: number; samples: number }): WatchNote | null {
  if (i.baselineMs <= 0 || i.samples <= 0) return null;
  const ratio = i.currentMs / i.baselineMs;
  if (ratio <= WATCH.SLOWDOWN_RATIO) return null;
  return {
    severity: "warn",
    category: "generation_speed",
    title: `Cards are taking ${ratio.toFixed(1)}x longer to build`,
    detail: {
      baseline_ms: Math.round(i.baselineMs),
      current_ms: Math.round(i.currentMs),
      ratio: Number(ratio.toFixed(2)),
      samples: i.samples,
      limit: WATCH.SLOWDOWN_RATIO,
    },
  };
}

/** Skipped sessions, overall and per athlete, against the pre-release rate. */
export function skipRiseNotes(i: {
  baselineRate: number;
  currentRate: number;
  sessions: number;
  perAthlete: Array<{ userId: string; baselineRate: number; currentRate: number; sessions: number }>;
}): WatchNote[] {
  const out: WatchNote[] = [];
  if (i.sessions > 0 && i.currentRate - i.baselineRate > WATCH.SKIP_RISE) {
    out.push({
      severity: "warn",
      category: "skipped_sessions",
      title: `Skipped sessions up ${pct(i.currentRate - i.baselineRate)} since release`,
      detail: {
        baseline_rate: i.baselineRate,
        current_rate: i.currentRate,
        sessions: i.sessions,
        limit: WATCH.SKIP_RISE,
      },
    });
  }
  for (const a of i.perAthlete) {
    if (a.sessions > 0 && a.currentRate - a.baselineRate > WATCH.SKIP_RISE) {
      out.push({
        severity: "warn",
        category: "skipped_sessions",
        user_id: a.userId,
        title: `Skipping more since release (${pct(a.currentRate)} of sessions)`,
        detail: {
          baseline_rate: a.baselineRate,
          current_rate: a.currentRate,
          sessions: a.sessions,
          limit: WATCH.SKIP_RISE,
        },
      });
    }
  }
  return out;
}

// ── critical: every automatic switch-down ───────────────────────────────────

export function switchDownNote(i: {
  featureKey: string;
  label: string;
  fromMode: string;
  toMode: string;
  trigger: string;
  reason: string;
}): WatchNote {
  return {
    severity: "critical",
    category: "switch_down",
    title: `${i.label} dropped to ${i.toMode}`,
    detail: {
      feature_key: i.featureKey,
      from_mode: i.fromMode,
      to_mode: i.toMode,
      trigger: i.trigger,
      reason: i.reason,
    },
    auto_action: `Switch stepped down automatically: ${i.fromMode} → ${i.toMode}`,
  };
}

// ── the owner's daily digest ────────────────────────────────────────────────

export type DigestNote = {
  severity: WatchSeverity;
  category: string;
  title: string;
  noted_at?: string;
  auto_action?: string | null;
};

export function buildDigest(notes: DigestNote[], dayLabel: string): { subject: string; body: string } {
  const counts = { critical: 0, warn: 0, info: 0 } as Record<WatchSeverity, number>;
  for (const n of notes) counts[n.severity] = (counts[n.severity] ?? 0) + 1;

  if (notes.length === 0) {
    return {
      subject: `Training intelligence — All clear (${dayLabel})`,
      body: `All clear for ${dayLabel}. Nothing needed your attention in the last 24 hours.`,
    };
  }

  const order: WatchSeverity[] = ["critical", "warn", "info"];
  const lines: string[] = [
    `Training intelligence — ${dayLabel}`,
    `${counts.critical} critical · ${counts.warn} warnings · ${counts.info} notes`,
    "",
  ];
  for (const sev of order) {
    const rows = notes.filter((n) => n.severity === sev).slice(0, 5);
    if (rows.length === 0) continue;
    lines.push(`${sev.toUpperCase()}`);
    for (const r of rows) {
      lines.push(`  • ${r.title}${r.auto_action ? ` — ${r.auto_action}` : ""}`);
    }
    const extra = notes.filter((n) => n.severity === sev).length - rows.length;
    if (extra > 0) lines.push(`  • …and ${extra} more`);
    lines.push("");
  }
  return {
    subject: `Training intelligence — ${counts.critical} critical, ${counts.warn} warnings (${dayLabel})`,
    body: lines.join("\n").trim(),
  };
}

// ── the "Copy report" text ──────────────────────────────────────────────────

export type ReportInput = {
  generatedAt: string;
  days: number;
  notes: Array<{
    noted_at: string;
    severity: WatchSeverity;
    category: string;
    user_id: string | null;
    title: string;
    detail: Record<string, unknown>;
    auto_action: string | null;
  }>;
  switchDowns: Array<{
    changed_at: string;
    feature_key: string;
    from_mode: string;
    to_mode: string;
    reason: string | null;
  }>;
  fallbackRate: number | null;
  greenNights: number;
  switches: Array<{ feature_key: string; label: string; mode: string }>;
};

export function buildReport(i: ReportInput): string {
  const L: string[] = [];
  L.push(`TRAINING INTELLIGENCE — LAST ${i.days} DAYS`);
  L.push(`Generated ${i.generatedAt}`);
  L.push("");

  L.push("SWITCHES");
  for (const s of i.switches) L.push(`  ${s.label}: ${s.mode}`);
  L.push("");

  L.push("COUNTS BY CATEGORY");
  const byCat = new Map<string, { critical: number; warn: number; info: number }>();
  for (const n of i.notes) {
    const c = byCat.get(n.category) ?? { critical: 0, warn: 0, info: 0 };
    c[n.severity] += 1;
    byCat.set(n.category, c);
  }
  if (byCat.size === 0) L.push("  (none)");
  for (const [cat, c] of [...byCat.entries()].sort()) {
    L.push(`  ${cat}: ${c.critical} critical, ${c.warn} warn, ${c.info} info`);
  }
  L.push("");

  const criticals = i.notes.filter((n) => n.severity === "critical");
  L.push(`CRITICAL NOTES (${criticals.length})`);
  if (criticals.length === 0) L.push("  (none)");
  for (const n of criticals) {
    L.push(`  [${n.noted_at}] ${n.category} — ${n.title}`);
    if (n.user_id) L.push(`    athlete: ${n.user_id}`);
    L.push(`    detail: ${JSON.stringify(n.detail)}`);
    if (n.auto_action) L.push(`    action: ${n.auto_action}`);
  }
  L.push("");

  L.push(`AUTOMATIC SWITCH-DOWNS (${i.switchDowns.length})`);
  if (i.switchDowns.length === 0) L.push("  (none)");
  for (const s of i.switchDowns) {
    L.push(`  [${s.changed_at}] ${s.feature_key}: ${s.from_mode} -> ${s.to_mode} — ${s.reason ?? "no reason recorded"}`);
  }
  L.push("");

  L.push("SAFETY");
  L.push(`  Fallback rate (latest check): ${i.fallbackRate === null ? "no check recorded" : pct(i.fallbackRate)}`);
  L.push(`  Green nights in a row: ${i.greenNights}`);
  L.push("");
  L.push("END OF REPORT");
  return L.join("\n");
}
