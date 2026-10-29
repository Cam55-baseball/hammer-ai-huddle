// Owner-only demo/test athlete tool. Works ONLY on the hard-coded allowlist
// below — never on any real user. Every account is a system account
// (is_system_account, ranking-excluded) with no recruiting consent row, so
// scouts see nothing and analytics skip it.
//
// Body:
//   {}                                  → the gate-5 test pitcher (back-compat)
//   { persona: "<key>" }                → create/refresh that persona's account + seed data
//   { persona, generate: true, plan_date } → also refresh its phase plan and run the REAL
//                                          card builder with that athlete's own session
//   { persona, session: true }          → a one-time session for the owner to open the app as it
//   { list: true }                      → the allowlist
// Sessions come from a one-time magic-link token, so passwords are NEVER changed:
// the owner keeps control of the plus-addressed inboxes via "Forgot password".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { freshPersona } from './freshPersona.ts';

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Ev = { d: number; type: "game" | "tournament" | "scrimmage"; title: string };
type Arm = { d: number; type: string; count: number; source: "position" | "pitching" };
interface Persona {
  email: string; name: string; dob: string; sport: "baseball" | "softball";
  position: string; secondary?: string; level: string; professional?: boolean;
  season: "off_season" | "in_season"; inStart: string; inEnd: string;
  tier: "pitcher" | "5tool" | "golden2way"; events: Ev[]; arm: Arm[]; timeline?: { tag: string; s: number; e: number; summary: string }[];
  heights?: { d: number; in: number }[];
  /** TEST-only starting gear answers, written once as the player's saved equipment. */
  equipment?: string[];
}

const TODAY = () => new Date().toISOString().slice(0, 10);
const add = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const range = (a: number, b: number, step = 1) => { const o: number[] = []; for (let i = a; i <= b; i += step) o.push(i); return o; };
const dow = (iso: string) => new Date(iso + "T00:00:00Z").getUTCDay(); // 0 Sun

const MODULES: Record<string, Record<string, string[]>> = {
  pitcher: { baseball: ["baseball_pitching"], softball: ["softball_pitching"] },
  "5tool": { baseball: ["baseball_hitting", "baseball_throwing"], softball: ["softball_hitting", "softball_throwing"] },
  golden2way: { baseball: ["baseball_hitting", "baseball_pitching", "baseball_throwing"], softball: ["softball_hitting", "softball_pitching", "softball_throwing"] },
};

/** Weekend (Sat/Sun) offsets from today within [from, to]. */
function weekends(from: number, to: number) {
  const t = TODAY();
  return range(from, to).filter((d) => [0, 6].includes(dow(add(t, d))));
}

