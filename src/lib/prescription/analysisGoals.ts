import type { EliteDrill } from '@/data/drills/eliteDrillCatalog';
import { CATEGORY_INTENTS, getV2, normalizeCategoryGoals, type CategoryKey as LegacyCategory } from '@/lib/hammer/goals/categoryGoals';
import { findSubGoal, type CategoryKey, type Discipline, type Sport } from '@/lib/hammer/goals/subGoalCatalog';
import { firstPositionToken, positionTokenIsPitcher } from '@/lib/hammer/positions/positionNormalizer';

/** Explicit saved goals select library practice, never manufacture a fault. */
export function categoryGoals(raw: unknown, module: string, sport: string = 'baseball', position?: unknown): string[] {
  if (!['hitting', 'pitching', 'throwing'].includes(module) || !['baseball', 'softball'].includes(sport)) return [];
  const selectedSport = sport as Sport;
  const v2 = getV2(raw);
  if (v2) {
    const panes = v2[selectedSport];
    let discipline: Discipline | null = module === 'pitching' ? 'pitcher' : module === 'throwing' ? 'position' : null;
    if (!discipline) {
      if (firstPositionToken(position)) discipline = positionTokenIsPitcher(position) ? 'pitcher' : 'position';
      else if (panes?.position && !panes.pitcher) discipline = 'position';
      else if (panes?.pitcher && !panes.position) discipline = 'pitcher';
    }
    if (!discipline) return [];
    return (panes?.[discipline]?.[module as CategoryKey] ?? [])
      .slice().sort((a, b) => Number(a.rank === 'secondary') - Number(b.rank === 'secondary'))
      .map(pick => findSubGoal(selectedSport, discipline, module as CategoryKey, pick.id)?.label)
      .filter((label): label is string => Boolean(label));
  }
  const legacy = normalizeCategoryGoals(raw);
  if (legacy) {
    // Legacy throwing was a shared bucket, not evidence of a pitching goal.
    if (module === 'pitching') return [];
    const category = module as LegacyCategory;
    const intent = legacy.goals.find(g => g.category === category)?.intent;
    const label = CATEGORY_INTENTS[category]?.find(g => g.id === intent)?.label;
    return label ? [label] : [];
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const value = (raw as Record<string, unknown>)[module];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && !!v.trim()) : [];
}

const normalize = (s: string) => s.toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
// References to existing library identities only, not another drill catalog.
const GOAL_DRILL_IDS: Record<string, readonly string[]> = {
  'hitting:barrel control': ['elite.hit.hands_inside_short_bat', 'elite.hit.high_tee_plane_match'],
  'hitting:hitting to all fields': ['elite.hit.oppo_gap_transfer'],
  'throwing:footwork into the throw': ['elite.throw.roll_in_footwork'],
};

export function matchGoalDrills(catalog: EliteDrill[], goals: string[], module: string, sport: string, max = 2): Array<{ drill: EliteDrill; score: number; reasons: string[] }> {
  if (!['baseball', 'softball'].includes(sport)) return [];
  return catalog.filter(d => d.category === module && d.sports.includes(sport as Sport) && !!d.videoUrl?.trim())
    .map(drill => {
      const matched = goals.filter(g => normalize(g) === normalize(drill.subSkill)
        || GOAL_DRILL_IDS[`${module}:${normalize(g)}`]?.includes(drill.id));
      return { drill, score: matched.length * 10, reasons: matched.map(g => `Your goal: ${g.replace(/_/g, ' ')}`) };
    }).filter(d => d.score > 0).sort((a, b) => b.score - a.score || a.drill.id.localeCompare(b.drill.id)).slice(0, max);
}