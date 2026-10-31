import { actualResultText, type WorkoutActual } from '@/lib/coachRx/results';
import { GAME_IQ_AVAILABLE_TO_ATHLETES } from '@/lib/hammer/athleteFeatureAvailability';
import type { SavedCoachPlan } from './planHistory';
import { activityControl, sessionExempt, type SessionControl, type SessionTarget } from '@/lib/coachRx/sessionControls';

export type WorkStatus = 'done' | 'partial' | 'not_done' | 'skipped' | 'removed' | 'rest';
export const WORK_STATUS: Record<WorkStatus, string> = { done: 'Done ✓', partial: 'Partly done', not_done: 'Not done', skipped: 'Skipped (allowed)', removed: 'Removed by coach', rest: 'Rest day' };
interface Prescription { id: string; slot: string; movement_name: string; movement_slug: string; sets: number | null; reps: number | null; status: string; replaced_by_coach_rx: string | null; dosage_unit: string | null; coach_rx?: string | null }
interface Task { task_id: string; side: string | null; completed: boolean; outcome: string | null; name: string; dosage: string; log?: { rounds?: Record<string, unknown>[]; fields?: { key: string; label: string; unit: string | null }[] } }
export interface WeekDay { date: string; plan: SavedCoachPlan; restDay: boolean; prescriptions: Prescription[]; logs: (WorkoutActual & { prescription_id: string; load_used?: number | null })[]; tasks: Task[]; coachWorkouts: { id: string; title: string; category: string; status: string; cancelled_at: string | null; exercises: {name?: string; movement_name?: string; slug?: string; movement_slug?: string; sets?: number; reps?: number}[] }[] }
export interface WeekResult { state: 'ok' | 'denied'; sport?: string; days: WeekDay[] }
export interface WeekActivity { id: string; name: string; dosage: string; status: WorkStatus; results: string[]; target?: SessionTarget; control?: SessionControl }
export interface WeekCard { id: string; title: string; status: WorkStatus; activities: WeekActivity[] }
export function weekDates(date: string, offset = 0): string[] {
  const day = new Date(`${date}T12:00:00`);
  day.setDate(day.getDate() - (day.getDay() + 6) % 7 + offset * 7);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(day); d.setDate(d.getDate() + i); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
}
function aggregate(items: WeekActivity[]): WorkStatus {
  if (!items.length) return 'not_done';
  if (items.every(i => i.status === 'removed')) return 'removed';
  if (items.every(i => i.status === 'skipped' || i.status === 'removed')) return 'skipped';
  if (items.every(i => ['done','skipped','removed'].includes(i.status))) return 'done';
  return items.some(i => i.status === 'done' || i.status === 'partial') ? 'partial' : 'not_done';
}
function taskActivity(task: Task | undefined): Pick<WeekActivity,'status'|'results'> {
  if (!task) return {status:'not_done',results:[]};
  const rounds = task.log?.rounds ?? [];
  const results = rounds.map((round,index) => `Set ${index+1}: ${Object.entries(round).filter(([k,v]) => k !== 'set' && typeof v === 'number').map(([k,v]) => {
    const field = task.log?.fields?.find(f => f.key === k);
    return `${field?.label ?? k}: ${v}${field?.unit ? ` ${field.unit === 'ss.hh' ? 's' : field.unit}` : ''}`;
  }).join(' · ')}`).filter(line => !line.endsWith(': '));
  return {status:task.outcome==='skipped'?'skipped':task.outcome==='cut_short'?'partial':task.completed?'done':rounds.length?'partial':'not_done',results};
}
/** Read-only projection of saved identities. No name-only attribution of workout logs. */
export function playerWeekCards(day: WeekDay, controls: SessionControl[] = []): WeekCard[] {
  const used = new Set<string>();
  const rxActivity = (p: Prescription): WeekActivity => {
    used.add(p.id);
    const logs = day.logs.filter(l => l.prescription_id === p.id);
    const task = day.tasks.find(t => t.task_id === p.id);
    const actual = taskActivity(task);
    const doneSets = logs.reduce((n,l) => n + (l.sets_completed ?? 0),0);
    const status: WorkStatus = p.replaced_by_coach_rx ? 'removed' : p.status==='skipped' ? 'skipped' : task?.outcome ? actual.status : logs.length ? (p.sets != null && doneSets >= p.sets ? 'done':'partial') : actual.status;
    const control=activityControl(controls,p.id);
    return { id:p.id,name:p.movement_name,dosage:[p.sets != null ? `${p.sets} sets`:null,p.reps != null ? `${p.reps} ${p.dosage_unit ?? 'reps'}`:null].filter(Boolean).join(' × '),status:control?.mode==='remove'?'removed':sessionExempt(control)?'skipped':status,results:logs.length ? logs.map(l => `${actualResultText({...l,prescription:{movement_name:p.movement_name,dosage_unit:p.dosage_unit,slot:p.slot}})}${l.load_used != null ? ` · Load: ${l.load_used}`:''}`):actual.results,control,target:{taskId:p.id,side:null,source:'wk_prescription',sourceRef:p.slot} };
  };
  const cards: WeekCard[] = (day.plan.blocks ?? []).filter(b => (b.status==='ready' || b.replacedByCoachRx) && (b.modality!=='game_iq' || GAME_IQ_AVAILABLE_TO_ATHLETES)).map((b,index) => {
    const activities: WeekActivity[] = b.drills.map((drill,i) => {
      const matches = day.prescriptions.filter(p => !used.has(p.id) && !p.coach_rx && p.movement_name === drill.name && (drill.slug ? p.movement_slug === drill.slug : true));
      if (matches.length === 1 && !b.replacedByCoachRx) return rxActivity(matches[0]);
      const slug = (drill.slug ?? drill.name).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
      const side = (b as typeof b & {side?:string}).side ?? null;
      const task = day.tasks.find(t => t.task_id===`${b.modality}:${slug}` && t.side===side);
      const taskId=`${b.modality}:${slug}`;
      const control=activityControl(controls,taskId,side);
      return {id:`${index}:${i}`,name:drill.name,dosage:drill.dosage,...taskActivity(task),...(b.replacedByCoachRx || control?.mode==='remove' ? {status:'removed' as const}:sessionExempt(control)?{status:'skipped' as const}:{}),control,target:{taskId,side,source:'block_drill',sourceRef:b.modality}};
    });
    return {id:`block:${index}`,title:b.title,status:b.replacedByCoachRx?'removed':aggregate(activities),activities};
  });
  for (const coach of day.coachWorkouts) {
    const rows = day.prescriptions.filter(p => p.coach_rx === coach.id);
    if (rows.length) {
      const activities = rows.map(rxActivity);
      cards.push({id:coach.id,title:coach.title,status:coach.cancelled_at?'removed':aggregate(activities),activities});
    }
  }
  const slots = new Map<string,WeekActivity[]>();
  day.prescriptions.forEach(p => { if (used.has(p.id)) return; const list=slots.get(p.slot) ?? []; list.push(rxActivity(p)); slots.set(p.slot,list); });
  for (const [slot,activities] of slots) cards.push({id:`rx:${slot}`,title:({lift:'Lifts',ub_primer:'Power Primer',bat_speed:'Bat speed',conditioning:'Conditioning',speed:'Speed'} as Record<string,string>)[slot] ?? slot.replace(/_/g,' '),status:aggregate(activities),activities});
  for (const coach of day.coachWorkouts) {
    if (!['accepted','added','replaced','cancelled','removed'].includes(coach.status) && !coach.cancelled_at) continue;
    // Canonical prescription rows already show accepted exercises and exact logs.
    if (!cards.some(c => c.id===coach.id) && (coach.cancelled_at || ['cancelled','removed'].includes(coach.status))) cards.push({id:coach.id,title:coach.title,status:'removed',activities:coach.exercises.map((e,i)=>({id:`${coach.id}:${i}`,name:e.name ?? e.movement_name ?? 'Exercise',dosage:'',status:'removed',results:[]}))});
  }
  return cards;
}