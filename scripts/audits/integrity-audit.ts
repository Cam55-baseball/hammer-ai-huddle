import { checkPrescription } from "/dev-server/supabase/functions/_shared/wic/integrity/doseIntegrity";
import cat from "/tmp/r2/catalog.json";
const before: Record<string, number> = {}, after: Record<string, number> = {};
for (const c of (cat as any).rows) {
  const row = { movement_slug: c.slug, movement_name: c.name, slot: c.slot ?? c.category, sets: c.default_sets, reps: c.default_reps, distance_feet: c.default_distance_feet, duration_seconds: c.default_duration_seconds, dosage_unit: c.dosage_unit, why_payload: { cue: c.cue } };
  const r1 = checkPrescription(row); r1.catches.forEach((x) => before[x.rule] = (before[x.rule] ?? 0) + 1);
  checkPrescription(r1.row).catches.forEach((x) => after[x.rule] = (after[x.rule] ?? 0) + 1);
}
console.log(JSON.stringify({ exercises: (cat as any).rows.length, found: before, left_after_repair: after }));
for (const c of (cat as any).rows) { const r = checkPrescription({ movement_slug: c.slug, movement_name: c.name, slot: c.category, why_payload: { cue: c.cue } }); for (const x of r.catches) if (x.rule==="missing_direction") console.log(c.slug, c.name, "|", c.cue); }
