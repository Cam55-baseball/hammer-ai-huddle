/**
 * Wave 2 — Role authorization matrix.
 *
 * Declarative capability map. All gating logic reads from this single
 * source. App roles align with existing `app_role` enum
 * (owner | admin | coach | player | recruiter | scout).
 */
export type AppRole =
  | "owner"
  | "admin"
  | "coach"
  | "player"
  | "recruiter"
  | "scout";

export type Capability =
  | "read_event"
  | "replay"
  | "override"
  | "ops_view"
  | "deployment_gate";

const MATRIX: Record<AppRole, Set<Capability>> = {
  owner: new Set<Capability>([
    "read_event",
    "replay",
    "override",
    "ops_view",
    "deployment_gate",
  ]),
  admin: new Set<Capability>(["read_event", "replay", "override", "ops_view"]),
  coach: new Set<Capability>(["read_event", "replay", "override"]),
  player: new Set<Capability>(["read_event", "override"]),
  recruiter: new Set<Capability>(["read_event"]),
  scout: new Set<Capability>(["read_event"]),
};

export function can(role: AppRole | null | undefined, cap: Capability): boolean {
  if (!role) return false;
  return MATRIX[role]?.has(cap) ?? false;
}

export function anyCan(
  roles: Array<AppRole | null | undefined>,
  cap: Capability,
): boolean {
  return roles.some((r) => can(r, cap));
}
