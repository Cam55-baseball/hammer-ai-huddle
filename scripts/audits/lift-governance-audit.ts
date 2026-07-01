// Phase 8 — Lift Governance Regression Evidence
// Run: `deno run --allow-net --allow-env scripts/audits/lift-governance-audit.ts`
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or reads from env). Writes
// a summary CSV to docs/audits/lift-governance-matrix.csv and prints PASS/FAIL.
//
// Evidence produced:
//   1. Catalog rows carrying gov_v1 metadata (%).
//   2. Recent prescriptions: duplicate slugs, duplicate categories, full-body
//      coverage, governance_version stamp completeness.
//   3. Context trace: every prescription bound to athlete / training /
//      personalization / training-age context IDs.

import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
if (!url || !key) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required");
  Deno.exit(1);
}
const db = createClient(url, key);

async function main() {
  const { count: catalogTotal } = await db
    .from("wk_movement_catalog")
    .select("id", { count: "exact", head: true });
  const { count: catalogGov } = await db
    .from("wk_movement_catalog")
    .select("id", { count: "exact", head: true })
    .eq("governance_version", "gov_v1");
  const govPct = catalogTotal ? Math.round(((catalogGov ?? 0) / catalogTotal) * 100) : 0;

  const { data: diag } = await db
    .from("wk_generation_diagnostics")
    .select(
      "id,plan_date,user_id,validation_status,lift_template_id,lift_full_body_ok,lift_duplicate_check_ok,lift_substitution_completeness,exercise_governance_version,athlete_context_version,personalization_version,training_age_version,context_version",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = diag ?? [];
  const published = rows.filter((r) => r.validation_status === "published");
  const dupOk = published.filter((r) => r.lift_duplicate_check_ok !== false).length;
  const fullBody = published.filter((r) => r.lift_full_body_ok === true).length;
  const govStamped = published.filter((r) => r.exercise_governance_version === "gov_v1").length;
  const traceable = published.filter(
    (r) => r.athlete_context_version && r.personalization_version && r.training_age_version && r.context_version,
  ).length;

  const lines = [
    "metric,pass_count,total,pct",
    `catalog_governance_v1,${catalogGov ?? 0},${catalogTotal ?? 0},${govPct}`,
    `published_no_duplicates,${dupOk},${published.length},${pct(dupOk, published.length)}`,
    `published_full_body,${fullBody},${published.length},${pct(fullBody, published.length)}`,
    `published_gov_stamped,${govStamped},${published.length},${pct(govStamped, published.length)}`,
    `published_context_traceable,${traceable},${published.length},${pct(traceable, published.length)}`,
  ];
  const csv = lines.join("\n");
  console.log(csv);

  const outPath = "docs/audits/lift-governance-matrix.csv";
  try {
    await Deno.mkdir("docs/audits", { recursive: true });
    await Deno.writeTextFile(outPath, csv + "\n");
    console.log(`\nWrote ${outPath}`);
  } catch (e) {
    console.warn("Could not write CSV:", e);
  }

  const fatal = [
    govPct < 95 && `catalog governance coverage ${govPct}% < 95%`,
    dupOk !== published.length && `duplicate check failed on ${published.length - dupOk} rows`,
    fullBody !== published.length && published.length > 0 && `full-body failed on ${published.length - fullBody} rows`,
  ].filter(Boolean);

  if (fatal.length) {
    console.error("\nFAIL:\n  - " + fatal.join("\n  - "));
    Deno.exit(2);
  }
  console.log("\nPASS");
}

function pct(a: number, b: number) {
  return b ? Math.round((a / b) * 100) : 0;
}

await main();
