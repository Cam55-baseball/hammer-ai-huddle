/** Owner Nov 6 r3: org people are grouped strictly by role_in_org; a coach is never an athlete. */
export type OrgRole = "coach" | "athlete" | "staff";
export function orgRole(role: string | null | undefined): OrgRole {
  if (role === "player") return "athlete";
  if (role === "coach" || role === "admin" || role === "owner") return "coach";
  return "staff";
}
export function athletesOnly<T extends { role_in_org?: string | null }>(rows: readonly T[]): T[] {
  return rows.filter((r) => orgRole(r.role_in_org) === "athlete");
}
export interface SponsorOption { id: string; name: string; detail: string }
/** Sponsor picker: organization athletes only, full name (+ team, position), sorted by name. */
export function sponsorOptions(
  roster: readonly { user_id: string; full_name: string | null; role_in_org: string | null }[],
  teams: Readonly<Record<string, string[]>> = {},
  positions: Readonly<Record<string, string | null>> = {},
): SponsorOption[] {
  return athletesOnly(roster)
    .map((r) => ({ id: r.user_id, name: r.full_name?.trim() || "Name not shared", detail: [(teams[r.user_id] ?? []).join(", "), positions[r.user_id] ?? ""].filter(Boolean).join(" · ") }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function searchSponsorOptions(options: readonly SponsorOption[], q: string): SponsorOption[] {
  const s = q.trim().toLowerCase();
  return s ? options.filter((o) => `${o.name} ${o.detail}`.toLowerCase().includes(s)) : [...options];
}
