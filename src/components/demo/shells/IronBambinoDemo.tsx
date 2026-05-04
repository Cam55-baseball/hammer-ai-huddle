import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';
import { programSim, Goal, Experience } from '@/demo/sims/programSim';

const GOALS: Goal[] = ['power', 'speed', 'durability'];
const DAYS: (3 | 4 | 5)[] = [3, 4, 5];
const LEVELS: Experience[] = ['beginner', 'intermediate', 'advanced'];

export default function IronBambinoDemo() {
  const [goal, setGoal] = useState<Goal>('power');
  const [days, setDays] = useState<3 | 4 | 5>(4);
  const [exp, setExp] = useState<Experience>('intermediate');
  const program = programSim.run({ goal, daysPerWeek: days, experience: exp });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <Picker label="Goal" options={GOALS} value={goal} onChange={setGoal} />
          <Picker label="Days / week" options={DAYS} value={days} onChange={setDays} />
          <Picker label="Experience" options={LEVELS} value={exp} onChange={setExp} />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {program.map((d) => (
          <Card key={d.day} className={d.locked ? 'relative overflow-hidden border-primary/40' : ''}>
            <CardContent className="p-3">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-bold">{d.day} · <span className="font-normal text-muted-foreground">{d.focus}</span></p>
                {d.locked && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary"><Lock className="h-3 w-3" /> Locked</span>}
              </div>
              {d.exercises.length > 0 && (
                <ul className={`mt-1.5 space-y-0.5 text-xs text-muted-foreground ${d.locked ? 'blur-sm select-none' : ''}`}>
                  {d.exercises.map(e => (
                    <li key={e.name}>{e.name} — {e.sets}×{e.reps}</li>
                  ))}
                </ul>
              )}
              {d.locked && (
                <Button size="sm" className="mt-2 gap-1.5"><Sparkles className="h-4 w-4" /> Unlock full plan</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Picker<T extends string | number>({ label, options, value, onChange }: {
  label: string; options: readonly T[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <Button key={String(o)} size="sm" variant={value === o ? 'default' : 'outline'}
            onClick={() => onChange(o)} className="capitalize">{String(o)}</Button>
        ))}
      </div>
    </div>
  );
}
