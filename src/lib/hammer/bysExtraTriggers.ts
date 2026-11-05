/**
 * Owner Nov 5 round 3 #4 + #5 — extra Before-you-start triggers.
 * Each item keeps its existing triggers; these only ADD reasons to show it.
 * Pure: facts in, personal "Because…" lines out. No facts → no extra reasons.
 *
 * Windows used (stated so the owner can check them):
 *  - game logs: games dated in the last 7 days
 *  - strikeout streak: 3+ strikeouts in a row across logged at-bats
 *  - clip age: 21+ days (3 weeks) since a clip of that skill
 *  - re-test: 56+ days (8 weeks) since the last test
 *  - season/pre-season start: the first 7 days after the saved start date
 *  - coach tags: notes tagged in the last 28 days
 */
import { TAG_ITEM, type IssueArea } from "./coachIssueTags";

export interface CoachTag { area: IssueArea; label: string | null; coachName: string; createdAt: string }
export interface GameFact { date: string; atBats: { result: string | null }[]; baserun: { event_type: string | null; success: boolean | null }[] }
export type ClipModule = "hitting" | "pitching" | "throwing";

export interface BysExtraFacts {
  today: string;
  coachTags: readonly CoachTag[];
  games: readonly GameFact[];
  lowReadinessToday: boolean;
  /** Late-swing findings from the player's own hitting clips. */
  lateSwingFaults: readonly string[];
  /** Issues that keep showing in logged games (game-log source, 2+ times). */
  gameTendencyFaults: readonly string[];
  prescribedModules: readonly ClipModule[];
  lastClipByModule: Partial<Record<ClipModule, string | null>>;
  recurringIssueLabels: readonly string[];
  lastTestDate: string | null;
  preseasonStart: string | null;
  inSeasonStart: string | null;
}

export type ExtraReasons = Record<string, string[]>;

const KS = new Set(["K", "K_swinging", "K_looking", "strikeout", "SO"]);
const day = (s: string) => Date.parse(`${s.slice(0, 10)}T12:00:00Z`);
const daysBetween = (from: string, to: string) => Math.round((day(to) - day(from)) / 86_400_000);
const words = (k: string) => k.replace(/^(bb|sb|th|fd)_/, "").replace(/_/g, " ");
const SKILL: Record<ClipModule, string> = { hitting: "hitting", pitching: "pitching", throwing: "throwing" };

export function bysExtraTriggers(f: BysExtraFacts): ExtraReasons {
  const out: ExtraReasons = {};
  const add = (id: string, because: string) => { (out[id] ??= []).includes(because) || out[id].push(because); };

  // #4 tagged coach notes, in the coach's words.
  for (const t of f.coachTags) {
    if (daysBetween(t.createdAt, f.today) > 28) continue;
    const what = t.label?.trim() || `${t.area} work`;
    add(TAG_ITEM[t.area], `${t.coachName} tagged "${what}" for you.`);
    if (t.area !== "throwing") add("recurring_videos", `${t.coachName} tagged "${what}" for you.`);
  }

  const recent = f.games.filter((g) => { const d = daysBetween(g.date, f.today); return d >= 0 && d <= 7; });
  const runs = recent.flatMap((g) => g.baserun);
  const failed = runs.filter((r) => r.success === false);
  const caught = failed.filter((r) => /steal/i.test(r.event_type ?? ""));
  if (failed.length) {
    add("mind_item", `your last games had ${failed.length === 1 ? "a base-running mistake" : `${failed.length} base-running mistakes`}.`);
    add("baserunning_study", caught.length
      ? `you were caught stealing ${caught.length === 1 ? "once" : `${caught.length} times`} in your last games.`
      : `you made ${failed.length === 1 ? "an out" : `${failed.length} outs`} on the bases in your last games.`);
  }
  if (f.lowReadinessToday) add("mind_item", "your check-in shows low readiness today, so a calm mind item helps.");

  // Timing: late swings in clips, or a strikeout streak in logged at-bats.
  let streak = 0, best = 0;
  for (const g of [...f.games].sort((a, b) => day(a.date) - day(b.date))) for (const ab of g.atBats) {
    streak = KS.has(String(ab.result ?? "")) ? streak + 1 : 0; best = Math.max(best, streak);
  }
  const lastAbsStreak = streak;
  if (f.lateSwingFaults.length) {
    const why = `your clips show ${words(f.lateSwingFaults[0])}.`;
    add("royal_timing", why); add("timing_study", why);
  }
  if (lastAbsStreak >= 3) {
    const why = `you struck out ${lastAbsStreak} times in a row in your logged at-bats.`;
    add("royal_timing", why); add("timing_study", why);
  }

  // Record-a-clip: 3+ weeks since a clip of a skill you do today, or a recurring issue to re-check.
  for (const m of f.prescribedModules) {
    const last = f.lastClipByModule[m];
    if (last && daysBetween(last, f.today) >= 21) add("analysis_prompts", `it's been ${Math.floor(daysBetween(last, f.today) / 7)} weeks since your last ${SKILL[m]} clip.`);
  }
  if (f.recurringIssueLabels.length) add("analysis_prompts", `a new clip re-checks ${words(f.recurringIssueLabels[0])}, which keeps showing up.`);

  for (const k of f.gameTendencyFaults) add("recurring_videos", `${words(k)} keeps showing up in your logged games.`);

  if (f.lastTestDate && daysBetween(f.lastTestDate, f.today) >= 56) add("testing_day", `your last test was ${Math.floor(daysBetween(f.lastTestDate, f.today) / 7)} weeks ago, so a re-test is due.`);
  const starting = (s: string | null) => !!s && daysBetween(s, f.today) >= 0 && daysBetween(s, f.today) < 7;
  if (starting(f.preseasonStart)) add("testing_day", "pre-season just started, a good time to test.");
  if (starting(f.inSeasonStart) || starting(f.preseasonStart)) add("competition_level", "a new season just started — check your playing level is still right.");
  void best;
  return out;
}

/** Where each extra card's button goes. */
export const EXTRA_LINK: Record<string, { title: string; to: string; cta: string }> = {
  mind_item: { title: "Mind item", to: "/mind-fuel", cta: "Open Mind" },
  royal_timing: { title: "Timing study", to: "/royal-timing", cta: "Open timing" },
  timing_study: { title: "Timing study", to: "/royal-timing", cta: "Open timing" },
  analysis_prompts: { title: "Record a clip", to: "/analyze/hitting", cta: "Record a clip" },
  baserunning_study: { title: "Base-running study", to: "/baserunning-iq/course", cta: "Open the course" },
  recurring_videos: { title: "Videos for your issue", to: "/video-library", cta: "Watch videos" },
  defensive_prep_video: { title: "Watch before defense", to: "/video-library", cta: "Watch videos" },
  testing_day: { title: "Testing", to: "/vault", cta: "Open tests" },
  competition_level: { title: "Your playing level", to: "/profile", cta: "Check my level" },
};
