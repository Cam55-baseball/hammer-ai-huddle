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
  | "deployment_gate"
  | "wave3_view"
  | "wave3_share"
  | "wave3_cert";

const MATRIX: Record<AppRole, Set<Capability>> = {
  owner: new Set<Capability>([
    "read_event", "replay", "override", "ops_view", "deployment_gate",
    "wave3_view", "wave3_share", "wave3_cert",
  ]),
  admin: new Set<Capability>([
    "read_event", "replay", "override", "ops_view",
    "wave3_view", "wave3_cert",
  ]),
  coach: new Set<Capability>([
    "read_event", "replay", "override", "wave3_view", "wave3_cert",
  ]),
  player: new Set<Capability>([
    "read_event", "override", "wave3_view", "wave3_share",
  ]),
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
