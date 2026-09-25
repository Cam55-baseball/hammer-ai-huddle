// Child safety (RR-9 / RR-10): the same rule the database policies use,
// applied inside service-role functions (which bypass those policies).
// A viewer may see an athlete's data for `scope` when:
//   - the viewer is the athlete, or a real coach of the athlete (is_coach_of), or
//   - the athlete is an adult (existing adult follow behaviour unchanged), or
//   - resolve_recruiting_scope(athlete, scope) is true (guardian-cleared for minors).
// Fail-closed: any RPC error means "not visible".
// deno-lint-ignore-file no-explicit-any
export type RecruitScope = "profile" | "metrics" | "video" | "contact";
export type GateStatus = "visible" | "waiting_on_guardian";

export async function recruitingGate(
  admin: any,
  viewerId: string,
  athleteIds: string[],
  scope: RecruitScope,
): Promise<Map<string, GateStatus>> {
  const out = new Map<string, GateStatus>();
  await Promise.all([...new Set(athleteIds)].map(async (id) => {
    if (id === viewerId) { out.set(id, "visible"); return; }
    try {
      const [coach, minor, scoped] = await Promise.all([
        admin.rpc("is_coach_of", { _coach: viewerId, _athlete: id }),
        admin.rpc("is_minor", { _user_id: id }),
        admin.rpc("resolve_recruiting_scope", { _athlete_id: id, _scope: scope }),
      ]);
      const ok = coach.data === true || minor.data === false || scoped.data === true;
      out.set(id, ok && !coach.error && !minor.error ? "visible" : "waiting_on_guardian");
    } catch {
      out.set(id, "waiting_on_guardian");
    }
  }));
  return out;
}
