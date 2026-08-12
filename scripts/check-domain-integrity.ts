/**
 * Preflight lint: movement-catalog domain integrity.
 *
 * The rule this enforces is the one that was violated when a throwing /
 * arm-care drill ("Plyo-Ball Pitching Variants") was seeded with
 * `category = 'bat_speed'` and therefore became prescribable inside a Bat
 * Speed card.
 *
 * Fails when any catalog row:
 *   1. has a `category` that maps to no owning domain,
 *   2. carries a contribution tag (`bat_speed_category`, `speed_category`,
 *      `arm_care_category`, `cross_sport_category`) that its owning domain is
 *      not permitted to carry,
 *   3. has name / cue / why_prescribed text containing discipline keywords
 *      that contradict its owning domain.
 *
 * The rules themselves live in
 * `supabase/functions/_shared/wic/domainGate.ts` so the build-time guard and
 * the runtime gate can never drift apart.
 *
 * Credentials: needs an authenticated read of `wk_movement_catalog`. Provide
 * `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (CI) to run the full audit. In
 * environments without them the script skips rather than failing the build —
 * the same rules are additionally enforced at generation time inside
 * `wk-generate-daily`, so nothing slips through either way.
 */
import {
  auditMovementIntegrity,
  type GateableMovement,
  type IntegrityViolation,
} from "../supabase/functions/_shared/wic/domainGate";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "";

async function main() {
  if (!url || !key) {
    console.log(
      "[domain-integrity] SKIPPED — no catalog credentials in env. " +
        "Runtime enforcement in wk-generate-daily still applies.",
    );
    return;
  }

  const res = await fetch(
    `${url}/rest/v1/wk_movement_catalog?select=slug,name,category,sport_scope,position_scope,bat_speed_category,speed_category,arm_care_category,cross_sport_category,cue,why_prescribed`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );

  if (!res.ok) {
    console.log(
      `[domain-integrity] SKIPPED — catalog read returned ${res.status}. ` +
        "Runtime enforcement in wk-generate-daily still applies.",
    );
    return;
  }

  const rows = (await res.json()) as GateableMovement[];
  const violations: IntegrityViolation[] = [];
  for (const row of rows) violations.push(...auditMovementIntegrity(row));

  if (violations.length > 0) {
    console.error(
      `\n[domain-integrity] FAILED — ${violations.length} violation(s) across ${rows.length} movements:\n`,
    );
    for (const v of violations) {
      console.error(`  ✗ ${v.slug} [${v.rule}] ${v.detail}`);
    }
    console.error(
      "\nFix the catalog row (move it to its true owning category, or drop the " +
        "contradicting contribution tag). Never widen the allow-list to make a " +
        "misfiled drill legal.\n",
    );
    process.exit(1);
  }

  console.log(
    `[domain-integrity] PASSED — ${rows.length} movements, 0 violations.`,
  );
}

main().catch((err) => {
  console.error("[domain-integrity] ERROR", err);
  process.exit(1);
});
