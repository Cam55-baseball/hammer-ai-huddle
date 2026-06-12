/**
 * Canonical normalizers for heterogeneous spine values.
 *
 * The spine stores `injury_history` as JSONB and several producers have
 * historically written different shapes:
 *   - `string`                                — legacy free-text
 *   - `string[]`                              — PhysioHealthIntakeDialog
 *   - `Array<{ note, reported_at, ... }>`    — useHammerOnboardingDirector
 *   - `null` / `undefined` / `[]`            — missingness
 *
 * Every consumer that reads `injury_history` MUST funnel through these helpers
 * so a stray shape never crashes a downstream consumer with a `.toLowerCase
 * is not a function` style error.
 *
 * Missingness is preserved (returns `[]` or `null`); never imputed.
 */

export interface InjuryNote {
  readonly note: string;
  readonly reported_at?: string;
  readonly region?: string;
  readonly severity?: string;
  readonly recovery_status?: string;
}

/** Canonical injury entry shape — always { note: string, reported_at?: string }. */
export function normalizeInjuryHistory(raw: unknown): InjuryNote[] {
  if (raw == null) return [];
  if (typeof raw === "string") {
    const s = raw.trim();
    if (s === "" || s.toLowerCase() === "none" || s.toLowerCase() === "no") return [];
    return [{ note: s }];
  }
  if (Array.isArray(raw)) {
    const out: InjuryNote[] = [];
    for (const entry of raw) {
      if (entry == null) continue;
      if (typeof entry === "string") {
        const s = entry.trim();
        if (s !== "") out.push({ note: s });
        continue;
      }
      if (typeof entry === "object") {
        const o = entry as Record<string, unknown>;
        const note =
          typeof o.note === "string"
            ? o.note
            : typeof o.region === "string"
              ? o.region
              : "";
        const trimmed = note.trim();
        if (trimmed === "") continue;
        out.push({
          note: trimmed,
          reported_at: typeof o.reported_at === "string" ? o.reported_at : undefined,
          region: typeof o.region === "string" ? o.region : undefined,
          severity: typeof o.severity === "string" ? o.severity : undefined,
          recovery_status:
            typeof o.recovery_status === "string" ? o.recovery_status : undefined,
        });
      }
    }
    return out;
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (typeof o.note === "string" && o.note.trim() !== "") {
      return [{ note: o.note.trim() }];
    }
  }
  return [];
}

/** Lowercased flat-text blob over an injury history value, safe for `.includes(region)` matching. */
export function injuryHistoryToText(raw: unknown): string {
  const entries = normalizeInjuryHistory(raw);
  if (entries.length === 0) return "";
  return entries
    .map((e) =>
      [e.note, e.region, e.severity, e.recovery_status].filter(Boolean).join(" "),
    )
    .join(" ")
    .toLowerCase();
}

/** True if the athlete reported no injuries (empty or "none"). */
export function isInjuryHistoryEmpty(raw: unknown): boolean {
  return normalizeInjuryHistory(raw).length === 0;
}
