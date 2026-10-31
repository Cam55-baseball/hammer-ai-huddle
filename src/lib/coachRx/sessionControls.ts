export interface SessionControl {
  id: string; athlete_id: string; actor_id: string; actor_name: string; plan_date: string; sport: string;
  task_id: string; side: string | null; source: string; source_ref: string; target_name: string;
  card_title: string; mode: 'allow' | 'remove'; reason: string; created_at: string; skipped_at: string | null;
}
export interface SessionTarget { taskId: string; side: string | null; source: string; sourceRef: string; cardTitle?: string }
export function sessionExempt(control: SessionControl | undefined): boolean {
  return !!control && (control.mode === 'remove' || control.skipped_at !== null);
}
export function activityControl(controls: SessionControl[], taskId: string, side: string | null = null) {
  return controls.find(c => c.task_id === taskId && c.side === side);
}
export function controlNote(c: SessionControl): string {
  const coach = /^coach\b/i.test(c.actor_name) ? c.actor_name : `Coach ${c.actor_name}`;
  return c.mode === 'remove' ? `Removed by ${coach} for today${c.reason ? ` — ${c.reason}` : ''}` : `${coach} allowed skipping this today — your choice${c.reason ? ` — ${c.reason}` : ''}`;
}