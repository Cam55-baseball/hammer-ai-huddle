/**
 * Edge-function mirror of src/lib/hammer/context/normalizers.ts.
 *
 * Kept deliberately small and dependency-free so any edge function reading
 * spine `injury_history` JSONB can funnel through the same canonical shape
 * handling as the client. Missingness preserved; never imputed.
 */

export interface InjuryNote {
  note: string;
  reported_at?: string;
  region?: string;
  severity?: string;
  recovery_status?: string;
}

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

export function isInjuryHistoryEmpty(raw: unknown): boolean {
  return normalizeInjuryHistory(raw).length === 0;
}
