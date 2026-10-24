import { useState } from 'react';
import { CustomActivityDetailDialog } from '@/components/CustomActivityDetailDialog';
import { Button } from '@/components/ui/button';
import type { GamePlanTask } from '@/hooks/useGamePlan';

/** Existing coach card including its real outer close control; persistence stays local to this proof. */
export function CoachDetail() {
  const [open, setOpen] = useState(true);
  const template = { id: 'fixture-card', user_id: 'fixture-player', title: 'Coach close proof', activity_type: 'workout', icon: 'dumbbell', color: '#ef4444', exercises: [{ id: 'rep', name: 'Coach reps', type: 'baseball', sets: 3, reps: 8, rest: 30 }], custom_fields: [], created_at: '2026-10-24', updated_at: '2026-10-24' };
  const task = { id: 'fixture-task', title: template.title, completed: false, customActivityData: { template, log: { entry_date: '2026-10-24', performance_data: JSON.parse(localStorage.getItem('fixture-coach-detail') ?? 'null') } } } as unknown as GamePlanTask;
  return <><Button onClick={() => setOpen(true)}>Open coach card</Button><CustomActivityDetailDialog open={open} onOpenChange={setOpen} task={task} taskTime={null} taskReminder={null} onComplete={() => {}} onEdit={() => {}} onSaveTime={() => {}} isCoachSent onSavePerformanceData={async data => { localStorage.setItem('fixture-coach-detail', JSON.stringify(data)); }} /></>;
}