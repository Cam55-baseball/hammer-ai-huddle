/** Isolated rendered-component proof. Inputs and persistence are fixtures, never engine outputs. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PocketCard } from '@/components/hammer/cards/PocketCard';
import { InlinePrescriptionLog } from '@/components/hammer/logging/InlinePrescriptionLog';
import { LegacyDrillInlineLog } from '@/components/hammer/logging/LegacyDrillInlineLog';
import { GuidedCustomExercises } from '@/components/folders/GuidedCustomExercises';
import { TimingStudyMoments } from '@/components/hammer/TimingStudyMoments';
import { ConditioningRestProvider } from '@/components/hammer/cards/ConditioningRestContext';
import { AuthContext } from '@/contexts/AuthContext';
import { ExerciseTools } from '@/components/hammer/cards/ExerciseTools';
import PickoffTrainer from '@/pages/PickoffTrainer';
import { CoachLifecycle } from './CoachLifecycle';
import { CoachDetail } from './CoachDetail';
import { CoachPrescriptionInbox } from '@/components/hammer/CoachPrescriptionInbox';
import { CoachPrescriptionStatus } from '@/components/coach/CoachPrescriptionStatus';
import { WkPrescriptionCard } from '@/components/hammer/WkPrescriptionCard';
import '@/index.css';
import type { WkRx } from '@/hooks/useWkDailyPrescriptions';
import type { ActivityFolderItem } from '@/types/activityFolder';
const params = new URLSearchParams(location.search);
const kind = params.get('kind') ?? 'lift';
const rx = { id: `fixture-${kind}`, plan_date: '2026-10-24', movement_slug: 'band_pushup', movement_name: 'Band push-up', slot: kind, sets: 3, reps: 8, total_reps: null, distance_feet: null, duration_seconds: null, dosage_unit: 'reps', rest_seconds: 45, status: 'pending' } as unknown as WkRx;
if (kind === 'speed' || kind === 'speed-cap') Object.assign(rx, { slot: 'speed', movement_slug: '30_yd_sprint', movement_name: 'Sprint', distance_feet: kind === 'speed' ? 90 : 180, reps: 1 });
if (kind === 'conditioning') Object.assign(rx, { slot: 'conditioning', movement_slug: 'repeat_90ft_bb', movement_name: 'One-base repeat', distance_feet: 90, sets: 6, reps: 1 });
if (kind === 'hitting') Object.assign(rx, { movement_slug: 'tee_work', movement_name: 'Tee work' });
if (kind === 'pitching' || kind === 'throwing') Object.assign(rx, { movement_slug: 'dry_throws', movement_name: 'Dry throws', total_reps: 24 });
if (kind === 'fielding') Object.assign(rx, { movement_slug: 'ground_ball', movement_name: 'Ground balls' });
if (kind === 'baserunning') Object.assign(rx, { movement_slug: 'steal_jump', movement_name: 'Steal jump', distance_feet: 90 });
const timed = kind === 'warmup' || kind === 'recovery';
const unitSlugs = ['walking_lunge','lift_rfess_pallof','lift_banded_lateral_squat_walk','lift_elephant_walk','lift_farmer_toe_walk','broad_jump','plank_hold','ubp_f15_base_pushup_bottom_hold_explode','tall_plank_shoulder_tap'];
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function App() {
  if (kind === 'coach-detail') return <CoachDetail />;
  if (kind === 'coach-lifecycle') return <CoachLifecycle />;
  if (kind === 'pickoff-tool') return <PickoffTrainer />;
  if (kind === 'coach-rx-inbox') return <main className="p-4"><CoachPrescriptionInbox planDate="2026-10-24" /></main>;
  if (kind === 'coach-rx-status') return <main className="p-4"><CoachPrescriptionStatus /></main>;
  if (kind === 'replaced-card') return <main className="p-4"><WkPrescriptionCard rx={{ ...rx, id: 'fixture-replaced', status: 'skipped', replaced_by_coach_rx: 'rx-hit' } as unknown as WkRx} /></main>;
  if (kind.startsWith('study-')) {
    const role = kind.slice(6);
    return <main className="p-4"><TimingStudyMoments sport={role === 'softball-pitcher' ? 'softball' : 'baseball'} position={role.includes('pitcher') ? 'P' : role === 'defender' ? 'SS' : null} roles={role === 'populated' ? ['hitter','baserunner','defender'] : [role.includes('pitcher') ? 'pitcher' : role as 'hitter']} flags={role === 'populated' ? ['swing timing','first step range'] : []} goals={role === 'populated' ? ['steal jump'] : []} /></main>;
  }
  if (kind === 'coach') return <main className="p-4"><GuidedCustomExercises storageKey="final-coach" item={{ id: 'fixture-accepted', title: 'Coach workout', item_type: 'workout' } as ActivityFolderItem} exercises={[{ id: 'rep', name: 'Coach reps', type: 'baseball', sets: 3, reps: 8, rest: 30 }]} performanceData={JSON.parse(localStorage.getItem('fixture-coach') ?? 'null')} onSave={async data => { localStorage.setItem('fixture-coach', JSON.stringify(data)); }} /></main>;
  return <main className="p-4"><ConditioningRestProvider><PocketCard id={kind} category={kind} tone="text-primary" prescribed planDate="2026-10-24">{() => <>
    {kind === 'units' ? unitSlugs.map(slug => <InlinePrescriptionLog key={slug} rx={{ ...rx, id: slug, movement_slug: slug, movement_name: slug, slot: 'lift', sets: 1, distance_feet: slug === 'lift_farmer_toe_walk' ? 45 : null, duration_seconds: slug === 'plank_hold' ? 30 : null, dosage_unit: slug === 'plank_hold' ? 'seconds' : 'reps' }} />) : timed ? <LegacyDrillInlineLog modality={kind} name="Declared timed work" dosage="3 sets of 1.47 seconds; rest 30 seconds" storageKey={`fixture-${kind}`} completed={false} onSave={log => localStorage.setItem(`fixture-saved-${kind}`, JSON.stringify(log))} /> : <InlinePrescriptionLog rx={rx} />}
  </>}</PocketCard></ConditioningRestProvider></main>;
}
const root = document.getElementById('root');
if (root) createRoot(root).render(<BrowserRouter><QueryClientProvider client={client}><AuthContext.Provider value={{ user: { id: 'fixture-player' }, loading: false, isAuthStable: true } as React.ContextType<typeof AuthContext>}><App /></AuthContext.Provider></QueryClientProvider></BrowserRouter>);