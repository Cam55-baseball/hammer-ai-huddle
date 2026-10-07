/**
 * ONE SYSTEM, ONE PHASE (owner 2026-10-07): every phase reader must agree with
 * the server resolver (`_shared/wkPhaseQuarter.ts` resolveWkPhase) for the same
 * settings and the same calendar day.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveWkPhase as serverWk } from "../../supabase/functions/_shared/wkPhaseQuarter";
import { resolveSeasonPhase as serverSeason } from "../../supabase/functions/_shared/seasonPhase";
import { resolveWkPhase as clientWk } from "@/lib/hammer/workout/phaseQuarter";
import { resolveSeasonPhase as clientSeason } from "@/lib/seasonPhase";
import { phaseFrom } from "../../supabase/functions/_shared/wic/schedule/tissueCost/shadow/adapter";

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const add = (s: string, n: number) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const STATUSES = [null, "", "in", "in_season", "In Season", "pre", "preseason", "post", "post_season", "off", "off_season", "offseason"];
const TISSUE: Record<string, string> = { in_season: "in_season", post_season: "post_season", preseason: "pre_season", off_season: "offseason" };

function settings(r: () => number, base: string) {
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const has = r() < 0.75;
  const pre = add(base, Math.floor(r() * 200) - 100);
  const ins = add(pre, 20 + Math.floor(r() * 40));
  const post = add(ins, 60 + Math.floor(r() * 100));
  return {
    season_status: pick(STATUSES),
    season_status_manual: r() < 0.2,
    preseason_start_date: has ? pre : null,
    preseason_end_date: has ? add(ins, -1) : null,
    in_season_start_date: has ? ins : null,
    in_season_end_date: has ? add(post, -1) : null,
    post_season_start_date: has ? post : null,
    post_season_end_date: has ? add(post, 30) : null,
  } as any;
}

afterEach(() => vi.useRealTimers());

describe("ONE SYSTEM, ONE PHASE", () => {
  it("app, server and tissue-load readers give the same phase — 0 mismatches", () => {
    const r = rng(20261007);
    const mism: string[] = [];
    let n = 0;
    for (let k = 0; k < 4000; k++) {
      const day = add("2026-01-01", Math.floor(r() * 730));
      const s = settings(r, day);
      // The app runs "today" on the athlete's own calendar day.
      vi.useFakeTimers(); vi.setSystemTime(new Date(day + "T12:00:00"));
      const sv = serverWk(s, new Date(day + "T12:00:00Z"), day);
      const cv = clientWk(s, new Date(day + "T12:00:00"), day as any);
      const ss = serverSeason(s, day).phase;
      const cs = clientSeason(s, day).phase;
      const tc = phaseFrom(s, null, day);
      vi.useRealTimers();
      n++;
      if (sv.phase !== cv.phase && mism.length < 10) mism.push(`wk ${day} ${JSON.stringify(s)} server=${sv.phase} app=${cv.phase}`);
      if (ss !== cs && mism.length < 10) mism.push(`season ${day} server=${ss} app=${cs}`);
      if (TISSUE[ss] !== tc && mism.length < 10) mism.push(`tissue ${day} ${JSON.stringify(s)} server=${ss} tissue=${tc}`);
    }
    expect(n).toBe(4000);
    expect(mism).toEqual([]);
  });
});
