import { useState } from 'react';
import { CustomActivityBuilderDialog } from '@/components/custom-activities/CustomActivityBuilderDialog';
import { SendToPlayerDialog } from '@/components/custom-activities/SendToPlayerDialog';
import { ReceivedActivityCard } from '@/components/custom-activities/ReceivedActivityCard';
import { GuidedCustomExercises } from '@/components/folders/GuidedCustomExercises';
import { useReceivedActivities } from '@/hooks/useReceivedActivities';
import type { CustomActivityTemplate } from '@/types/customActivity';
import type { ActivityFolderItem } from '@/types/activityFolder';

function Inbox({ onAccepted }: { onAccepted: (value: CustomActivityTemplate) => void }) {
  const received = useReceivedActivities();
  return <>{received.pendingActivities.map(activity => <ReceivedActivityCard key={activity.id} activity={activity} onReject={() => void received.rejectActivity(activity.id)} onAccept={() => void received.acceptActivity(activity.id, async data => {
    const value = { ...data, id: 'fixture-accepted', user_id: 'fixture-player', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as CustomActivityTemplate;
    localStorage.setItem('fixture-accepted-template', JSON.stringify(value));
    onAccepted(value); return value;
  })} />)}</>;
}
/** Real create/send/accept controls and hooks; only storage is intercepted by the browser test. */
export function CoachLifecycle() {
  const [stage, setStage] = useState('create');
  const [template, setTemplate] = useState<CustomActivityTemplate | null>(null);
  const [accepted, setAccepted] = useState<CustomActivityTemplate | null>(null);
  return <main className="p-4">
    {stage === 'create' && <CustomActivityBuilderDialog open onOpenChange={open => { if (!open) setStage('send'); }} selectedSport="baseball" presetActivityType="workout" onSave={async data => {
      const value = { ...data, id: 'fixture-created', user_id: 'fixture-coach', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as CustomActivityTemplate;
      setTemplate(value); localStorage.setItem('fixture-created-template', JSON.stringify(value)); return value;
    }} />}
    {stage === 'send' && <SendToPlayerDialog open template={template} onOpenChange={open => { if (!open) setStage('accept'); }} />}
    {stage === 'accept' && !accepted && <Inbox onAccepted={setAccepted} />}
    {accepted && <GuidedCustomExercises storageKey="final-coach-lifecycle" item={{ id: accepted.id, title: accepted.title, item_type: 'workout' } as ActivityFolderItem} exercises={Array.isArray(accepted.exercises) ? accepted.exercises : []} performanceData={JSON.parse(localStorage.getItem('fixture-coach-lifecycle') ?? 'null')} onSave={async data => { localStorage.setItem('fixture-coach-lifecycle', JSON.stringify(data)); }} />}
  </main>;
}