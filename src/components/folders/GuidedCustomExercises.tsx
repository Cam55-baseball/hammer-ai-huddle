import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FocusSession, useFocusState } from '@/components/hammer/cards/FocusSession';
import { FolderItemPerformanceLogger } from './FolderItemPerformanceLogger';
import type { Exercise } from '@/types/customActivity';
import type { ActivityFolderItem } from '@/types/activityFolder';

function GuidedRows({ exercises, item, performanceData, onSave }: { exercises: Exercise[]; item: ActivityFolderItem; performanceData: Parameters<typeof FolderItemPerformanceLogger>[0]['performanceData']; onSave: (data: any) => Promise<void> }) {
  const focus = useFocusState();
  return <div className="space-y-3">{exercises.map(exercise => <div key={exercise.id} className={focus.active && focus.currentId !== `coach:${item.id}:${exercise.id}` ? 'hidden' : 'border-b border-border pb-3'}>
    <FolderItemPerformanceLogger item={item} exerciseId={exercise.id} exerciseName={exercise.name} prescription={exercise} performanceData={performanceData} onSave={onSave} compact />
  </div>)}</div>;
}

/** Reuses the accepted activity's logger; finishing guided rows does not check all boxes. */
export function GuidedCustomExercises({ storageKey, exercises, item, performanceData, onSave }: { storageKey: string; exercises: Exercise[]; item: ActivityFolderItem; performanceData: Parameters<typeof FolderItemPerformanceLogger>[0]['performanceData']; onSave: (data: any) => Promise<void> }) {
  const [active, setActive] = useState(false);
  return <section className="space-y-2">
    {!active && <Button size="sm" onClick={() => setActive(true)}>Start</Button>}
    <FocusSession active={active} storageKey={storageKey} onExit={() => setActive(false)}>
      <GuidedRows exercises={exercises} item={item} performanceData={performanceData} onSave={onSave} />
    </FocusSession>
  </section>;
}