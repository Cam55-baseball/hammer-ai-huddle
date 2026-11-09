import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PUSH_SOURCE_TABLES, coachNotificationLink, deliveriesFor, pushAllowedByPrefs, type FanoutLookup } from "../../../supabase/functions/_shared/push/fanout";

const lookup = (over: Partial<FanoutLookup> = {}): FanoutLookup => ({
  roles: async () => [],
  name: async (id) => ({ coach: "Sam Lee", kid: "Jo", athlete: "Ava" } as Record<string, string>)[id] ?? null,
  authorizingParents: async () => ["parent1"],
  firstInSeries: async () => null,
  isUnder13: async () => false,
  orgAdmins: async () => ["orgOwner", "orgAdmin"],
  owners: async () => ["owner1"],
  ...over,
});

describe("push wiring: every in-app notification also goes to the same person's phone", () => {
  it("each wired notification table has a database trigger in the migration", () => {
    const sql = readFileSync("drizzle/migrations/0209_native_push_and_health_v1.sql", "utf8")
      + readFileSync("drizzle/migrations/0211_release0_data_foundation.sql", "utf8");
    for (const t of PUSH_SOURCE_TABLES) expect(sql).toContain(`AFTER INSERT ON public.${t} FOR EACH ROW EXECUTE FUNCTION public.push_enqueue()`);
  });

  it("coach/testing-day/sponsorship notices: same title and words, opens where the notice is listed", async () => {
    const d = await deliveriesFor("coach_notifications", { coach_user_id: "u1", title: "Testing day Friday", message: "Bring cleats", notification_type: "testing_day" }, lookup({ roles: async () => ["coach"] }));
    expect(d).toEqual([{ userId: "u1", title: "Testing day Friday", body: "Bring cleats", link: "/coach-dashboard" }]);
    expect(coachNotificationLink("testing_day", null, [])).toBe("/dashboard");
    expect(coachNotificationLink("standard_match_ping", null, ["scout"])).toBe("/recruiting/standards");
    expect(coachNotificationLink("card_shared", { coach_rx: true }, [])).toBe("/today");
  });

  it("lesson and add-on notices keep their saved in-app link; an outside link falls back to the Dashboard", async () => {
    expect(await deliveriesFor("addon_notices", { user_id: "u", title: "Lesson confirmed", body: "Tue 5pm", link: "/training-plans" }, lookup()))
      .toEqual([{ userId: "u", title: "Lesson confirmed", body: "Tue 5pm", link: "/training-plans" }]);
    expect((await deliveriesFor("addon_notices", { user_id: "u", title: "x", body: "y", link: "https://evil.example" }, lookup()))[0].link).toBe("/dashboard");
  });

  it("coach messages: player unless parent-only; authorizing parents when copied", async () => {
    const both = await deliveriesFor("coach_messages", { coach_id: "coach", athlete_id: "athlete", body: "Nice work", parent_copied: true }, lookup());
    expect(both.map((d) => [d.userId, d.title, d.link])).toEqual([
      ["athlete", "Message from Sam Lee", "/athlete/recruiting-consent"],
      ["parent1", "Message from Sam Lee", "/parent/athletes/athlete/recruiting"],
    ]);
    const parentOnly = await deliveriesFor("coach_messages", { coach_id: "coach", athlete_id: "athlete", body: "x", parent_only: true }, lookup());
    expect(parentOnly.map((d) => d.userId)).toEqual(["parent1"]);
  });

  it("coach workout sent: one push per send (recurring series only for its first date), never for cancelled", async () => {
    const rx = { id: "r1", recipient_id: "p", sender_name: "Sam", category: "lift", schedule_type: "date", plan_date: "2026-11-09", status: "pending" };
    expect(await deliveriesFor("coach_prescriptions", rx, lookup())).toEqual([
      { userId: "p", title: "From your coach", body: "Coach Sam sent you a lifting workout for Monday", link: "/my-custom-activities" },
    ]);
    expect(await deliveriesFor("coach_prescriptions", { ...rx, series_id: "s", id: "r2" }, lookup({ firstInSeries: async () => "r1" }))).toEqual([]);
    expect(await deliveriesFor("coach_prescriptions", { ...rx, cancelled_at: "2026-11-08" }, lookup())).toEqual([]);
  });

  it("parent add-on requests go to the parent while pending", async () => {
    const d = await deliveriesFor("addon_parent_requests", { parent_user_id: "par", athlete_user_id: "kid", product: "early_recap", status: "pending" }, lookup());
    expect(d).toEqual([{ userId: "par", title: "Your player asked for an add-on", body: "Jo asked you for the Early 6-Week Recap.", link: "/parent/athletes" }]);
    expect(await deliveriesFor("addon_parent_requests", { parent_user_id: "par", status: "paid" }, lookup())).toEqual([]);
  });

  it("connection requests reach whoever answers them: the person, a child's parent, or the organization's admins", async () => {
    const row = { from_user: "coach", to_user: "athlete", kind: "coach_player", status: "pending" };
    expect(await deliveriesFor("connection_requests", row, lookup())).toEqual([
      { userId: "athlete", title: "New request", body: "Sam Lee sent you a coach connection request.", link: "/my-connections" },
    ]);
    const child = await deliveriesFor("connection_requests", { ...row, to_user: "kid" }, lookup({ isUnder13: async () => true }));
    expect(child).toEqual([{ userId: "parent1", title: "New request", body: "Sam Lee sent Jo a coach connection request.", link: "/my-connections" }]);
    const org = await deliveriesFor("connection_requests", { from_user: "coach", to_org: true, organization_id: "o", kind: "org_coach", status: "pending" }, lookup());
    expect(org.map((d) => d.userId)).toEqual(["orgOwner", "orgAdmin"]);
    expect(await deliveriesFor("connection_requests", { ...row, status: "accepted" }, lookup())).toEqual([]);
  });

  it("a 'push off' the person chose is respected; untouched settings push (owner Nov 8)", () => {
    expect(pushAllowedByPrefs({ push: false, push_set_at: "2026-11-09T00:00:00Z" })).toBe(false);
    expect(pushAllowedByPrefs({ push: false })).toBe(true);
    expect(pushAllowedByPrefs({ push: true })).toBe(true);
    expect(pushAllowedByPrefs(null)).toBe(true);
  });
});