function personas(): Record<string, Persona> {
  const t = TODAY();
  const weeks18 = add(t, 18 * 7);
  return {
    demogoals29: {
      email: "hammersmodality+demogoals29@gmail.com", name: "TEST — Goal Picker Oct29", dob: "2005-03-01", sport: "baseball",
      position: "CF", level: "d1", season: "off_season", inStart: weeks18, inEnd: add(weeks18, 120), tier: "5tool",
      events: [], arm: [],
    },
    demo13: {
      email: "hammersmodality+demo13@gmail.com", name: "Demo — 13U Offseason", dob: "2013-05-10", sport: "baseball",
      position: "CF", level: "travel", season: "off_season", inStart: "2027-03-01", inEnd: "2027-07-15", tier: "5tool",
      events: [], arm: [], heights: [{ d: -60, in: 60.0 }, { d: -5, in: 60.25 }],
    },
    demo16ss: {
      email: "hammersmodality+demo16ss@gmail.com", name: "Demo — HS Shortstop", dob: "2010-04-02", sport: "baseball",
      position: "SS", level: "hs_varsity", season: "in_season", inStart: add(t, -45), inEnd: add(t, 40), tier: "5tool",
      events: weekends(-21, 14).map((d) => ({ d, type: "game" as const, title: "Fall ball game" })),
      arm: weekends(-14, -1).flatMap((d) => [
        { d, type: "catch_play", count: 30, source: "position" as const },
        { d, type: "infield_quick_release", count: 15, source: "position" as const },
      ]),
      heights: [{ d: -60, in: 68.5 }, { d: -5, in: 68.75 }],
    },
    democollege: {
      email: "hammersmodality+democollege@gmail.com", name: "Demo — College Outfielder", dob: "2005-08-01", sport: "baseball",
      position: "RF", level: "d1", season: "off_season", inStart: weeks18, inEnd: add(weeks18, 120), tier: "5tool",
      events: [], arm: [],
    },
    // Swap proof player: off-season college outfielder with the gear each Swap proof needs.
    democheckin: {
      email: "hammersmodality+democheckin@gmail.com", name: "TEST — New Player Check-In", dob: "2005-03-01", sport: "baseball",
      position: "CF", level: "d1", season: "off_season", inStart: weeks18, inEnd: add(weeks18, 120), tier: "5tool",
      events: [], arm: [],
    },
    demoswap: {
      email: "hammersmodality+demoswap@gmail.com", name: "Demo — Swap Proof Outfielder", dob: "2005-03-01", sport: "baseball",
      position: "CF", level: "d1", season: "off_season", inStart: weeks18, inEnd: add(weeks18, 120), tier: "5tool",
      events: [], arm: [],
      equipment: ["pitching_machine", "partner", "bat", "gamer_bat", "baseballs", "ball", "net", "tee", "barbell", "plates", "squat_rack", "bench", "hill", "bands", "open_space", "field", "foam_roller"],
    },
    // Second Swap proof player: fresh running load for the no-open-field sprint mix (hill + bands).
    demoswap2: {
      email: "hammersmodality+demoswap2@gmail.com", name: "Demo — Swap Proof Sprinter", dob: "2005-03-01", sport: "baseball",
      position: "CF", level: "d1", season: "off_season", inStart: weeks18, inEnd: add(weeks18, 120), tier: "5tool",
      events: [], arm: [],
      equipment: ["pitching_machine", "partner", "bat", "gamer_bat", "baseballs", "ball", "net", "tee", "barbell", "plates", "squat_rack", "bench", "hill", "bands", "open_space", "field", "foam_roller", "dumbbells"],
    },
    demomlb: {
      email: "hammersmodality+demomlb@gmail.com", name: "Demo — MLB Outfielder", dob: "1998-06-01", sport: "baseball",
      position: "LF", level: "mlb", professional: true, season: "in_season", inStart: "2026-03-26", inEnd: add(t, 9), tier: "5tool",
      // 162-game pace: a game every day except Mondays.
      events: range(-30, 9).filter((d) => dow(add(t, d)) !== 1).map((d) => ({ d, type: "game" as const, title: "MLB game" })),
      arm: [],
    },
    demoausl: {
      email: "hammersmodality+demoausl@gmail.com", name: "Demo — AUSL Pitcher", dob: "2001-02-14", sport: "softball",
      position: "P", level: "ausl", professional: true, season: "in_season", inStart: add(t, -100), inEnd: add(t, 20), tier: "pitcher",
      events: [
        ...range(-14, -1).filter((d) => [3, 6].includes(dow(add(t, d)))).map((d) => ({ d, type: "game" as const, title: "AUSL game" })),
        ...weekends(1, 2).map((d) => ({ d, type: "tournament" as const, title: "Weekend tournament" })),
      ],
      arm: range(-7, -1).filter((d) => d % 2 === 0).map((d) => ({ d, type: "pitcher_warmup", count: 30, source: "pitching" as const })),
      timeline: (() => { const w = weekends(1, 2); return w.length ? [{ tag: "TOURNAMENT", s: w[0], e: w[w.length - 1], summary: "Weekend tournament" }] : []; })(),
    },
    demosbc: {
      email: "hammersmodality+demosbc@gmail.com", name: "Demo — Softball Catcher", dob: "2004-09-09", sport: "softball",
      position: "C", level: "d1", season: "in_season", inStart: add(t, -25), inEnd: add(t, 50), tier: "5tool",
      events: weekends(-14, 14).map((d) => ({ d, type: "game" as const, title: "Fall game" })),
      arm: range(-6, -1).flatMap((d) => [
        { d, type: "catch_play", count: 25, source: "position" as const },
        { d, type: "catcher_throwdowns", count: [0, 6].includes(dow(add(t, d))) ? 12 : 6, source: "position" as const },
      ]),
    },
    demo2way: {
      email: "hammersmodality+demo2way@gmail.com", name: "Demo — Two-Way", dob: "2008-11-20", sport: "baseball",
      position: "P", secondary: "CF", level: "hs_varsity", season: "in_season", inStart: add(t, -40), inEnd: add(t, 35), tier: "golden2way",
      events: weekends(-14, 14).map((d) => ({ d, type: "game" as const, title: "Fall ball game" })),
      arm: range(-6, -1).flatMap((d) => [
        { d, type: "pitcher_warmup", count: 25, source: "pitching" as const },
        { d, type: "catch_play", count: 20, source: "position" as const },
        { d, type: "outfield_crow_hop", count: 10, source: "position" as const },
      ]),
    },
    demoramp: {
      email: "hammersmodality+demoramp@gmail.com", name: "Demo — Pitcher Back From Break", dob: "2006-07-07", sport: "baseball",
      position: "P", level: "d2", season: "in_season", inStart: add(t, -30), inEnd: add(t, 40), tier: "pitcher",
      // Outings every other day, then a 10-day throwing break, back 5 days ago.
      events: [-21, -19, -17, -16, -5, -3, -1].map((d) => ({ d, type: "scrimmage" as const, title: "Fall scrimmage" })),
      arm: [-5, -3, -1].map((d) => ({ d, type: "pitcher_warmup", count: 20, source: "pitching" as const })),
    },
    // Scheduling certification (Oct 29): off-season weeks 1–2, in-season with games weeks 3–4.
    certhsp: {
      email: "hammersmodality+certhsp@gmail.com", name: "TEST — Cert HS Pitcher (BB)", dob: "2009-04-10", sport: "baseball",
      position: "P", level: "hs_varsity", season: "off_season", inStart: add(t, 14), inEnd: add(t, 80), tier: "pitcher",
      events: [16, 19, 23, 26].map((d) => ({ d, type: "game" as const, title: "HS game" })), arm: [],
    },
    certsb5: {
      email: "hammersmodality+certsb5@gmail.com", name: "TEST — Cert HS 5Tool (SB)", dob: "2009-06-12", sport: "softball",
      position: "SS", level: "hs_varsity", season: "off_season", inStart: add(t, 14), inEnd: add(t, 80), tier: "5tool",
      events: [15, 18, 22, 25, 27].map((d) => ({ d, type: "game" as const, title: "HS game" })), arm: [],
    },
    certsbp: {
      email: "hammersmodality+certsbp@gmail.com", name: "TEST — Cert HS Pitcher (SB)", dob: "2009-02-20", sport: "softball",
      position: "P", level: "hs_varsity", season: "off_season", inStart: add(t, 14), inEnd: add(t, 80), tier: "pitcher",
      events: [16, 18, 23, 25].map((d) => ({ d, type: "game" as const, title: "HS game" })), arm: [],
    },
    certsb2: {
      email: "hammersmodality+certsb2@gmail.com", name: "TEST — Cert HS 2Way (SB)", dob: "2009-08-03", sport: "softball",
      position: "P", secondary: "SS", level: "hs_varsity", season: "off_season", inStart: add(t, 14), inEnd: add(t, 80), tier: "golden2way",
      events: [15, 18, 22, 25].map((d) => ({ d, type: "game" as const, title: "HS game" })), arm: [],
    },
    certcsb2: {
      email: "hammersmodality+certcsb2@gmail.com", name: "TEST — Cert College 2Way (SB)", dob: "2005-05-15", sport: "softball",
      position: "P", secondary: "1B", level: "d1", season: "off_season", inStart: add(t, 14), inEnd: add(t, 80), tier: "golden2way",
      events: [15, 17, 19, 20, 22, 24, 26, 27].map((d) => ({ d, type: "game" as const, title: "College game" })), arm: [],
    },
  };
}

