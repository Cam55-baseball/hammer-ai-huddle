/**
 * One shared system/parked-account exclusion for population readers and
 * scheduled jobs. Parked and system accounts are marked in public.profiles
 * (is_system_account, suspended_at, account_paused_at). Every stat, ranking,
 * list, search, coach/org/scout population read and nightly job must exclude
 * them so parked TEST/synthetic accounts never appear or generate new rows.
 *
 * This is separate from testAdminExclusion.ts, which stays one exact proof ID.
 */
export const SYSTEM_ACCOUNT_WHERE = "is_system_account.eq.false,suspended_at.is.null,account_paused_at.is.null";

/** IDs of every system, suspended or paused account. Population jobs call this
 *  once and drop those IDs before aggregating, ranking or dispatching work. */
export async function systemAccountIds(admin: any): Promise<Set<string>> {
  const out = new Set<string>();
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await admin.from("profiles").select("id")
      .or("is_system_account.eq.true,suspended_at.not.is.null,account_paused_at.not.is.null")
      .range(from, from + page - 1);
    if (error) throw error;
    for (const row of data ?? []) out.add(String((row as any).id));
    if (!data || data.length < page) break;
  }
  return out;
}

/** Remove system/parked IDs from a candidate list. */
export function excludeSystemAccounts<T>(ids: readonly T[], system: ReadonlySet<string>, key: (v: T) => string = String): T[] {
  return ids.filter(id => !system.has(key(id)));
}
