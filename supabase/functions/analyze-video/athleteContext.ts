/**
 * The athlete's own data for the written analysis (owner P0, Oct 28).
 *
 * Self-only: every read is keyed to the verified caller, so no recruiting gate
 * applies. Each line names where it came from, so the report can keep what the
 * clip shows ("observed") apart from what the athlete's data suggests
 * ("inferred"). Missing data is said to be missing, never guessed. A failed
 * read never blocks or delays the report.
 */
import { resolveSeasonPhase } from "../_shared/seasonPhase.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

export interface AthleteFacts {
  ageYears: number | null;
  level: string | null;
  positions: string[];
  trainingAgeYears: number | null;
  season: string | null;
  goals: string | null;
  latestTest: { date: string; type: string; results: string } | null;
  readiness: { date: string; physical: number | null; recovery: number | null; sleepHours: number | null; painScale: number | null } | null;
  workload7d: { sessions: number; sets: number } | null;
  savedAnalyses: number;
}

const SEASON_WORDS: Record<string, string> = {
  preseason: "preseason", in_season: "in season", post_season: "post-season", off_season: "off-season",
};

function ageFrom(dob: string | null | undefined, now = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  return age >= 5 && age <= 80 ? age : null;
}

function compactResults(results: unknown): string {
  if (!results || typeof results !== "object") return "";
  return Object.entries(results as Record<string, unknown>)
    .filter(([, v]) => typeof v === "number" || (typeof v === "string" && v.trim().length > 0 && v.length < 40))
    .slice(0, 8)
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
    .join("; ");
}

/** Reads the athlete's own facts. Every read is optional and bounded. */
export async function loadAthleteFacts(db: Db, userId: string, sport: string, savedAnalyses: number): Promise<AthleteFacts> {
  const safe = async <T>(p: Promise<{ data: T | null }>): Promise<T | null> => {
    try { return (await p).data ?? null; } catch { return null; }
  };
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
  const [profile, settings, test, quiz, logs] = await Promise.all([
    safe(db.from("profiles").select("date_of_birth,experience_level,position,positions,training_age_years").eq("id", userId).maybeSingle()),
    safe(db.from("athlete_mpi_settings").select("season_status,season_status_manual,preseason_start_date,preseason_end_date,in_season_start_date,in_season_end_date,post_season_start_date,post_season_end_date,league_tier").eq("user_id", userId).eq("sport", sport).maybeSingle()),
    safe(db.from("vault_performance_tests").select("test_date,test_type,results,six_week_goals_text").eq("user_id", userId).eq("sport", sport).order("test_date", { ascending: false }).limit(1).maybeSingle()),
    safe(db.from("vault_focus_quizzes").select("entry_date,physical_readiness,perceived_recovery,hours_slept,pain_scale").eq("user_id", userId).gte("entry_date", threeDaysAgo).order("entry_date", { ascending: false }).limit(1).maybeSingle()),
    safe(db.from("wk_session_logs").select("plan_date,sets_completed").eq("user_id", userId).gte("plan_date", weekAgo).limit(500)),
  ]) as [any, any, any, any, any[] | null];

  const positions = Array.isArray(profile?.positions) && profile.positions.length
    ? profile.positions.map(String)
    : profile?.position ? [String(profile.position)] : [];
  const season = settings ? SEASON_WORDS[resolveSeasonPhase(settings).phase] ?? null : null;
  const workload = Array.isArray(logs)
    ? { sessions: new Set(logs.map((l) => l.plan_date)).size, sets: logs.reduce((n, l) => n + (Number(l.sets_completed) || 0), 0) }
    : null;
  return {
    ageYears: ageFrom(profile?.date_of_birth),
    level: (profile?.experience_level as string | null) ?? (settings?.league_tier as string | null) ?? null,
    positions,
    trainingAgeYears: profile?.training_age_years == null ? null : Number(profile.training_age_years),
    season,
    goals: typeof test?.six_week_goals_text === "string" && test.six_week_goals_text.trim() ? test.six_week_goals_text.trim().slice(0, 400) : null,
    latestTest: test ? { date: String(test.test_date), type: String(test.test_type ?? "test"), results: compactResults(test.results) } : null,
    readiness: quiz ? {
      date: String(quiz.entry_date),
      physical: quiz.physical_readiness == null ? null : Number(quiz.physical_readiness),
      recovery: quiz.perceived_recovery == null ? null : Number(quiz.perceived_recovery),
      sleepHours: quiz.hours_slept == null ? null : Number(quiz.hours_slept),
      painScale: quiz.pain_scale == null ? null : Number(quiz.pain_scale),
    } : null,
    workload7d: workload && workload.sessions > 0 ? workload : null,
    savedAnalyses,
  };
}

/** Prompt block. Pure, so it is tested without a database. */
export function athleteContextBlock(f: AthleteFacts): string {
  const line = (label: string, value: string | null) => `- ${label}: ${value ?? "not recorded"}`;
  const r = f.readiness;
  return `

=== THIS ATHLETE'S OWN DATA (for "connected_to_your_data" only) ===
${line("Age", f.ageYears == null ? null : `${f.ageYears}`)}
${line("Level", f.level)}
${line("Position(s)", f.positions.length ? f.positions.join(", ") : null)}
${line("Years training", f.trainingAgeYears == null ? null : `${f.trainingAgeYears}`)}
${line("Season right now", f.season)}
${line("Their goals (from their last test)", f.goals)}
${line("Last test", f.latestTest ? `${f.latestTest.type} on ${f.latestTest.date}${f.latestTest.results ? ` (${f.latestTest.results})` : ""}` : null)}
${line("Latest check-in (last 3 days)", r ? `${r.date}: body readiness ${r.physical ?? "not answered"}, recovery ${r.recovery ?? "not answered"}, sleep ${r.sleepHours ?? "not answered"} h, pain ${r.painScale ?? "not answered"}` : null)}
${line("Training this past week", f.workload7d ? `${f.workload7d.sessions} logged days, ${f.workload7d.sets} sets` : null)}
${line("Saved analyses before this one", `${f.savedAnalyses}`)}
RULES: Use these only to explain how a finding in THIS clip connects to the athlete. Name the data you used ("your last check-in", "your goal"). Never state a data item that says "not recorded". Never diagnose pain or injury; if pain is high, say to tell a coach or parent. Never prescribe a training load.
=== END ATHLETE DATA ===`;
}