// Staff personas for proving the scouting/recruiting flows end to end.
// Same rules as athletes: allowlist-only, system accounts, owner-only tool.
interface StaffPersona {
  email: string; name: string; dob: string;
  kind: "coach" | "org_owner" | "parent" | "scout";
  parentOf?: string; // persona key of the athlete this parent runs
}
function staffPersonas(): Record<string, StaffPersona> {
  return {
    democoach: {
      email: "hammersmodality+democoach@gmail.com", name: "Demo — Coach", dob: "1985-03-15", kind: "coach",
    },
    demoorg: {
      email: "hammersmodality+demoorg@gmail.com", name: "Demo — Org Owner", dob: "1980-01-20", kind: "org_owner",
    },
    demoscout: {
      email: "hammersmodality+demoscout@gmail.com", name: "Demo — Scout", dob: "1979-09-09", kind: "scout",
    },
    demoparent: {
      email: "hammersmodality+demoparent@gmail.com", name: "Demo — Parent", dob: "1982-07-04", kind: "parent", parentOf: "demo13",
    },
  };
}

async function seedStaff(admin: any, id: string, sp: StaffPersona) {
  await admin.from("profiles").update({
    full_name: sp.name, date_of_birth: sp.dob, is_system_account: true,
  }).eq("id", id);
  await admin.from("user_roles").upsert(
    { user_id: id, role: "player" }, { onConflict: "user_id,role", ignoreDuplicates: true },
  );
  if (sp.kind === "coach") {
    await admin.from("user_roles").upsert(
      { user_id: id, role: "coach" }, { onConflict: "user_id,role", ignoreDuplicates: true },
    );
  }
  if (sp.kind === "scout") {
    await admin.from("user_roles").upsert(
      { user_id: id, role: "scout", status: "active" }, { onConflict: "user_id,role", ignoreDuplicates: true },
    );
  }
  if (sp.kind === "org_owner") {
    await admin.from("user_roles").upsert(
      { user_id: id, role: "coach" }, { onConflict: "user_id,role", ignoreDuplicates: true },
    );
    const { data: org } = await admin.from("organizations").select("id").eq("owner_user_id", id).maybeSingle();
    let orgId = org?.id;
    if (!orgId) {
      const { data: created, error } = await admin.from("organizations").insert({
        name: "Demo Organization", sport: "baseball", org_type: "travel", owner_user_id: id,
        verified: false, verification_status: "unsubmitted", is_solo: false,
      }).select("id").single();
      if (error) throw new Error("org: " + error.message);
      orgId = created.id;
    }
    await admin.from("organization_members").upsert(
      { organization_id: orgId, user_id: id, role_in_org: "owner", status: "active" },
      { onConflict: "organization_id,user_id", ignoreDuplicates: true },
    );
  }
  if (sp.kind === "parent" && sp.parentOf) {
    const athleteEmail = personas()[sp.parentOf]?.email;
    if (athleteEmail) {
      const athleteId = await findUser(admin, athleteEmail);
      if (athleteId) {
        const { data: link } = await admin.from("parent_athlete_links").select("id")
          .eq("parent_user_id", id).eq("athlete_user_id", athleteId).maybeSingle();
        if (!link) {
          await admin.from("parent_athlete_links").insert({
            parent_user_id: id, athlete_user_id: athleteId, relationship: "parent",
            status: "active", accepted_at: new Date().toISOString(),
          });
        }
      }
    }
  }
}
const TEST_PITCHER = "test-pitcher-14@hammersmodality.test";

