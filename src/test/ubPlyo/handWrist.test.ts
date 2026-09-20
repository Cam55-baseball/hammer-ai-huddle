// v1.2 §C3 — Hand and Wrist Chain safety tests. Pure code, both tiers.

import { describe, expect, it } from "vitest";
import {
  HAND_CHAIN_MAX_CONTACTS_PER_SESSION,
  HAND_CHAIN_MOVEMENTS,
  HAND_CHAIN_STAFF_CUE,
  ALL_V11_ROWS,
  V11_MOVEMENTS,
  v11RegressionChain,
} from "../../../supabase/functions/_shared/wic/ubPlyo/v11Movements.ts";
import {
  handChainExposure,
  isFloorVersion,
  resolveHandChain,
} from "../../../supabase/functions/_shared/wic/ubPlyo/handWrist.ts";
import type { UbHistory, UbProfile } from "../../../supabase/functions/_shared/wic/ubPlyo/rules.ts";

const find = (slug: string) => {
  const m = HAND_CHAIN_MOVEMENTS.find((x) => x.slug === slug);
  if (!m) throw new Error(`missing ${slug}`);
  return m;
};

const profile = (over: Partial<UbProfile> = {}): UbProfile =>
  ({
    ageYears: 17,
    trainingAge: "intermediate",
    role: "position",
    bodyWeightLb: 170,
    ...over,
  }) as UbProfile;

const history = (over: Partial<UbHistory> = {}): UbHistory =>
  ({ painFlag: false, ...over }) as UbHistory;

const ctx = (over: Partial<Parameters<typeof resolveHandChain>[3]> = {}) => ({
  weeksAtLevel: 4,
  contactsPlannedToday: 0,
  ...over,
});

describe("§C3 — age and surface gates", () => {
  it("13-year-olds get the wall versions only", () => {
    const p = profile({ ageYears: 13, trainingAge: "beginner" });
    expect(resolveHandChain(find("hwc_wrist_pogo_wall"), p, history(), ctx()).allowed).toBe(true);
    const floor = resolveHandChain(find("hwc_wrist_pogo_floor"), p, history(), ctx());
    expect(floor.allowed).toBe(false);
    expect(floor.blockedBy).toBe("floor_version_min_age");
  });

  it("under 13 gets nothing", () => {
    const r = resolveHandChain(find("hwc_wrist_pogo_wall"), profile({ ageYears: 12 }), history(), ctx());
    expect(r.blockedBy).toBe("min_age");
  });

  it("floor versions need 14+ and intermediate+", () => {
    const young = resolveHandChain(
      find("hwc_finger_pushup_floor"),
      profile({ ageYears: 14, trainingAge: "developing" }),
      history(),
      ctx(),
    );
    expect(young.blockedBy).toBe("floor_version_training_age");
    expect(
      resolveHandChain(
        find("hwc_finger_pushup_floor"),
        profile({ ageYears: 14, trainingAge: "intermediate" }),
        history(),
        ctx(),
      ).allowed,
    ).toBe(true);
  });

  it("every kneeling or floor row is U2, every wall row is U1", () => {
    for (const m of HAND_CHAIN_MOVEMENTS) {
      expect(m.tier).toBe(isFloorVersion(m) ? "U2" : "U1");
    }
  });
});

describe("§C3 — progression, contacts, pain and pitchers", () => {
  it("needs 3–4 weeks at each level before moving up", () => {
    const m = find("hwc_wrist_pogo_incline");
    expect(resolveHandChain(m, profile(), history(), ctx({ weeksAtLevel: 2 })).blockedBy).toBe(
      "weeks_at_level",
    );
    expect(resolveHandChain(m, profile(), history(), ctx({ weeksAtLevel: 3 })).allowed).toBe(true);
  });

  it("caps the session at 40 contacts", () => {
    const m = find("hwc_wrist_pogo_wall");
    expect(resolveHandChain(m, profile(), history(), ctx({ contactsPlannedToday: 10 })).maxContacts).toBe(
      HAND_CHAIN_MAX_CONTACTS_PER_SESSION - 10,
    );
    expect(
      resolveHandChain(m, profile(), history(), ctx({ contactsPlannedToday: 40 })).blockedBy,
    ).toBe("session_contact_cap");
    expect(handChainExposure([{ contacts: 41 }]).overCap).toBe(true);
    expect(handChainExposure([{ contacts: 20 }, { contacts: 20 }])).toMatchObject({
      channel: "UB_PLYO",
      tank: "arm",
      contacts: 40,
      overCap: false,
    });
  });

  it("reported pain blocks the drill", () => {
    expect(
      resolveHandChain(find("hwc_wrist_pogo_wall"), profile(), history({ painFlag: true }), ctx())
        .blockedBy,
    ).toBe("pain_rules");
  });

  it("pitchers get no max fingertip loading on start day or the day before", () => {
    const p = profile({ role: "starting_pitcher" });
    const tip = find("hwc_fingertip_pogo_wall");
    expect(resolveHandChain(tip, p, history(), ctx({ isStartDay: true })).blockedBy).toBe(
      "pitcher_start_window",
    );
    expect(resolveHandChain(tip, p, history(), ctx({ isDayBeforeStart: true })).blockedBy).toBe(
      "pitcher_start_window",
    );
    expect(resolveHandChain(tip, p, history(), ctx()).allowed).toBe(true);
    // Non-fingertip work is unaffected.
    expect(resolveHandChain(find("hwc_wrist_pogo_wall"), p, history(), ctx({ isStartDay: true })).allowed).toBe(
      true,
    );
  });
});

describe("§C2/§C3/§C5 — row shape", () => {
  it("athletes see the plain cue and never the staff cue", () => {
    for (const m of HAND_CHAIN_MOVEMENTS) {
      expect(m.staffCue).toBe(HAND_CHAIN_STAFF_CUE);
      expect(m.cue).not.toMatch(/retinaculum|fascial/i);
      const d = resolveHandChain(m, profile(), history(), ctx());
      expect(d.athleteCue).not.toMatch(/retinaculum|fascial/i);
    }
  });

  it("no outside program, brand or coach name appears in any new row", () => {
    const banned = /driveline|cressey|westside|heenan|marinovich|ido portal|summers|poliquin|triphasic/i;
    for (const m of ALL_V11_ROWS) {
      expect(m.slug).not.toMatch(banned);
      expect(m.name).not.toMatch(banned);
      expect(m.cue).not.toMatch(banned);
    }
  });

  it("every regression chain ends at a U1 row", () => {
    for (const m of ALL_V11_ROWS) {
      if (m.tier === "U1") continue;
      const chain = v11RegressionChain(m.slug);
      expect(chain.length).toBeGreaterThan(0);
      const last = chain[chain.length - 1];
      const local = ALL_V11_ROWS.find((r) => r.slug === last);
      if (local) expect(local.tier).toBe("U1");
      else expect(last.startsWith("ubp_") || last.startsWith("bs_")).toBe(true);
    }
  });

  it("families 17–20, the mirror rows and the banded sled press are all present", () => {
    const fams = new Set(V11_MOVEMENTS.map((m) => m.family));
    for (const f of [17, 18, 19, 20, 22, 23]) expect(fams.has(f)).toBe(true);
    expect(V11_MOVEMENTS.some((m) => m.name === "Banded Sled Press (Rebound)")).toBe(true);
    expect(new Set(ALL_V11_ROWS.map((m) => m.slug)).size).toBe(ALL_V11_ROWS.length);
  });
});
