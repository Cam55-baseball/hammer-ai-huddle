/**
 * Stage 3 (owner-authorised 2026-10-05) — day intent + pitcher conditioning fallback.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { selectConditioning, PITCHER_STAND_IN_LINE, ALACTIC, type ConditioningSelectionInput } from "../../supabase/functions/_shared/wic/conditioning/selectConditioning";
import { certifyConditioning } from "../../supabase/functions/_shared/wic/conditioning/sessionBuilder";
import { certifyArmCare } from "../../supabase/functions/_shared/wic/armCare/sessionBuilder";
import { certifyRecovery } from "../../supabase/functions/_shared/wic/recovery/sessionBuilder";
import { athleteNoticeCopy } from "@/lib/hammer/notices/athleteNoticeCopy";
import { surfaceForNotice } from "@/lib/hammer/notices/noticeRouting";

const base: ConditioningSelectionInput = {
  sport: "baseball", position: "P", phase: "in_season", isTournamentDay: false,
  hoursToNearestGame: null, pitcherStartedYesterday: false, returningAfterGap: false, dialDownReasons: [], isPitcher: true,
};
// Mirrors the live library: conditioning has only aerobic_base + alactic_power.
const condCatalog = [
  { slug: "pitcher_field_and_cover", conditioning_category: "aerobic_base" },
  { slug: "bases_1st_3rd", conditioning_category: "aerobic_base" },
  { slug: "repeat_90ft_bb", conditioning_category: "alactic_power" },
] as any[];
const rx = (slug: string, slot = "conditioning") => ({ slot, movement_slug: slug, movement_name: slug, sequence_order: 1 });

describe("pitcher conditioning fallback", () => {
  it("a pitcher's conditioning passes the check even though no pitcher-only drill exists", () => {
    const r = certifyConditioning({
      prescriptions: [rx("repeat_90ft_bb"), rx("pitcher_field_and_cover")], catalog: condCatalog,
      template: { seasonPhase: "in_season", isPitcher: true },
    });
    expect(r.templateId).toBe("cond.pitcher_conditioning");
    expect(r.fatal).toEqual([]);
    expect(r.warn.map((w) => w.code)).toContain("cond_library_gap");
  });
  it("a type the library DOES have but the plan left out still fails", () => {
    const r = certifyConditioning({ prescriptions: [rx("repeat_90ft_bb")], catalog: condCatalog, template: { seasonPhase: "offseason" } });
    expect(r.fatal.map((f) => f.code)).toContain("cond_unresolved_template");
  });
  it("arm care for starters/relievers and recovery templates no longer fail on missing library types", () => {
    const ac = certifyArmCare({ prescriptions: [rx("band_er", "arm_care")], catalog: [{ slug: "band_er", arm_care_category: "throwing_day" }] as any,
      template: { seasonPhase: "in_season", isPitcher: true, isStarter: true, isThrowingDay: true } as any });
    expect(ac.fatal.filter((f) => f.code === "ac_unresolved_template")).toEqual([]);
    const rec = certifyRecovery({ prescriptions: [rx("walk", "recovery")], catalog: [{ slug: "walk", recovery_category: "regeneration" }] as any,
      template: { seasonPhase: "in_season", isPostGame: true } as any });
    expect(rec.fatal.filter((f) => f.code === "rec_unresolved_template")).toEqual([]);
  });
  it("the pitcher reason says honestly that a team drill stands in, on every path", () => {
    for (const o of [{}, { pitcherStartedYesterday: true }, { hoursToNearestGame: 20 }, { phase: null }, { dialDownReasons: ["day_intent"] }]) {
      const s = selectConditioning({ ...base, ...o });
      expect(s.why).toContain(PITCHER_STAND_IN_LINE);
      expect(s.why).not.toMatch(/\d/);
    }
    expect(selectConditioning({ ...base, position: "SS", isPitcher: false }).why).not.toContain(PITCHER_STAND_IN_LINE);
  });
});

describe("day intent", () => {
  it("an easier day drops the hard sprint, keeps one easier drill, never adds", () => {
    const normal = selectConditioning({ ...base, position: "SS", isPitcher: false });
    const light = selectConditioning({ ...base, position: "SS", isPitcher: false, dialDownReasons: ["day_intent"] });
    expect(light.slugs.length).toBeLessThanOrEqual(normal.slugs.length);
    expect(light.slugs.some((x) => ALACTIC.has(x))).toBe(false);
    expect(light.why).toMatch(/go easier/);
  });
  it("the athlete reads that their answer was heard, in plain words, on the day-level list", () => {
    const n = { reason: "day_intent", detail: "You chose an easier day in your check-in, so the hard work is dialled back." };
    const copy = athleteNoticeCopy(n);
    expect(copy).toMatch(/easier day/);
    expect(copy).not.toMatch(/\d|load|volume|ramp|ceiling|governor/i);
    expect(surfaceForNotice(n)).toBe("day");
  });
  it("generator: only rest moves the plan, one step at most, never stacked on a check-in step; push/skip add nothing", () => {
    const src = readFileSync("supabase/functions/wk-generate-daily/index.ts", "utf8");
    const block = src.slice(src.indexOf("Stage 3 (owner-authorised"), src.indexOf("TCS v1.1 §3"));
    expect(block).toMatch(/\.eq\("date", planDate\)/);
    expect(block).toMatch(/if \(dayIntent === "rest"\)/);
    expect(block).toMatch(/if \(!checkInAlreadyStepped\) cnsCap = Math\.max\(1, cnsCap - 1\)/);
    expect(block).not.toMatch(/cnsCap \+/);
    expect(block).not.toMatch(/"push"\) \{/);
    expect(src).toMatch(/day_intent: dayIntent,/);
  });
});