async function findUser(admin: any, email: string): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const hit = data?.users?.find((x: any) => x.email === email);
    if (hit) return hit.id;
    if (!data?.users?.length || data.users.length < 1000) break;
  }
  return null;
}

async function seed(admin: any, id: string, p: Persona, ownerId: string) {
  const t = TODAY();
  const positions = [p.position, ...(p.secondary ? [p.secondary] : [])];
  await admin.from("profiles").update({
    full_name: p.name, date_of_birth: p.dob, position: p.position, positions, is_system_account: true,
    is_professional: !!p.professional, primary_throwing_hand: "R", primary_batting_side: "R",
  }).eq("id", id);
  await admin.from("athlete_mpi_settings").upsert({
    user_id: id, sport: p.sport, date_of_birth: p.dob, primary_position: p.position, secondary_position: p.secondary ?? null,
    primary_throwing_hand: "R", primary_batting_side: "R", league_tier: "rec", season_status: p.season, season_status_manual: false,
    in_season_start_date: p.inStart, in_season_end_date: p.inEnd, admin_ranking_excluded: true, ranking_eligible: false,
  }, { onConflict: "user_id" });
  await admin.from("athlete_context").upsert({
    user_id: id, sport_primary: p.sport, position_primary: p.position, position_secondary: p.secondary ? [p.secondary] : [],
    competition_level: p.level, throws_hand: "R", bats_hand: "R", season_phase: p.season === "in_season" ? "in" : "off",
  }, { onConflict: "user_id" });
  const period = new Date(Date.now() + 365 * 86400000).toISOString();
  const { data: sub } = await admin.from("subscriptions").select("id").eq("user_id", id).maybeSingle();
  const subRow = { plan: "free", status: "active", tier: p.tier, subscribed_modules: MODULES[p.tier][p.sport], current_period_end: period };
  if (sub) await admin.from("subscriptions").update(subRow).eq("user_id", id);
  else await admin.from("subscriptions").insert({ user_id: id, ...subRow });

  // Schedule + history: insert only what isn't there yet (idempotent, no deletes).
  const { data: have } = await admin.from("calendar_events").select("event_date,event_type").eq("user_id", id).is("deleted_at", null);
  const haveKey = new Set((have ?? []).map((h: any) => `${h.event_date}:${h.event_type}`));
  const evs = p.events.map((e) => ({ user_id: id, event_date: add(t, e.d), event_type: e.type, title: e.title, all_day: true, sport: p.sport }))
    .filter((e) => !haveKey.has(`${e.event_date}:${e.event_type}`));
  if (evs.length) await admin.from("calendar_events").insert(evs);
  if (p.arm.length) {
    await admin.from("arm_ledger_entries").upsert(
      p.arm.map((a) => ({ user_id: id, entry_date: add(t, a.d), throw_type: a.type, count: a.count, source: a.source, status: "done" })),
      { onConflict: "user_id,entry_date,throw_type", ignoreDuplicates: true },
    );
  }
  for (const tl of p.timeline ?? []) {
    const s = add(t, tl.s);
    const { data: ex } = await admin.from("schedule_timeline_entries").select("id").eq("user_id", id).eq("tag", tl.tag).eq("start_date", s).is("undone_at", null).maybeSingle();
    if (!ex) await admin.from("schedule_timeline_entries").insert({ user_id: id, tag: tl.tag, start_date: s, end_date: add(t, tl.e), summary: tl.summary, source: "inbox", payload: { demo: true } });
  }
  for (const h of p.heights ?? []) {
    const d = add(t, h.d);
    const { data: ex } = await admin.from("athlete_height_checks").select("id").eq("user_id", id).eq("measured_on", d).maybeSingle();
    if (!ex) await admin.from("athlete_height_checks").insert({ user_id: id, measured_on: d, inches: h.in, source: "demo_seed" });
  }
  if (p.equipment?.length) {
    const { data: gear } = await admin.from("athlete_equipment_context").select("id").eq("user_id", id).eq("scope", "persistent").limit(1);
    if (!gear?.length) await admin.from("athlete_equipment_context").insert({ user_id: id, scope: "persistent", equipment: p.equipment, source: "onboarding_self_report" });
  }
  // Owner staff access so Staff View and its PDF export work for every demo athlete.
  await admin.from("wk_staff_access").upsert(
    { staff_user_id: ownerId, athlete_user_id: id, granted_by: id, label: "Investor demo", revoked_at: null },
    { onConflict: "staff_user_id,athlete_user_id" },
  );
}

