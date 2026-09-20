// Tissue Cost Scheduler v1 — plain-English reasons (§5 step 6).
// Pure string building. Never shows tank numbers or "science" to athletes.

import { type DaySchedule, type Tank, type TankLevels } from "./types.ts";

export interface ContributorInput {
  date: string;
  cost: TankLevels;
  day: DaySchedule;
}

export interface ReasonContext {
  today: string;
  bindingTank: Tank | null;
  contributions: ContributorInput[];
  floorsApplied: string[];
  nextHeavyDate: string | null;
  hardRule: string | null;
  loadPatternSignal: boolean;
}

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function weekdayName(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "that day";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return WEEKDAY[d.getUTCDay()] ?? "that day";
}

const HARD_RULE_TEXT: Record<string, string> = {
  game_today_pre: "Game day — the lift comes after the game, never before it.",
  tournament: "Tournament day — no lift today.",
  doubleheader: "Doubleheader today — no lift.",
  pitcher_start_day: "You're starting today — no lift.",
  pitcher_day_before_start: "You start tomorrow — today is primer only.",
  pain_blocks_loaded_work: "You flagged pain, so loaded work is off today.",
};

function countIn(contribs: ContributorInput[], days: number, today: string, pick: (d: DaySchedule) => number): number {
  let total = 0;
  const cutoff = Date.parse(`${today}T00:00:00Z`) - days * 86_400_000;
  for (const c of contribs) {
    if (Date.parse(`${c.date}T00:00:00Z`) < cutoff) continue;
    total += pick(c.day);
  }
  return total;
}

export function buildReasons(ctx: ReasonContext): string[] {
  const out: string[] = [];
  if (ctx.hardRule && HARD_RULE_TEXT[ctx.hardRule]) out.push(HARD_RULE_TEXT[ctx.hardRule]);

  const games = countIn(ctx.contributions, 7, ctx.today, (d) =>
    d.games ? Math.max(1, d.games.count ?? 1) : 0
  );
  const practiceMin = countIn(ctx.contributions, 7, ctx.today, (d) => Math.max(0, d.practiceMinutes ?? 0));
  const lifts = ctx.contributions.filter(
    (c) => c.day.lift && !c.day.lift.skipped && Date.parse(`${c.date}T00:00:00Z`) >= Date.parse(`${ctx.today}T00:00:00Z`) - 7 * 86_400_000,
  );
  const lastLift = [...ctx.contributions].reverse().find((c) => c.day.lift && !c.day.lift.skipped);

  if (out.length < 2 && ctx.floorsApplied.length > 0 && lastLift) {
    out.push(
      `Your last lift was ${weekdayName(lastLift.date)} — we keep full rest days between lifts.`,
    );
  }

  if (out.length < 2 && games >= 3) {
    out.push(`You played ${games} games this week — one more day before heavy work.`);
  }
  if (out.length < 2 && lifts.length >= 2) {
    out.push(`${lifts.length} lifts already this week — today stays lighter.`);
  }
  if (out.length < 2 && practiceMin >= 180) {
    out.push(`${Math.round(practiceMin / 60)} hours of practice this week — the legs need the day.`);
  }
  if (out.length < 2 && ctx.loadPatternSignal) {
    out.push("Load has been piling up — we dropped the level instead of skipping the day.");
  }
  if (out.length === 0) {
    out.push(
      ctx.nextHeavyDate && ctx.nextHeavyDate !== ctx.today
        ? `Next heavy day: ${weekdayName(ctx.nextHeavyDate)}.`
        : "You're rested — full send today.",
    );
  }
  return out.slice(0, 2);
}
