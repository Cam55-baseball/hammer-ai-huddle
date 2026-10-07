import { describe, it, expect } from "vitest";
import { planWindmillSession, WINDMILL_LIBRARY } from "../../../supabase/functions/_shared/wic/pitching/windmillProgram";

const PHASES = ["os_q1", "os_q2", "os_q3", "os_q4", "pre_season", "in_season", "post_season"];
const iso = (base: number, d: number) => new Date((base + d) * 86_400_000).toISOString().slice(0, 10);
function rng(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; }; }

describe("windmill program v1 — 8-week stress test", () => {
  it("holds every rule across ages, phases, readiness, growth, pain and schedules", () => {
    const base = Math.round(Date.parse("2026-11-02T00:00:00Z") / 86_400_000);
    const minAge = new Map(WINDMILL_LIBRARY.map((d) => [d.slug, d.minAge]));
    let sessions = 0, pitchDays = 0; const violations: string[] = [];
    for (let age = 8; age <= 22; age++) for (const phase of PHASES) for (const growth of [false, true]) for (let seed = 1; seed <= 12; seed++) {
      const r = rng(seed * 97 + age * 7 + PHASES.indexOf(phase));
      const history: { date: string; pitches: number; innings: number }[] = [];
      const games = new Set<number>();
      if (phase === "in_season" || phase === "pre_season") for (let d = 0; d < 56; d++) if (r() < (seed % 3 === 0 ? 0.45 : 0.25)) games.add(d); // incl. tournament-heavy runs
      for (let d = 0; d < 56; d++) {
        const date = iso(base, d);
        const pain = r() < 0.04; const readiness = r() < 0.1 ? 30 : r() < 0.2 ? 50 : 80;
        const gameToday = games.has(d);
        const week = Math.floor(d / 7); const weekStart = week * 7;
        const prior = history.filter((h) => { const k = Math.round(Date.parse(h.date) / 86_400_000) - base; return k >= weekStart && k < d && h.pitches >= 20 && !games.has(k); }).length;
        const yesterday = history.find((h) => h.date === iso(base, d - 1));
        let todaySoFar = 0;
        if (gameToday) todaySoFar = Math.round(40 + r() * 60);
        const s = planWindmillSession({
          planDate: date, phase, age, growthMode: growth, readiness, armPain: pain, history: history.slice(-14),
          todayPitchesSoFar: todaySoFar, gameToday, gameTomorrow: games.has(d + 1), priorFullSessionsThisWeek: prior,
          fullSessionYesterday: !!yesterday && yesterday.pitches >= 20 && !games.has(d - 1), equipment: r() < 0.3 ? [] : null,
        });
        sessions++;
        const total = todaySoFar + s.fullPitches;
        const tag = `${age}/${phase}/${growth}/${seed}/d${d}`;
        if (total > 140) violations.push(`${tag} day over 140`);
        if (s.rows.some((x) => (minAge.get(x.slug) ?? 99) > age)) violations.push(`${tag} under age`);
        if (age < 13 && s.rows.some((x) => x.kind === "resisted")) violations.push(`${tag} resisted u13`);
        if (/weighted|plyo/.test(s.rows.map((x) => x.slug).join())) violations.push(`${tag} weighted ball`);
        if ((pain || gameToday || phase === "post_season" || readiness < 40) && s.rows.length) violations.push(`${tag} session when blocked`);
        if (s.rows.length && !phase.startsWith("os_") && s.type === "drills") { /* fine */ }
        if (phase.startsWith("os_") && s.fullPitches > 0 && s.type !== "sharpen" && (prior >= 3)) violations.push(`${tag} >3 full days`);
        if (growth && (phase === "os_q1" || phase === "os_q2") && s.fullPitches > 0 && s.type !== "sharpen") violations.push(`${tag} growth full`);
        const pitches = total + Math.round(s.drillThrows * 0.25);
        history.push({ date, pitches: s.fullPitches || gameToday ? pitches : 0, innings: gameToday ? Math.ceil(todaySoFar / 15) : 0 });
        if (pitches > 0 && (s.fullPitches || gameToday)) pitchDays++;
        // never 4 pitching days in a row from the program's side
        const last4 = [0, 1, 2, 3].map((k) => history[history.length - 1 - k]).filter(Boolean);
        if (last4.length === 4 && last4.every((h) => h.pitches > 0) && s.fullPitches > 0) violations.push(`${tag} 4 days in a row`);
      }
    }
    expect(violations.slice(0, 10)).toEqual([]);
    expect(sessions).toBeGreaterThan(50_000);
    expect(pitchDays).toBeGreaterThan(1000);
  });

  it("phase arc: drills only in os_q1, movement pitches in os_q3, none post-season", () => {
    const f = (phase: string, age = 16) => planWindmillSession({ planDate: "2026-11-04", phase, age, growthMode: false, readiness: 80, armPain: false, history: [], todayPitchesSoFar: 0, gameToday: false, gameTomorrow: false, priorFullSessionsThisWeek: 0, fullSessionYesterday: false, equipment: null });
    expect(f("os_q1").fullPitches).toBe(0);
    expect(f("os_q3").rows.some((r) => r.pitchType === "rise")).toBe(true);
    expect(f("os_q3", 12).rows.some((r) => r.pitchType === "rise")).toBe(false);
    expect(f("post_season").rows).toHaveLength(0);
  });
});