/** TEST-only starting answers, filled only where the player has none yet (never overwrites). */
async function seedStartingInputs(admin: any, id: string, p: Persona) {
  const pitcherOnly = p.tier === "pitcher";
  const order = pitcherOnly ? ["pitching", "fielding", "power", "speed"] : p.tier === "golden2way"
    ? ["pitching", "hitting", "fielding", "power", "speed", "throwing"] : ["hitting", "fielding", "speed", "power", "throwing"];
  const adult = p.dob <= "2007-01-01";
  const { data: c } = await admin.from("athlete_context").select("category_goals,weekly_availability_days,anthropometrics,sleep_target_hrs,lifting_age_years").eq("user_id", id).maybeSingle();
  const upd: Record<string, unknown> = {};
  const cg = c?.category_goals;
  if (!cg || !Array.isArray(cg.categoryOrder) || !cg.categoryOrder.length) upd.category_goals = { ...(cg ?? {}), version: 2, categoryOrder: order, updatedAt: new Date().toISOString() };
  if (typeof c?.weekly_availability_days !== "number") upd.weekly_availability_days = 6;
  const an = c?.anthropometrics ?? {};
  if (typeof an.height_in !== "number" || typeof an.weight_lb !== "number") upd.anthropometrics = { ...an, height_in: an.height_in ?? (p.sport === "softball" ? 66 : 71), weight_lb: an.weight_lb ?? (p.sport === "softball" ? 145 : (adult ? 195 : 170)) };
  if (typeof c?.sleep_target_hrs !== "number") upd.sleep_target_hrs = 8.5;
  if (typeof c?.lifting_age_years !== "number") upd.lifting_age_years = adult ? 4 : 2;
  if (Object.keys(upd).length) await admin.from("athlete_context").update(upd).eq("user_id", id);
  const { data: gear } = await admin.from("athlete_equipment_context").select("id").eq("user_id", id).eq("scope", "persistent").limit(1);
  if (!gear?.length) await admin.from("athlete_equipment_context").insert({ user_id: id, scope: "persistent", source: "onboarding_self_report",
    equipment: ["partner", "bat", "baseballs", "ball", "net", "tee", "glove", "barbell", "plates", "squat_rack", "bench", "dumbbells", "bands", "open_space", "field", "foam_roller", "mound"] });
  const { data: a } = await admin.from("initial_assessments").select("completed_at,initial_input_answers").eq("user_id", id).maybeSingle();
  const answers = { ...(a?.initial_input_answers ?? {}), season_dates_reviewed: true };
  if (!a) await admin.from("initial_assessments").insert({ user_id: id, completed_at: new Date().toISOString(), initial_input_answers: answers, recorded_by_label: "TEST seed" });
  else if (!a.completed_at || !a.initial_input_answers?.season_dates_reviewed) await admin.from("initial_assessments").update({ completed_at: a.completed_at ?? new Date().toISOString(), initial_input_answers: answers }).eq("user_id", id);
  const { data: n } = await admin.from("vault_nutrition_goals").select("id").eq("user_id", id).maybeSingle();
  if (!n) await admin.from("vault_nutrition_goals").insert({ user_id: id, calorie_goal: adult ? 3000 : 2700, protein_goal: 150, carbs_goal: 350, fats_goal: 85, hydration_goal: 100 });
  const { data: h } = await admin.from("physio_health_profiles").select("id,setup_completed").eq("user_id", id).maybeSingle();
  if (!h) await admin.from("physio_health_profiles").insert({ user_id: id, setup_completed: true, injury_history: [], medical_conditions: [], allergies: [], medications: [] });
  else if (!h.setup_completed) await admin.from("physio_health_profiles").update({ setup_completed: true }).eq("user_id", id);
}

