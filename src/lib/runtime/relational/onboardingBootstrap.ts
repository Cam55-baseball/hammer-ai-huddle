/**
 * Phase A §4 — Production relational onboarding bootstrap.
 *
 * Emits a minimal, constitutionally-legal set of relational events when an
 * authenticated athlete first reaches the onboarding flow. Honors:
 *
 *   • additive-only, canonical emitAsbEvent path (via emitAgeObserved)
 *   • deterministic idempotency: same user + same source DOB → same key
 *   • no fabricated psych state (no inferred-confidence emission at bootstrap)
 *   • missingness explicit: when DOB is absent we emit NOTHING for
 *     developmental — developmentalState.current_stage remains null and the
 *     gating layer defaults to its safest envelope.
 *   • no relationship.* emission until RR-4 is formally sealed.
 */
import { emitAgeObserved, type RelationalEmitContext } from "./emit";
import type { User } from "@supabase/supabase-js";

interface BootstrapResult {
  emitted: string[];
  skipped: { topic: string; reason: string }[];
}

/**
 * Best-effort DOB read.
 *
 * Resolution order (canonical-source-first):
 *   1. `opts.profileDob` — passed in from `profiles.date_of_birth` (canonical
 *      source where production athletes store DOB).
 *   2. `user_metadata.dob` / `date_of_birth` — legacy / signup-metadata path.
 *
 * Returns `YYYY-MM-DD` or null.
 */
function readDob(user: User, profileDob: string | null | undefined): string | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidates: Array<string | null | undefined> = [
    profileDob,
    meta.dob as string | undefined,
    meta.date_of_birth as string | undefined,
  ];
  for (const raw of candidates) {
    if (!raw || typeof raw !== "string") continue;
    const t = Date.parse(raw);
    if (Number.isNaN(t)) continue;
    return new Date(t).toISOString().slice(0, 10);
  }
  return null;
}


function ageFromDob(dobISO: string, nowISO: string): number {
  const dob = new Date(dobISO);
  const now = new Date(nowISO);
  let years = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) years--;
  return years;
}

/**
 * Idempotent: emits at most once per (user, source DOB). Re-runs are no-ops
 * via the canonical idempotency_key path (sha256 over athlete+topic+occurred_at+payload).
 *
 * `opts.profileDob` should be passed from `profiles.date_of_birth` whenever
 * available — it is the canonical production source for DOB.
 */
export async function emitOnboardingBootstrap(
  user: User,
  opts: { profileDob?: string | null } = {},
  nowISO: string = new Date().toISOString(),
): Promise<BootstrapResult> {
  const result: BootstrapResult = { emitted: [], skipped: [] };
  const dob = readDob(user, opts.profileDob ?? null);


  if (!dob) {
    result.skipped.push({
      topic: "relational.developmental.age_observed",
      reason: "dob_missing — explicit missingness preserved per Phase 151",
    });
    return result;
  }

  const ctx: RelationalEmitContext = {
    athleteId: user.id,
    actorId: user.id,
    actorRole: "athlete",
    // Pin occurred_at to DOB-derived anchor (not wall-clock) so idempotency
    // key collapses repeated bootstrap visits to a single canonical event.
    occurredAt: `${dob}T00:00:00.000Z`,
  };

  await emitAgeObserved(ctx, {
    visibility_scope: "self",
    confidence: 1.0,
    missingness: { fields: [], reason: "not_observed" },
    authority: "self",
    lineage_parent_ids: [],
    chronological_age_years: ageFromDob(dob, nowISO),
    source: "self",
  });
  result.emitted.push("relational.developmental.age_observed");
  return result;
}
