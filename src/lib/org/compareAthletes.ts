// Pure helpers for the organization "Compare players" view.
// Fair-comparison warnings only — never fabricates, never ranks without data.

export interface ComparedAthlete {
  athlete_id: string;
  name: string;
  primary_position: string | null;
  league_tier: string | null;
  date_of_birth: string | null;
  latest_test: { test_type: string; test_date: string } | null;
  test_count: number;
  latest_grade: {
    overall_grade: number | null;
    graded_at: string | null;
    grade_source: string | null;
  } | null;
  week_completion_pct: number | null;
  game_summary: { games: number; last_game: string | null } | null;
}

export function ageYears(dateOfBirth: string | null, today: Date = new Date()): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 100 ? age : null;
}

/** Plain-language warnings when the picked players are not a fair comparison. */
export function fairnessWarnings(athletes: ComparedAthlete[], today: Date = new Date()): string[] {
  const warnings: string[] = [];
  if (athletes.length < 2) return warnings;

  const positions = new Set(
    athletes.map((a) => (a.primary_position ?? "").trim().toLowerCase()).filter(Boolean),
  );
  if (positions.size > 1) {
    warnings.push("These players play different positions — their numbers measure different things.");
  }

  const tiers = new Set(
    athletes.map((a) => (a.league_tier ?? "").trim().toLowerCase()).filter(Boolean),
  );
  if (tiers.size > 1) {
    warnings.push("These players compete at different levels — compare with care.");
  }

  const ages = athletes
    .map((a) => ageYears(a.date_of_birth, today))
    .filter((a): a is number => a !== null);
  if (ages.length >= 2) {
    const gap = Math.max(...ages) - Math.min(...ages);
    if (gap >= 2) {
      warnings.push(`Age gap of ${gap} years — older players are often simply more developed.`);
    }
  }

  const thin = athletes.filter((a) => (a.test_count ?? 0) < 2);
  if (thin.length > 0) {
    warnings.push(
      `${thin.map((a) => a.name).join(", ")} ${thin.length === 1 ? "has" : "have"} fewer than 2 logged tests — not enough data yet for a fair comparison.`,
    );
  }

  return warnings;
}

/** Label for who entered a grade, shown next to every grade. */
export function gradeSourceLabel(source: string | null | undefined): string {
  const s = (source ?? "").toLowerCase();
  if (s === "self" || s === "athlete" || s === "player") return "Source: athlete-entered";
  if (s === "coach") return "Source: coach-entered";
  if (s === "scout") return "Source: scout-entered";
  if (s === "organization" || s === "org") return "Source: organization-entered";
  return "Source: not recorded";
}
