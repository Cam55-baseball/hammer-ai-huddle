import type { CatalogMovement } from '@/hooks/useWorkoutCatalog';
import type { CustomActivityTemplate, Exercise } from '@/types/customActivity';
import { baseballDrills, type DrillDefinition } from '@/data/baseball/drillDefinitions';
import { softballDrills } from '@/data/softball/drillDefinitions';
import { sportDrillGear } from '@/lib/prescription/sportDrillGear';

export const SEND_CATEGORIES = ['hitting', 'pitching', 'throwing', 'fielding', 'baserunning', 'lift', 'speed', 'conditioning', 'warmup', 'mobility', 'recovery', 'vision'] as const;
export interface SendCatalogItem { id: string; title: string; category: string; source: string; exercises: Exercise[]; templateId: string | null; }
export function catalogCategory(row: Pick<CatalogMovement, 'category' | 'movement_category'>): string {
  if (row.category && (SEND_CATEGORIES as readonly string[]).includes(row.category)) return row.category;
  if (row.category === 'windmill_pitching') return 'pitching';
  if (row.category === 'speed_lab' || row.category === 'sprint_mechanics') return 'speed';
  if (row.category === 'arm_care' || row.category === 'shoulder_prep') return 'recovery';
  if (row.category === 'throwing_plyo') return 'throwing';
  if (row.movement_category === 'mobility') return 'mobility';
  return 'lift';
}
export function vaultSendItem(row: CatalogMovement): SendCatalogItem {
  return { id: `vault:${row.id}`, title: row.name, category: catalogCategory(row), source: 'Exercise Vault', templateId: null,
    exercises: [{ id: row.id, name: row.name, slug: row.slug, type: 'other', sets: row.default_sets ?? undefined,
      reps: (row.dosage_unit === 'total_reps' ? row.default_total_reps : row.default_reps) ?? undefined,
      duration: row.default_duration_seconds ?? undefined, distance_feet: row.default_distance_feet ?? undefined,
      dosage_unit: row.dosage_unit ?? undefined, equipment_requirements: [...(row.equipment ?? []), ...(row.equipment_requirements ?? [])],
      equipment_alternatives: row.equipment_alternatives ?? undefined, gear: [...(row.equipment ?? []), ...(row.equipment_requirements ?? [])].join(', ') }] };
}
export function drillSendItem(drill: DrillDefinition, sport: string): SendCatalogItem {
  return { id: `${sport}:${drill.id}`, title: drill.name, category: drill.module, source: `${sport} drills`, templateId: null,
    exercises: [{ id: `${sport}:${drill.id}`, name: drill.name, type: 'baseball', reps: drill.defaultReps,
      dosage_unit: ['throwing', 'pitching'].includes(drill.module) ? 'throws' : 'reps', notes: drill.description,
      ...sportDrillGear(drill), gear: drill.equipmentNeeded.join(', ') }] };
}
export function sendCatalog(catalog: CatalogMovement[], templates: CustomActivityTemplate[], sport: string): SendCatalogItem[] {
  return [ ...catalog.filter(row => !row.sport_scope || row.sport_scope === 'both' || row.sport_scope === sport).map(vaultSendItem), ...(sport === 'softball' ? softballDrills : baseballDrills).map(d => drillSendItem(d, sport)),
    ...templates.filter(t => t.sport === sport && t.exercises?.length).map(t => ({ id: t.id, title: t.title, source: 'My activities', templateId: t.id,
      category: t.activity_type === 'running' ? 'speed' : t.activity_type === 'practice' || t.activity_type === 'short_practice' ? 'hitting' : ['warmup', 'recovery'].includes(t.activity_type) ? t.activity_type : 'lift', exercises: t.exercises })) ];
}
export function filterSendCatalog(items: SendCatalogItem[], search: string, category: string) {
  const term = search.trim().toLowerCase();
  return items.filter(item => (category === 'all' || item.category === category) && `${item.title} ${item.category} ${item.source}`.toLowerCase().includes(term));
}