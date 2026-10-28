import type { EliteDrill } from '@/data/drills/eliteDrillCatalog';

/** Explicit saved goals select library practice, never manufacture a fault. */
export function categoryGoals(raw: unknown, module: string): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const value = (raw as Record<string, unknown>)[module];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && !!v.trim()) : [];
}

const tokens = (s: string) => s.toLowerCase().replace(/[_-]/g, ' ').split(/[^a-z]+/).filter(v => v.length > 3 && !['improve', 'better', 'with', 'your', 'more', 'goal'].includes(v));

export function matchGoalDrills(catalog: EliteDrill[], goals: string[], module: string, sport: string, max = 2): Array<{ drill: EliteDrill; score: number; reasons: string[] }> {
  return catalog.filter(d => d.category === module && d.sports.includes(sport === 'softball' ? 'softball' : 'baseball') && !!d.videoUrl)
    .map(drill => {
      const declared = new Set(tokens([drill.name, drill.subSkill, drill.fixes, ...drill.movementPatterns, ...drill.violationKeys].join(' ')));
      const matched = goals.filter(g => tokens(g).some(t => declared.has(t)));
      return { drill, score: matched.length * 10, reasons: matched.map(g => `Your goal: ${g.replace(/_/g, ' ')}`) };
    }).filter(d => d.score > 0).sort((a, b) => b.score - a.score || a.drill.id.localeCompare(b.drill.id)).slice(0, max);
}