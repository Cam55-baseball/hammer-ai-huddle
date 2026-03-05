import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SituationalPromptsProps {
  pitchResult: string;
  runnersOn: boolean;
  isInPlay: boolean;
  onUpdate: (data: Record<string, any>) => void;
}

const GRADES = ['Poor', 'Average', 'Good', 'Elite'];
const YES_NO = ['Yes', 'No'];
const TIMING = ['Early', 'On Time', 'Late'];
const REACTION = ['Fast', 'Avg', 'Slow'];

function SelectGrid({ label, options, value, onChange, cols = 3 }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; cols?: number;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className={cn('grid gap-1 mt-1', `grid-cols-${cols}`)}>
        {options.map(o => (
          <button key={o} type="button" onClick={() => onChange(o)}
            className={cn('px-2 py-1 rounded text-xs font-medium border transition-all',
              value === o ? 'bg-primary text-primary-foreground ring-1 ring-primary' : 'bg-muted/30 hover:bg-muted/50'
            )}
          >{o}</button>
        ))}
      </div>
    </div>
  );
}

export function SituationalPrompts({ pitchResult, runnersOn, isInPlay, onUpdate }: SituationalPromptsProps) {
  const [data, setData] = useState<Record<string, any>>({});
  const isDirtBall = pitchResult === 'ball' && runnersOn;

  const update = (key: string, value: any) => {
    const next = { ...data, [key]: value };
    setData(next);
    onUpdate(next);
  };

  return (
    <div className="space-y-3">
      {/* Dirt Ball Read — only when ball + runners on */}
      {isDirtBall && (
        <Card className="border-yellow-500/30">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs text-yellow-600">⚡ Dirt Ball Read</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            <SelectGrid label="Runner read correctly?" options={['Yes', 'Late', 'No']} value={data.dirt_ball_read || ''} onChange={v => update('dirt_ball_read', v)} />
            <SelectGrid label="Secondary lead quality" options={GRADES.slice(0, 3)} value={data.secondary_lead_quality || ''} onChange={v => update('secondary_lead_quality', v)} />
            <SelectGrid label="Reaction time" options={REACTION} value={data.dirt_ball_reaction || ''} onChange={v => update('dirt_ball_reaction', v)} />
          </CardContent>
        </Card>
      )}

      {/* Steal Attempt — manual trigger */}
      {runnersOn && (
        <Card className="border-blue-500/30">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs text-blue-600">🏃 Steal Attempt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            <SelectGrid label="Jump quality" options={['Poor', 'Avg', 'Elite']} value={data.steal_jump || ''} onChange={v => update('steal_jump', v)} />
            <SelectGrid label="Break timing" options={TIMING} value={data.steal_break_timing || ''} onChange={v => update('steal_break_timing', v)} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Pop Time (sec)</Label>
                <Input type="number" step="0.01" className="h-7 text-xs" value={data.steal_pop_time || ''} onChange={e => update('steal_pop_time', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Throw Down Time (sec)</Label>
                <Input type="number" step="0.01" className="h-7 text-xs" value={data.steal_throw_down_time || ''} onChange={e => update('steal_throw_down_time', e.target.value)} />
              </div>
            </div>
            <SelectGrid label="Tag applied clean?" options={YES_NO} value={data.steal_tag_clean || ''} onChange={v => update('steal_tag_clean', v)} cols={2} />
            <SelectGrid label="Transfer quality" options={GRADES.slice(0, 3)} value={data.steal_transfer_quality || ''} onChange={v => update('steal_transfer_quality', v)} />
            <SelectGrid label="Catcher footwork" options={GRADES.slice(0, 3)} value={data.steal_catcher_footwork || ''} onChange={v => update('steal_catcher_footwork', v)} />
            <SelectGrid label="Arm accuracy" options={GRADES.slice(0, 3)} value={data.steal_arm_accuracy || ''} onChange={v => update('steal_arm_accuracy', v)} />
          </CardContent>
        </Card>
      )}

      {/* Defensive Play — on every in-play */}
      {isInPlay && (
        <Card className="border-purple-500/30">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs text-purple-600">🧤 Defensive Play</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            <SelectGrid label="First step reaction" options={['Poor', 'Avg', 'Elite']} value={data.def_first_step || ''} onChange={v => update('def_first_step', v)} />
            <SelectGrid label="Route efficiency" options={GRADES.slice(0, 3)} value={data.def_route || ''} onChange={v => update('def_route', v)} />
            <SelectGrid label="Transfer quality" options={GRADES.slice(0, 3)} value={data.def_transfer || ''} onChange={v => update('def_transfer', v)} />
            <SelectGrid label="Throw accuracy" options={GRADES.slice(0, 3)} value={data.def_throw_accuracy || ''} onChange={v => update('def_throw_accuracy', v)} />
            <SelectGrid label="Decision grade" options={GRADES} value={data.def_decision || ''} onChange={v => update('def_decision', v)} cols={4} />
            <SelectGrid label="Correct base chosen?" options={YES_NO} value={data.def_correct_base || ''} onChange={v => update('def_correct_base', v)} cols={2} />
          </CardContent>
        </Card>
      )}

      {/* Baserunning Advancement */}
      {isInPlay && runnersOn && (
        <Card className="border-green-500/30">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs text-green-600">🏠 Baserunning Advancement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            <SelectGrid label="Read correct?" options={YES_NO} value={data.br_read_correct || ''} onChange={v => update('br_read_correct', v)} cols={2} />
            <SelectGrid label="Turn efficiency" options={GRADES.slice(0, 3)} value={data.br_turn_efficiency || ''} onChange={v => update('br_turn_efficiency', v)} />
            <SelectGrid label="Advance style" options={['Aggressive', 'Conservative']} value={data.br_advance_style || ''} onChange={v => update('br_advance_style', v)} cols={2} />
            <SelectGrid label="Good send by coach?" options={YES_NO} value={data.br_good_send || ''} onChange={v => update('br_good_send', v)} cols={2} />
            <SelectGrid label="Correct decision?" options={YES_NO} value={data.br_correct_decision || ''} onChange={v => update('br_correct_decision', v)} cols={2} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
