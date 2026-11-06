// Owner Nov 6 r4 #2: a sponsorship unlocks ONLY the plan the sponsor picked.
import { describe, it, expect } from "vitest";
import { refreshSponsoredAccess } from "../../../../supabase/functions/_shared/sponsorship";
import { normalizeProgramModules } from "../../../../supabase/functions/_shared/programAccess";
import { getActiveTier, sidebarPlanKeys } from "@/utils/tierAccess";

function fakeAdmin(sponsorships: any[], current: any = null) {
  const writes: any[] = [];
  const admin = {
    from(table: string) {
      const q: any = {
        select: () => q, eq: () => (table === "org_sponsorships" ? Promise.resolve({ data: sponsorships }) : q),
        maybeSingle: () => Promise.resolve({ data: current }),
        upsert: (row: any) => { writes.push(row); return Promise.resolve({ error: null }); },
      };
      return q;
    },
  };
  return { admin, writes };
}
const future = new Date(Date.now() + 5 * 86400_000).toISOString();
const past = new Date(Date.now() - 86400_000).toISOString();

describe.each(["golden2way", "5tool", "pitcher"] as const)("sponsoring %s", (tier) => {
  for (const sport of ["baseball", "softball"] as const) {
    it(`${sport}: writes exactly one sponsored plan and shows only that plan`, async () => {
      const { admin, writes } = fakeAdmin([{ id: "s1", status: "active", sport, tier }]);
      const mods = await refreshSponsoredAccess(admin, "p1");
      expect(mods).toEqual([`${sport}_${tier}`]);
      expect(Object.keys(writes[0].module_subscription_mapping)).toEqual([`${sport}_${tier}`]);
      const read = normalizeProgramModules(mods, sport);
      expect(read).not.toContain(`${sport}_${tier === "golden2way" ? "5tool" : tier === "5tool" ? "golden2way" : "5tool"}`);
      expect(sidebarPlanKeys(getActiveTier(read, sport))).toEqual([tier]);
    });
  }
  it("pause keeps only that plan through the paid period, then removes it", async () => {
    const a = fakeAdmin([{ id: "s1", status: "paused", sport: "baseball", tier, paid_through: future }]);
    expect(await refreshSponsoredAccess(a.admin, "p1")).toEqual([`baseball_${tier}`]);
    const cur = { subscribed_modules: [`baseball_${tier}`], module_subscription_mapping: { [`baseball_${tier}`]: { subscription_id: "sponsor:s1" } } };
    const b = fakeAdmin([{ id: "s1", status: "paused", sport: "baseball", tier, paid_through: past }], cur);
    expect(await refreshSponsoredAccess(b.admin, "p1")).toEqual([]);
  });
  it("resume restores only that plan", async () => {
    const a = fakeAdmin([{ id: "s1", status: "active", sport: "baseball", tier }], { subscribed_modules: [], module_subscription_mapping: {} });
    expect(await refreshSponsoredAccess(a.admin, "p1")).toEqual([`baseball_${tier}`]);
  });
  it("cancel keeps only that plan for the grace window, then removes it", async () => {
    const a = fakeAdmin([{ id: "s1", status: "canceled", sport: "baseball", tier, grace_until: future }]);
    expect(await refreshSponsoredAccess(a.admin, "p1")).toEqual([`baseball_${tier}`]);
    const cur = { subscribed_modules: [`baseball_${tier}`], module_subscription_mapping: { [`baseball_${tier}`]: { subscription_id: "sponsor:s1" } } };
    const b = fakeAdmin([{ id: "s1", status: "canceled", sport: "baseball", tier, grace_until: past }], cur);
    expect(await refreshSponsoredAccess(b.admin, "p1")).toEqual([]);
  });
});

describe("Golden 2Way skill aliases never surface 5Tool as its own plan", () => {
  it("Golden 2Way read keys show one plan in the menu", () => {
    const read = normalizeProgramModules(["baseball_golden2way"], "baseball");
    expect(read).toContain("baseball_hitting"); // training naturally includes position-player work
    expect(read).not.toContain("baseball_5tool");
    expect(sidebarPlanKeys(getActiveTier(read, "baseball"))).toEqual(["golden2way"]);
  });
  it("Golden 2Way sponsorship over the player's own ending Complete Pitcher still shows only Golden 2Way", () => {
    const read = normalizeProgramModules(["baseball_pitching", "baseball_golden2way"], "baseball");
    expect(sidebarPlanKeys(getActiveTier(read, "baseball"))).toEqual(["golden2way"]);
  });
});
