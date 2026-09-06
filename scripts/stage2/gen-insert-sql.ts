/**
 * Stage 2 — emits the catalog INSERT statements for Appendix A.
 * Every row is written `is_active = false`. Duplicates (by normalized name or
 * slug against the live catalog) are excluded via SKIP_NORMS.
 *
 * Run: bun scripts/stage2/gen-insert-sql.ts <groupIndexStart> <groupIndexEnd>
 */
import { APPENDIX_A, type MovementRow } from "./appendix-a.ts";

const SKIP_NORMS = new Set(
  [
    "Back Squat", "Backward Sled Drag", "Band Pull Apart", "Band Pull Through",
    "Barbell Hip Thrust", "Elephant Walk", "Front Squat", "Glute Ham Raise",
    "Half Kneeling Cable Chop", "Half Kneeling Landmine Press", "Hang Power Clean",
    "Landmine Press", "Lat Foam Roll", "Ring Row", "Scapular CARs",
    "Seated Good Morning", "Serratus Wall Slide", "Side Lying External Rotation",
    "Suitcase Carry", "Tibialis Raise", "Trap Bar Jump", "Weighted Pull Up",
    "Yoga Push Up",
  ].map(norm),
);

function norm(n: string): string {
  return n.toLowerCase().replace(/\s[—–-]\s.*$/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

// Map Appendix A vocabularies onto the catalog's existing values — Stage 2 adds
// no new category, no new dosage unit and no new intensity class.
const CATEGORY_MAP: Record<string, string> = {
  joint_armor: "kot",
  plyometrics: "speed_lab",
  power: "compound",
  core: "trunk",
  mobility: "warmup",
};
const UNIT_MAP: Record<string, string> = { distance_feet: "feet" };
const INTENSITY_MAP: Record<string, string> = { intensive: "high" };

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const arr = (a: string[]) => `'{${a.join(",")}}'`;
const ageCode = (t: MovementRow["training_age_legality"]) =>
  t.beginner ? "all" : t.intermediate ? "int" : "adv";

export const KEPT = APPENDIX_A.filter((m) => !SKIP_NORMS.has(norm(m.name)));

function groupKey(m: MovementRow) {
  return `${m.category}|${m.movement_category}|${m.cue}|${m.why_prescribed}`;
}

const groups = new Map<string, MovementRow[]>();
for (const m of KEPT) {
  const k = groupKey(m);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k)!.push(m);
}

const PHASES = ["os_q1", "os_q2", "os_q3", "os_q4"];

function sqlFor(rows: MovementRow[]): string {
  const g = rows[0];
  const values = rows
    .map(
      (m) =>
        `(${q(m.name)},${q(m.slug)},${q(UNIT_MAP[m.dosage_unit] ?? m.dosage_unit)},${q(m.substitution_family)},${arr(m.equipment_requirements)},${m.cns_cost},${m.min_age_years},${m.min_training_age_years},${q(ageCode(m.training_age_legality))},${m.season_legality.in_season},${m.recovery_window_hours},${m.deep_flexion},${m.eccentric_overload},${m.game_day_legal},${m.intensity_mode ? q(INTENSITY_MAP[m.intensity_mode] ?? m.intensity_mode) : "null"})`,
    )
    .join(",\n  ");
  return `insert into wk_movement_catalog
 (name,slug,category,movement_category,dosage_unit,substitution_family,equipment_requirements,equipment,
  cns_cost,min_age_years,min_training_age_years,training_age_legality,season_legality,recovery_window_hours,
  deep_flexion,eccentric_overload,game_day_legal,practice_day_legal,sport_scope,governance_version,
  cue,why_prescribed,is_active,phase_allow,season_eligibility,intensity_class)
select v.name,v.slug,${q(CATEGORY_MAP[g.category] ?? g.category)},${q(g.movement_category)},v.unit,v.fam,v.equip::text[],v.equip::text[],
  v.cns,v.min_age,v.min_ta,
  case v.age_code when 'all' then '{"beginner":true,"intermediate":true,"advanced":true}'::jsonb
                  when 'int' then '{"beginner":false,"intermediate":true,"advanced":true}'::jsonb
                  else '{"beginner":false,"intermediate":false,"advanced":true}'::jsonb end,
  jsonb_build_object('os_q1',true,'os_q2',true,'os_q3',true,'os_q4',true,
                     'pre_season',v.ins,'in_season',v.ins,'post_season',v.ins),
  v.rec,v.deep,v.ecc,v.gdl,true,'both','gov_v1',
  ${q(g.cue)},${q(g.why_prescribed)},false,
  case when v.ins then '{os_q1,os_q2,os_q3,os_q4,pre_season,in_season,post_season}'::text[]
       else '{${PHASES.join(",")}}'::text[] end,
  case when v.ins then '{os_q1,os_q2,os_q3,os_q4,pre_season,in_season,post_season}'::text[]
       else '{${PHASES.join(",")}}'::text[] end,
  v.intensity
from (values
  ${values}
) as v(name,slug,unit,fam,equip,cns,min_age,min_ta,age_code,ins,rec,deep,ecc,gdl,intensity)
on conflict (slug) do nothing;`;
}

const list = [...groups.values()];
const start = Number(Deno_argv(0) ?? 0);
const end = Number(Deno_argv(1) ?? list.length);
function Deno_argv(i: number) {
  return process.argv.slice(2)[i];
}
if (process.env.LIST) {
  list.forEach((r, i) => console.error(`${i}\t${r.length}\t${r[0].movement_category}\t${r[0].substitution_family}`));
  console.error(`TOTAL KEPT: ${KEPT.length}`);
} else {
  console.log(list.slice(start, end).map(sqlFor).join("\n\n"));
}
