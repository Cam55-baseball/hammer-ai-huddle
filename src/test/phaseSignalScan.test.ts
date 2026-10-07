/**
 * "No improper signaling" scan (owner rule 2026-10-07). For every simulated
 * player and day, every phase signal the plan, cards, labels, Key Rules,
 * season counter, goal gate, Power Primer, lighter-week rule, tissue-load
 * reader and AI context use must come from — and agree with — the one
 * resolver (_shared/phaseState.ts).
 */
import { describe, it, expect } from "vitest";
import { resolvePhaseState, phaseStatePrompt, SEASON_LABEL } from "../../supabase/functions/_shared/phaseState";
import { resolveWkPhase, isOffseasonPhase } from "../../supabase/functions/_shared/wkPhaseQuarter";
import { resolveSeasonPhase, getSeasonProfile, buildPhasePromptBlock } from "../../supabase/functions/_shared/seasonPhase";
import { isInSeasonPhase } from "../../supabase/functions/_shared/wic/lift/trendDeload";
import { phaseFrom } from "../../supabase/functions/_shared/wic/schedule/tissueCost/shadow/adapter";
import { resolveWkPhase as clientWk } from "@/lib/hammer/workout/phaseQuarter";
import { resolveSeasonPhase as clientSeason } from "@/lib/seasonPhase";
import { seasonDisplayLabel } from "@/lib/wic/seasonDisplay";