async function oneTimeSession(admin: any, url: string, email: string) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(error.message);
  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
  const { data: v, error: ve } = await anon.auth.verifyOtp({ type: "magiclink", token_hash: data.properties.hashed_token });
  if (ve || !v.session) throw new Error(ve?.message ?? "session failed");
  return v.session;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing Authorization" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const { data: isOwner } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "owner" });
    if (!isOwner) return json({ error: "Owner only" }, 403);

    const body = await req.json().catch(() => ({}));
    // Item 18 proof: one named, pristine TEST identity. Never refresh/reset it,
    // seed answers, start flags, assessments, measurements or training history.
    const fresh = freshPersona(body?.persona);
    if (fresh) {
      const email = fresh.email;
      const existing = await findUser(admin, email);
      if (existing) {
        const { data: profile } = await admin.from('profiles').select('is_system_account').eq('id', existing).single();
        if (profile?.is_system_account !== true || body?.session_only !== true) return json({ error: 'Existing TEST identity is not reset; use session_only.' }, 409);
        if (body?.initialize_entitlement === true) {
          const { data: subscription, error: readError } = await admin.from('subscriptions').select('id,tier,subscribed_modules').eq('user_id',existing).single();
          if (readError || subscription?.tier || subscription?.subscribed_modules?.length) return json({ error: 'Refusing to replace an existing entitlement.' },409);
          const { error: grantError } = await admin.from('subscriptions').update({ tier:'5tool', subscribed_modules:MODULES['5tool'].baseball, status:'active', current_period_end:new Date(Date.now()+365*86400000).toISOString() }).eq('id',subscription.id);
          if (grantError) return json({ error:grantError.message },500);
        }
      } else {
        const { data: created, error } = await admin.auth.admin.createUser({ email, password: crypto.randomUUID() + 'Aa1!', email_confirm: true, user_metadata: { full_name: fresh.name, test_account: true } });
        if (error || !created.user) return json({ error: error?.message ?? 'Could not create TEST account' }, 500);
        const id = created.user.id;
        const { error: markError } = await admin.from('profiles').update({ is_system_account: true }).eq('id', id);
        if (markError) return json({ error: markError.message }, 500);
        const { error: subscriptionError } = await admin.from('subscriptions').upsert({ user_id: id, plan: 'free', status: 'active', tier: '5tool', subscribed_modules: MODULES['5tool'].baseball, current_period_end: new Date(Date.now() + 365 * 86400000).toISOString() },{onConflict:'user_id'});
        if (subscriptionError) return json({ error: subscriptionError.message }, 500);
      }
      const session = await oneTimeSession(admin, url, email);
      return json({ ...session, created: !existing });
    }
    const all = personas();
    const staff = staffPersonas();
    if (body?.list) return json({
      personas: Object.fromEntries(Object.entries(all).map(([k, p]) => [k, p.email])),
      staff: Object.fromEntries(Object.entries(staff).map(([k, p]) => [k, p.email])),
      test_pitcher: TEST_PITCHER,
    });

    const key: string | null = typeof body?.persona === "string" ? body.persona : null;
    const p = key ? all[key] : null;
    const sp = key ? staff[key] : null;
    if (key && !p && !sp) return json({ error: "Unknown persona — allowlist only" }, 400);
    if (sp && body?.generate) return json({ error: "Staff personas have no training plan" }, 400);
    const email = p ? p.email : sp ? sp.email : TEST_PITCHER;

    let id = await findUser(admin, email);
    const created = !id;
    if (!id) {
      const { data, error } = await admin.auth.admin.createUser({
        email, password: crypto.randomUUID() + "Aa1!", email_confirm: true,
        user_metadata: { full_name: p?.name ?? sp?.name ?? "Test Pitcher (14)", test_account: true, demo_account: !!(p || sp) },
      });
      if (error) return json({ error: error.message }, 500);
      id = data.user!.id;
    }
    // Never act on an existing account that isn't already a system account.
    if (!created) {
      const { data: prof } = await admin.from("profiles").select("is_system_account").eq("id", id).maybeSingle();
      if (prof?.is_system_account !== true) return json({ error: "Refusing: existing non-system account" }, 409);
    }
    // Read-only proof access to an existing TEST account must not reseed its
    // settings, subscription, games, equipment or training history.
    if (body?.session_only === true && !created) {
      const s = await oneTimeSession(admin, url, email);
      return json({ user_id: id, email, access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at, token_type: s.token_type, user: s.user });
    }
    // Certification builds reuse the saved seed: reseeding later would shift dated games.
    if (p && !(body?.skip_seed === true && !created)) await seed(admin, id!, p, u.user.id);
    if (p && body?.prepare === true) {
      await seedStartingInputs(admin, id!, p);
      const s0 = await oneTimeSession(admin, url, email);
      const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${s0.access_token}` } }, auth: { persistSession: false } });
      const { data: missing } = await anon.rpc("initial_plan_missing", { p_user: id });
      const { data: started, error: startErr } = await anon.rpc("start_hammers_today");
      return json({ user_id: id, email, missing, started, start_error: startErr?.message ?? null });
    }
    if (sp) await seedStaff(admin, id!, sp);

    if (body?.session) {
      const s = await oneTimeSession(admin, url, email);
      return json({ user_id: id, email, access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at, token_type: s.token_type, user: s.user });
    }
    if (!body?.generate) return json({ user_id: id, email });

    const planDate = typeof body.plan_date === "string" ? body.plan_date : TODAY();
    // Phase plan first (writes only the phase tables), then the real card builder.
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ph = await fetch(`${url}/functions/v1/adaptive-phases-shadow`, {
      method: "POST", headers: { Authorization: `Bearer ${svc}`, apikey: svc, "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: id, today: planDate }),
    });
    const phase = await ph.json().catch(() => null);
    const s = await oneTimeSession(admin, url, email);
    const r = await fetch(`${url}/functions/v1/wk-generate-daily`, {
      method: "POST",
      headers: { Authorization: `Bearer ${s.access_token}`, apikey: Deno.env.get("SUPABASE_ANON_KEY")!, "Content-Type": "application/json" },
      body: JSON.stringify({ plan_date: planDate }),
    });
    return json({ user_id: id, email, phase_status: ph.status, phase: phase?.plan ?? phase, status: r.status, result: await r.json().catch(() => null) });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
