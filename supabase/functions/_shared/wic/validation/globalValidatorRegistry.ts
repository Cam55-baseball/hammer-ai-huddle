// Phase 11–12 — Global Validator Registry
// Unifies per-engine validator reports into one aggregated report.

export type ValidatorSeverity = "fatal" | "warn" | "info";

export interface ValidatorIssue {
  code: string;
  severity: ValidatorSeverity;
  message: string;
  slug?: string;
  engine?: string;
}

export interface EngineReport {
  engine: string;
  fatal: Array<{ code: string; message: string; slug?: string }>;
  warn: Array<{ code: string; message: string; slug?: string }>;
}

export interface AggregatedValidatorReport {
  ok: boolean;
  version: string;
  status: "ok" | "warn" | "fatal";
  issues: ValidatorIssue[];
  per_engine: Record<string, { fatal: number; warn: number }>;
}

// Global fatals introduced in Phase 11–12.
export const GLOBAL_FATALS = [
  "system_governance_mismatch",
  "determinism_seed_divergence",
  "snapshot_mutation_detected",
  "cross_engine_conflict_detected",
  "why_v2_incomplete",
  "diagnostic_invariant_failure",
] as const;

export type GlobalFatalCode = (typeof GLOBAL_FATALS)[number];

// Registry of per-engine fatal codes for documentation / audit purposes.
export const ENGINE_FATALS: Record<string, readonly string[]> = {
  lift: [
    "lift_illegal_role", "lift_duplicate_role", "lift_missing_full_body",
    "lift_unresolved_template", "lift_governance_missing",
  ],
  speed: [
    "speed_illegal_category", "speed_duplicate_category", "speed_pap_violation",
    "speed_unresolved_template", "speed_governance_missing",
  ],
  bat_speed: [
    "bs_illegal_category", "bs_duplicate_category", "bs_pap_violation",
    "bs_unresolved_template", "bs_governance_missing",
  ],
  conditioning: [
    "cond_illegal_category", "cond_duplicate_category",
    "cond_unresolved_template", "cond_unresolved_substitution", "cond_governance_missing",
  ],
  cross_sport: [
    "xs_illegal_transfer", "xs_duplicate_category",
    "xs_unresolved_template", "xs_unresolved_substitution", "xs_governance_missing",
  ],
  recovery: [
    "rec_conflicting_recovery", "rec_illegal_recovery",
    "rec_unresolved_template", "rec_governance_missing",
  ],
  arm_care: [
    "ac_illegal_throwing_phase", "ac_duplicate_category",
    "ac_unresolved_template", "ac_governance_missing",
  ],
};

export const REGISTRY_VERSION = "global_validator_v1";

/** Aggregate per-engine reports plus any global issues into one report. */
export function aggregateValidatorReports(
  perEngine: EngineReport[],
  globalIssues: ValidatorIssue[] = [],
): AggregatedValidatorReport {
  const issues: ValidatorIssue[] = [];
  const summary: Record<string, { fatal: number; warn: number }> = {};

  for (const rep of perEngine) {
    summary[rep.engine] = { fatal: rep.fatal.length, warn: rep.warn.length };
    for (const f of rep.fatal) {
      issues.push({ code: f.code, severity: "fatal", message: f.message, slug: f.slug, engine: rep.engine });
    }
    for (const w of rep.warn) {
      issues.push({ code: w.code, severity: "warn", message: w.message, slug: w.slug, engine: rep.engine });
    }
  }

  for (const g of globalIssues) issues.push(g);

  const fatal = issues.some((i) => i.severity === "fatal");
  const warn = issues.some((i) => i.severity === "warn");
  return {
    ok: !fatal,
    version: REGISTRY_VERSION,
    status: fatal ? "fatal" : warn ? "warn" : "ok",
    issues,
    per_engine: summary,
  };
}
