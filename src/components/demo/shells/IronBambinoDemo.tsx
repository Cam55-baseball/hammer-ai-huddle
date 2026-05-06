import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { programSim, Goal, Experience } from '@/demo/sims/programSim';
import { DemoLoopShell } from '@/components/demo/DemoLoopShell';
import { useDemoInteract } from '@/hooks/useDemoInteract';
import { useAuth } from '@/hooks/useAuth';
import { WeekGridHeatmap } from '@/components/demo/viz/diagrams/WeekGridHeatmap';

const GOALS: Goal[] = ['power', 'speed', 'durability'];
const DAYS: (3 | 4 | 5)[] = [3, 4, 5];
const LEVELS: Experience[] = ['beginner', 'intermediate', 'advanced'];

export default function IronBambinoDemo() {
  const { user } = useAuth();
  const [goal, setGoal] = useState<Goal>('power');
  const [days, setDays] = useState<3 | 4 | 5>(4);
  const [exp, setExp] = useState<Experience>('intermediate');
  const program = programSim.run({ goal, daysPerWeek: days, experience: exp }, { userId: user?.id ?? null });
  const { bump } = useDemoInteract('iron-bambino');

  const set = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); bump(); };

  return (
    <DemoLoopShell
      fromSlug="iron-bambino"
      simId="program"
      severity={program.benchmark.severity}
      gap={program.benchmark.gapPct}
      input={
        <Card>
          <CardContent className="space-y-3 p-4">
            <Picker label="Goal" options={GOALS} value={goal} onChange={set(setGoal)} />
            <Picker label="Days / week" options={DAYS} value={days} onChange={set(setDays)} />
            <Picker label="Experience" options={LEVELS} value={exp} onChange={set(setExp)} />
          </CardContent>
        </Card>
      }
      diagnosis={
        <div className="space-y-2">
          {program.days.map((d) => (
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
              </CardContent>
            </Card>
          ))}
        </div>
      }
      benchmark={{
        yourLabel: 'Your days',
        yourValue: `${program.benchmark.yourDays}/wk`,
        eliteLabel: 'Elite',
        eliteValue: `${program.benchmark.eliteDays}/wk`,
        gapLabel: 'Gap',
        gapValue: `${program.benchmark.gapPct}%`,
        projected: program.benchmark.projectedImprovement,
        whyItMatters: program.benchmark.whyItMatters,
      }}
    />
  );
}

function Picker<T extends string | number>({ label, options, value, onChange }: {
  label: string; options: readonly T[]; value: T; onChange: (v: any) => void;
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
