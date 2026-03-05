import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FieldPositionDiagram } from './FieldPositionDiagram';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface SituationalPromptsProps {
  pitchResult: string;
  runnersOn: boolean;
  isInPlay: boolean;
  sport?: 'baseball' | 'softball';
  fielderPosition?: string;
  onUpdate: (data: Record<string, any>) => void;
}

const GRADES = ['Poor', 'Average', 'Good', 'Elite'];
const YES_NO = ['Yes', 'No'];
const TIMING = ['Early', 'On Time', 'Late'];
const REACTION = ['Fast', 'Avg', 'Slow'];

const INFIELD_POSITIONS = new Set(['P', 'C', '1B', '2B', '3B', 'SS']);
const OUTFIELD_POSITIONS = new Set(['LF', 'CF', 'RF']);

const INFIELD_PLAY_TYPES = ['Ground Ball', 'Line Drive', 'Pop Up', 'Bunt', 'Relay'];
const OUTFIELD_PLAY_TYPES = ['Fly Ball', 'Line Drive', 'Ground Ball', 'Wall Play', 'Relay'];

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

export function SituationalPrompts({ pitchResult, runnersOn, isInPlay, sport = 'baseball', fielderPosition, onUpdate }: SituationalPromptsProps) {
  const [data, setData] = useState<Record<string, any>>({});
  const [diagramOpen, setDiagramOpen] = useState(false);
  const isDirtBall = pitchResult === 'ball' && runnersOn;

  const isInfield = fielderPosition ? INFIELD_POSITIONS.has(fielderPosition) : true;
  const isOutfield = fielderPosition ? OUTFIELD_POSITIONS.has(fielderPosition) : false;
  const playTypes = isOutfield ? OUTFIELD_PLAY_TYPES : INFIELD_PLAY_TYPES;

  const update = (key: string, value: any) => {
    const next = { ...data, [key]: value };
    setData(next);
    onUpdate(next);
  };

  return (
    <div className="space-y-3">
      {/* Dirt Ball Read */}
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

      {/* Steal Attempt */}
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

      {/* Defensive Play — expanded with play types */}
      {isInPlay && (
        <Card className="border-purple-500/30">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs text-purple-600">🧤 Defensive Play</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            {/* Play Type selector */}
            <SelectGrid
              label="Play Type"
              options={playTypes}
              value={data.def_play_type || ''}
              onChange={v => update('def_play_type', v)}
              cols={playTypes.length <= 4 ? playTypes.length : 3}
            />

            {/* Relay — Infield: "Got to correct lineup spot?" */}
            {data.def_play_type === 'Relay' && isInfield && (
              <SelectGrid
                label="Got to correct lineup spot for relay?"
                options={YES_NO}
                value={data.relay_correct_spot || ''}
                onChange={v => update('relay_correct_spot', v)}
                cols={2}
              />
            )}

            {/* Relay — Outfield: "Hit cutoff?" */}
            {data.def_play_type === 'Relay' && isOutfield && (
              <SelectGrid
                label="Hit cutoff?"
                options={['Complete', 'Incomplete', 'Elite']}
                value={data.relay_hit_cutoff || ''}
                onChange={v => update('relay_hit_cutoff', v)}
              />
            )}

            {/* Wall Play — Outfield */}
            {data.def_play_type === 'Wall Play' && isOutfield && (
              <SelectGrid
                label="Played ball off of the wall?"
                options={['Poor', 'Well', 'Elite']}
                value={data.wall_play_quality || ''}
                onChange={v => update('wall_play_quality', v)}
              />
            )}

            <SelectGrid label="First step reaction" options={['Poor', 'Avg', 'Elite']} value={data.def_first_step || ''} onChange={v => update('def_first_step', v)} />
            <SelectGrid label="Route efficiency" options={GRADES.slice(0, 3)} value={data.def_route || ''} onChange={v => update('def_route', v)} />
            <SelectGrid label="Transfer quality" options={GRADES.slice(0, 3)} value={data.def_transfer || ''} onChange={v => update('def_transfer', v)} />
            <SelectGrid label="Throw accuracy" options={GRADES.slice(0, 3)} value={data.def_throw_accuracy || ''} onChange={v => update('def_throw_accuracy', v)} />
            <SelectGrid label="Decision grade" options={GRADES} value={data.def_decision || ''} onChange={v => update('def_decision', v)} cols={4} />
            <SelectGrid label="Correct base chosen?" options={YES_NO} value={data.def_correct_base || ''} onChange={v => update('def_correct_base', v)} cols={2} />

            {/* Field Position Diagram — optional collapsible */}
            <Collapsible open={diagramOpen} onOpenChange={setDiagramOpen}>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mt-2">
                <ChevronDown className={cn('h-3 w-3 transition-transform', diagramOpen && 'rotate-180')} />
                Add Play Diagram
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <FieldPositionDiagram
                  sport={sport}
                  onUpdate={(diagram) => update('field_diagram', diagram)}
                />
              </CollapsibleContent>
            </Collapsible>
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
