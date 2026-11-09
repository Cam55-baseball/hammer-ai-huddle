import { describe, it, expect } from "vitest";
import { NEVER_PUSH_TABLES, PUSH_SOURCE_TABLES, deliveriesFor, pushAllowedByPrefs, type FanoutLookup } from "../../../supabase/functions/_shared/push/fanout";
import { shownPush } from "@/hooks/command/useNotificationPreferences";

const lookup: FanoutLookup = {
  roles: async () => [], name: async () => null, authorizingParents: async () => [], firstInSeries: async () => null,
  isUnder13: async () => false, orgAdmins: async () => [], owners: async () => ["ownerA", "ownerB"],
};

describe("Release A follow-ups (owner Nov 8)", () => {
  it("(a) owner alerts push only for lesson requests and scout applications", async () => {
    const lesson = await deliveriesFor("addon_notices", { user_id: "ownerA", title: "New lesson request", body: "Jo picked 4 lesson times.", link: "/owner?section=lessons" }, lookup);
    expect(lesson).toHaveLength(1);
    expect(lesson[0].link).toBe("/owner?section=lessons");
    expect(await deliveriesFor("addon_notices", { user_id: "ownerA", title: "Early recap paid twice for one block", body: "x", link: "/owner" }, lookup)).toEqual([]);
    const scout = await deliveriesFor("scout_applications", { id: "s1", first_name: "Pat", last_name: "Ray", applying_as: "scout", status: "pending" }, lookup);
    expect(scout.map((d) => d.userId)).toEqual(["ownerA", "ownerB"]);
    expect(scout[0]).toMatchObject({ title: "New scout application", link: "/owner?section=scout-applications" });
    expect(await deliveriesFor("scout_applications", { status: "approved" }, lookup)).toEqual([]);
  });

  it("(a) player lesson notices still push", async () => {
    expect(await deliveriesFor("addon_notices", { user_id: "kid", title: "Lessons confirmed", body: "y", link: "/lessons" }, lookup)).toHaveLength(1);
  });

  it("(b) System checks cards never push to anyone", () => {
    for (const t of NEVER_PUSH_TABLES) expect(PUSH_SOURCE_TABLES as readonly string[]).not.toContain(t);
    expect(NEVER_PUSH_TABLES).toContain("plan_check_failures");
  });

  it("(c) never touching the Push switch means pushes arrive (when the phone allows them)", () => {
    expect(pushAllowedByPrefs(undefined)).toBe(true);
    expect(pushAllowedByPrefs({ push: false, push_set_at: null })).toBe(true);
    expect(pushAllowedByPrefs({ push: false, push_set_at: "2026-11-09T12:00:00Z" })).toBe(false);
    expect(shownPush(null)).toBe(true);
    expect(shownPush({ push: false, push_set_at: null })).toBe(true);
    expect(shownPush({ push: false, push_set_at: "2026-11-09T12:00:00Z" })).toBe(false);
  });
});