const add = (s: string, n: number) => new Date(Date.parse(s + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const TISSUE: Record<string, string> = { in_season: "in_season", post_season: "post_season", preseason: "pre_season", off_season: "offseason" };

type S = Record<string, any>;
const win = (pre: string, ins: string, post: string, end: string, status: string | null = null, manual = false): S => ({
  season_status: status, season_status_manual: manual,
  preseason_start_date: pre, preseason_end_date: add(ins, -1),
  in_season_start_date: ins, in_season_end_date: add(post, -1),
  post_season_start_date: post, post_season_end_date: end,
});

// Season shapes the owner named.
const SHAPES: Record<string, S[]> = {
  "162-game pro": [win("2026-02-14", "2026-03-26", "2026-09-29", "2026-10-31")],
  "sporadic year-round": [
    { season_status: "in" }, { season_status: "off" }, { season_status: null },
    win("2026-01-05", "2026-01-20", "2026-03-01", "2026-03-10"),
    win("2026-06-01", "2026-06-10", "2026-07-20", "2026-07-25", "off"),
  ],
  "school (HS spring)": [win("2026-01-26", "2026-03-02", "2026-05-18", "2026-06-06", "pre")],
  "school (fall ball)": [win("2026-08-17", "2026-09-07", "2026-11-02", "2026-11-20")],
  "softball college": [win("2026-01-10", "2026-02-06", "2026-05-10", "2026-06-10")],
  "softball AUSL-style": [win("2026-05-01", "2026-06-01", "2026-08-01", "2026-08-20")],
  "season ended early (manual)": [win("2026-02-14", "2026-03-26", "2026-09-29", "2026-10-31", "post_season", true)],
  "playoffs added": [win("2026-02-14", "2026-03-26", "2026-10-15", "2026-11-05")],
};

describe("phase signal scan — 0 mismatches", () => {
  it("every signal agrees with the one resolver, every day of 2026 (+ transition days, time zones)", () => {
    const mism: string[] = [];
    let checks = 0, days = 0;
    for (const [name, list] of Object.entries(SHAPES)) {
      for (const s of list) {
        const transitions = [s.preseason_start_date, s.in_season_start_date, s.post_season_start_date, s.post_season_end_date].filter(Boolean) as string[];
        const dates = new Set<string>();
        for (let d = 0; d < 366; d++) dates.add(add("2026-01-01", d));
        for (const t of transitions) for (const k of [-1, 0, 1]) dates.add(add(t, k));
        for (const date of dates) {
          for (const g of [{ heights: [] }, { heights: [{ date: add(date, -60), inches: 60 }, { date: add(date, -2), inches: 61.6 }] }]) {
            for (const lw of [{}, { plannedDeload: true }, { trendLighter: true }]) {
              days++;
              const ps = resolvePhaseState({ settings: s as any, date, ...g, ...lw });
              // Builder stamps ps on every card; phase-state returns it; cards/labels read it.
              const signals: Record<string, unknown> = {
                "builder season": resolveSeasonPhase(s as any, date).phase,
                "builder sub-block": resolveWkPhase(s as any, new Date(date + "T12:00:00Z"), date).phase,
                "app mirror sub-block": clientWk(s as any, new Date(date + "T12:00:00Z"), date).phase,
                "app mirror season": clientSeason(s as any, date).phase,
                "tissue-load": phaseFrom(s as any, null, date),
              };
              const want: Record<string, unknown> = {
                "builder season": ps.season, "builder sub-block": ps.sub_block,
                "app mirror sub-block": ps.sub_block, "app mirror season": ps.season,
                "tissue-load": TISSUE[ps.season],
              };
              for (const k of Object.keys(signals)) { checks++; if (signals[k] !== want[k]) mism.push(`${name} ${date} ${k}: ${signals[k]} vs ${want[k]}`); }
              // Goal gate (off-season only) and in-season lighter-week ban read the same sub-block.
              checks += 3;
              if (isOffseasonPhase(ps.sub_block as any) !== ps.sub_block.startsWith("os_")) mism.push(`${name} ${date} goal gate`);
              if (isInSeasonPhase(ps.sub_block) !== (ps.sub_block === "in_season" || ps.sub_block === "post_season")) mism.push(`${name} ${date} lighter-week in-season`);
              if (ps.sub_block === "in_season" && ps.season !== "in_season") mism.push(`${name} ${date} in-season badge on ${ps.season}`);
              // Labels: one vocabulary.
              checks += 3;
              if (SEASON_LABEL[ps.season] !== getSeasonProfile(ps.season).label) mism.push(`${name} ${date} season label`);
              if (!seasonDisplayLabel(ps.sub_block)) mism.push(`${name} ${date} card label`);
              const prompt = phaseStatePrompt(ps);
              if (!prompt.includes(ps.season_label) || !prompt.includes(ps.sub_block_label)) mism.push(`${name} ${date} AI context`);
              // AI coach's season block names the same season.
              checks++;
              if (!buildPhasePromptBlock(resolveSeasonPhase(s as any, date)).includes(getSeasonProfile(ps.season).label)) mism.push(`${name} ${date} AI season block`);
              // Lighter week / growth carried exactly.
              checks += 2;
              if (ps.lighter_week !== ((lw as any).plannedDeload ? "planned" : (lw as any).trendLighter ? "trend" : "none")) mism.push(`${name} ${date} lighter week`);
              if (ps.growth !== (g.heights.length > 0)) mism.push(`${name} ${date} growth`);
            }
          }
        }
      }
    }
    // Time zones: the athlete's own day is passed explicitly, so the server
    // and the app agree at 11:30 pm and 12:30 am in any zone.
    for (const tz of [-10, -8, -5, 0, 1, 9, 10]) {
      const s = SHAPES["162-game pro"][0];
      for (const t of ["2026-03-25", "2026-03-26", "2026-09-28", "2026-09-29"]) {
        const instant = new Date(Date.parse(`${t}T23:30:00Z`) - tz * 36e5);
        checks++;
        if (resolveWkPhase(s as any, instant, t).phase !== resolvePhaseState({ settings: s as any, date: t }).sub_block) mism.push(`tz ${tz} ${t}`);
      }
    }
    console.log(`phase signal scan: ${days} player-days, ${checks} checks, ${mism.length} mismatches`);
    expect(mism.slice(0, 10)).toEqual([]);
  });
});
