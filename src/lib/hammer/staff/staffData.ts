// Staff View data shaping — pure functions over rows that were already stored.
// Nothing here recalculates a training decision.

export type Grant = {
  staff_user_id: string;
  athlete_user_id: string;
  revoked_at: string | null;
};

/** Athlete ids a staff member may open right now. */
export function visibleAthleteIds(grants: Grant[], staffUserId: string): string[] {
  return Array.from(
    new Set(
      grants
        .filter((g) => g.staff_user_id === staffUserId && !g.revoked_at)
        .map((g) => g.athlete_user_id),
    ),
  );
}

export function canOpenAthlete(grants: Grant[], staffUserId: string, athleteId: string): boolean {
  return visibleAthleteIds(grants, staffUserId).includes(athleteId);
}

export type PrescriptionRow = {
  plan_date: string;
  slot: string | null;
  movement_name: string | null;
  movement_slug: string | null;
  sets: number | null;
  reps: number | null;
  status: string | null;
};

export type BucketTotal = { bucket: string; sets: number; movements: number };

/** Weekly totals per bucket, from stored prescriptions plus a slug→bucket map. */
export function weeklyBucketTotals(
  rows: PrescriptionRow[],
  bucketBySlug: Record<string, string>,
): Record<string, BucketTotal[]> {
  const byWeek: Record<string, Record<string, BucketTotal>> = {};
  for (const r of rows) {
    const week = weekStart(r.plan_date);
    const bucket = bucketBySlug[r.movement_slug ?? ""] ?? "Other";
    const wk = (byWeek[week] ??= {});
    const cur = (wk[bucket] ??= { bucket, sets: 0, movements: 0 });
    cur.sets += Number(r.sets ?? 0);
    cur.movements += 1;
  }
  const out: Record<string, BucketTotal[]> = {};
  for (const [week, buckets] of Object.entries(byWeek)) {
    out[week] = Object.values(buckets).sort((a, b) => b.sets - a.sets);
  }
  return out;
}

/** Monday of the week containing an ISO date. */
export function weekStart(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export type TankLevels = Record<string, number>;

export type TankPoint = { date: string; tanks: TankLevels };

/** Tank trend: each tank's stored level per day, oldest first. */
export function tankTrend(
  decisions: Array<{ decision_date: string; tank_levels: unknown }>,
): TankPoint[] {
  return decisions
    .map((d) => ({
      date: d.decision_date,
      tanks: (d.tank_levels && typeof d.tank_levels === "object"
        ? (d.tank_levels as TankLevels)
        : {}) as TankLevels,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type ChangeEntry = { date: string; what: string; why: string };

/** Every change the app made, with the plain reason it stored alongside it. */
export function changeLog(
  decisions: Array<{
    decision_date: string;
    allowed_class: string | null;
    fallback_used: boolean | null;
    reasons: unknown;
    diagnostics: unknown;
  }>,
): ChangeEntry[] {
  const out: ChangeEntry[] = [];
  const sorted = [...decisions].sort((a, b) => a.decision_date.localeCompare(b.decision_date));
  let prevClass: string | null = null;
  for (const d of sorted) {
    const why = Array.isArray(d.reasons)
      ? (d.reasons as unknown[])
          .map((r) => (typeof r === "string" ? r : String((r as { text?: string })?.text ?? "")))
          .filter(Boolean)
          .join(" ")
      : "";
    if (prevClass !== null && d.allowed_class !== prevClass) {
      out.push({
        date: d.decision_date,
        what: `Day changed from ${classWord(prevClass)} to ${classWord(d.allowed_class)}`,
        why: why || "No reason stored.",
      });
    }
    if (d.fallback_used) {
      out.push({ date: d.decision_date, what: "Backup plan used", why: why || "The calculator could not finish." });
    }
    const trims = readTrims(d.diagnostics);
    for (const t of trims) out.push({ date: d.decision_date, what: "Volume trimmed", why: t });
    prevClass = d.allowed_class;
  }
  return out.reverse();
}

function readTrims(diagnostics: unknown): string[] {
  if (!diagnostics || typeof diagnostics !== "object") return [];
  const spike = (diagnostics as { load_spike?: { trims?: Array<{ sentence?: string }> } }).load_spike;
  if (!spike?.trims) return [];
  return spike.trims.map((t) => t.sentence ?? "").filter(Boolean);
}

export function classWord(c: string | null): string {
  if (c === "H") return "heavy";
  if (c === "M") return "moderate";
  if (c === "L") return "light";
  if (c === "none") return "recovery only";
  return c ?? "unknown";
}
