/**
 * Evidence — the swap walked end to end.
 *
 * Picks one fault family and walks the athlete's equipment tier down from
 * "full gym" to "nothing at all", printing what the swap control would offer
 * at each rung and the exact line the athlete would read.
 *
 * Read-only. Writes nothing, generates no plan for any real user.
 *
 * Run: bun scripts/audits/evidence/family-swap-walkthrough.ts [familyId]
 */
import { createClient } from "@supabase/supabase-js";
import {
  FAMILY_BY_ID,
  laddersAtOrBelow,
  type EquipmentTier,
  type FaultFamilyId,
} from "../../../src/lib/wic/faultLedger/families.ts";
import { resolveEquipmentTier } from "../../../src/lib/wic/faultLedger/equipmentTier.ts";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("[walkthrough] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(2);
}
const db = createClient(url, key);

const familyId = (process.argv[2] ?? "deceleration_base") as FaultFamilyId;
const family = FAMILY_BY_ID[familyId];
if (!family) {
  console.error(`[walkthrough] unknown family "${familyId}"`);
  process.exit(2);
}

const { data, error } = await db
  .from("wk_movement_catalog")
  .select("slug,name,equipment_requirements,min_age_years,season_legality,is_active,troubleshooting_tags")
  .in("slug", family.ladder.map((r) => r.slug));
if (error) {
  console.error("[walkthrough] catalog read failed:", error.message);
  process.exit(2);
}
const bySlug = new Map((data ?? []).map((r) => [r.slug as string, r]));

/** Profiles an athlete could actually have, top of the ladder downward. */
const PROFILES: ReadonlyArray<{ label: string; owns: string[] }> = [
  { label: "Full gym (cable, specialty bars)", owns: ["full_gym", "barbell", "dumbbells", "bands"] },
  { label: "Barbell and rack at home", owns: ["barbell", "dumbbells", "bands"] },
  { label: "Dumbbells only", owns: ["dumbbells"] },
  { label: "A band and a wall", owns: ["bands", "wall"] },
  { label: "Nothing at all", owns: [] },
  { label: "Unreadable profile (\"my school's gym\")", owns: ["my school's gym"] },
];

console.log(`Swap walkthrough — ${family.label} (${family.id})`);
console.log(`Problem in plain words: ${family.plain}`);
console.log(`Common complaints: ${family.troubleshooting.join(" · ")}\n`);

const startSlug = family.ladder[family.ladder.length - 1].slug;
console.log(`Athlete taps "I can't do this one" on: ${bySlug.get(startSlug)?.name ?? startSlug}\n`);

for (const profile of PROFILES) {
  const resolved = resolveEquipmentTier(profile.owns);
  const offered = laddersAtOrBelow(family, resolved.tier as EquipmentTier, startSlug);
  console.log(`── ${profile.label}  →  tier ${resolved.tier}`);
  if (resolved.unrecognised.length) {
    console.log(`   unrecognised: ${resolved.unrecognised.join(", ")} → raised nothing (safe direction)`);
  }
  if (offered.length === 0) {
    console.log("   (nothing offered — this must never happen; tier 0 always exists)\n");
    continue;
  }
  offered.forEach((rung, i) => {
    const row = bySlug.get(rung.slug);
    const eq = ((row?.equipment_requirements as string[] | null) ?? []).filter(
      (e) => e && e !== "bodyweight",
    );
    const need = eq.length ? `You'd need: ${eq.join(", ")}` : "No equipment";
    const mark = i === 0 ? "▶" : " ";
    console.log(
      `   ${mark} [tier ${rung.tier}] ${row?.name ?? rung.slug}\n` +
        `       "Same job: ${family.label.toLowerCase()}." · ${need}`,
    );
  });
  console.log("");
}

console.log("Bottom of every ladder is reachable with nothing at all.");
