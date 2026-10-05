import { useNavigate } from 'react-router-dom';
import { useTexVisionS2Priority } from './TexVisionS2Priority';
import { useTexVisionProgress } from '@/hooks/useTexVisionProgress';
import { useDailyDrillSelection } from '@/hooks/useDailyDrillSelection';
import { ALL_DRILLS } from '@/constants/texVisionDrills';
import { getRecommendedDrills } from '@/data/s2DrillRecommendations';
import { Button } from '@/components/ui/button';

// The legacy recommendation map uses hyphens and several display names; resolve
// only drills that really exist and are unlocked in the athlete's current tier.
const LEGACY_IDS: Record<string, string> = {
  'pattern-search': 'pattern_search', 'whack-a-mole': 'whack_a_mole',
  'meter-timing': 'meter_timing', 'follow-the-target': 'smooth_pursuit',
  'near-far-sight': 'near_far', 'brock-string': 'brock_string',
  'peripheral-vision': 'peripheral_vision', 'soft-focus': 'soft_focus',
  'convergence-divergence': 'convergence',
};
const AREAS = {
  processing_speed: 'processing_speed_score', decision_efficiency: 'decision_efficiency_score',
  visual_motor: 'visual_motor_integration_score', visual_tracking: 'visual_tracking_score',
  peripheral_awareness: 'peripheral_awareness_score', processing_under_load: 'processing_under_load_score',
  impulse_control: 'impulse_control_score', fatigue_index: 'fatigue_index_score',
} as const;
const TIER_ORDER = { beginner: 0, advanced: 1, chaos: 2 };

/** Read-only contextual work, not a new schedule or dose. Existing Tex Vision
 * selection remains authoritative; S2 ranks eligible work when it is present. */
export function TexVisionWork() {
  const navigate = useNavigate();
  const { baseline, hasAccess, loading, due } = useTexVisionS2Priority();
  const sport = typeof window !== 'undefined' && localStorage.getItem('selectedSport') === 'softball' ? 'softball' : 'baseball';
  const { progress, dailyChecklist } = useTexVisionProgress(sport);
  const { dailyDrills } = useDailyDrillSelection(progress?.current_tier ?? 'beginner', sport);
  if (loading || !hasAccess || !baseline || due || !dailyDrills?.length) return null;
  const scores = Object.fromEntries(Object.entries(AREAS)
    .filter(([, col]) => typeof baseline[col] === 'number')
    .map(([area, col]) => [area, baseline[col] as number]));
  if (!Object.keys(scores).length) return null;
  const eligible = new Set(dailyDrills.filter(d => !dailyChecklist?.checklist_items?.[d.id]).map(d => d.id));
  const match = getRecommendedDrills(scores).flatMap(r => r.drills)
    .map(d => ALL_DRILLS.find(candidate => candidate.id === LEGACY_IDS[d.drillId]))
    .find(d => d && eligible.has(d.id) && TIER_ORDER[d.tier] <= TIER_ORDER[progress?.current_tier ?? 'beginner']);
  if (!match) return null;
  return <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2">
    <p className="text-sm font-semibold">Tex Vision · {match.defaultName}</p>
    <p className="text-xs text-muted-foreground">Based on your S2 assessment from {baseline.test_date}. This drill is in your current vision selection. Follow your Tex Vision checklist; no extra session is added.</p>
    <Button size="sm" variant="outline" onClick={() => navigate('/tex-vision')}>Open vision work</Button>
  </div>;
}
