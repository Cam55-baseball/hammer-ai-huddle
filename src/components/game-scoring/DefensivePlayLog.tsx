import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ChevronDown, Shield, Plus, X } from 'lucide-react';

export interface DefensivePlay {
  position: string;
  playType: string;
  result: string;
  firstStep: string;
  throwAccuracy: string;
  note: string;
}

interface DefensivePlayLogProps {
  plays: DefensivePlay[];
  onPlaysChange: (plays: DefensivePlay[]) => void;
}

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
const PLAY_TYPES = ['Ground Ball', 'Fly Ball', 'Line Drive', 'Pop Up', 'Bunt', 'Relay', 'Wall Play'];
const RESULTS = ['Clean', 'Error', 'Assist'];
const REACTIONS = ['Poor', 'Avg', 'Elite'];

function ToggleGroup({ label, options, value, onChange, cols = 3 }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; cols?: number;
}) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className={cn('grid gap-1 mt-0.5', `grid-cols-${cols}`)}>
        {options.map(o => (
          <button key={o} type="button" onClick={() => onChange(o)}
            className={cn('px-1.5 py-1 rounded text-xs font-medium border transition-all',
              value === o ? 'bg-primary text-primary-foreground ring-1 ring-primary' : 'bg-muted/30 hover:bg-muted/50'
            )}
          >{o}</button>
        ))}
      </div>
    </div>
  );
}

const EMPTY_PLAY: DefensivePlay = { position: '', playType: '', result: '', firstStep: '', throwAccuracy: '', note: '' };

export function DefensivePlayLog({ plays, onPlaysChange }: DefensivePlayLogProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DefensivePlay>({ ...EMPTY_PLAY });

  const canLog = draft.position && draft.playType && draft.result;

  const logPlay = () => {
    if (!canLog) return;
    onPlaysChange([...plays, { ...draft }]);
    setDraft({ ...EMPTY_PLAY });
  };

  const removePlay = (idx: number) => {
    onPlaysChange(plays.filter((_, i) => i !== idx));
  };

  const updateDraft = (key: keyof DefensivePlay, value: string) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const resultIcon = (r: string) => r === 'Clean' ? '✓' : r === 'Error' ? '✗' : '↗';

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full justify-between py-1">
        <span className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Defensive Plays {plays.length > 0 && <span className="text-primary">({plays.length})</span>}
        </span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-3">
        {/* Logged plays */}
        {plays.length > 0 && (
          <div className="space-y-1">
            {plays.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-muted/30 rounded px-2 py-1 text-xs">
                <span className="font-medium">
                  {p.position} — {p.playType} — {p.result} {resultIcon(p.result)}
                  {p.firstStep && <span className="text-muted-foreground ml-1">• {p.firstStep}</span>}
                </span>
                <button type="button" onClick={() => removePlay(i)} className="text-muted-foreground hover:text-destructive ml-2">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add play form */}
        <div className="space-y-2 border border-dashed rounded-md p-2">
          {/* Position */}
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fielder</Label>
            <div className="grid grid-cols-5 gap-1 mt-0.5">
              {POSITIONS.map(pos => (
                <button key={pos} type="button" onClick={() => updateDraft('position', pos)}
                  className={cn('px-1 py-1 rounded text-xs font-medium border transition-all',
                    draft.position === pos ? 'bg-primary text-primary-foreground ring-1 ring-primary' : 'bg-muted/30 hover:bg-muted/50'
                  )}
                >{pos}</button>
              ))}
            </div>
          </div>

          <ToggleGroup label="Play Type" options={PLAY_TYPES} value={draft.playType} onChange={v => updateDraft('playType', v)} cols={4} />
          <ToggleGroup label="Result" options={RESULTS} value={draft.result} onChange={v => updateDraft('result', v)} />
          <div className="grid grid-cols-2 gap-2">
            <ToggleGroup label="First Step" options={REACTIONS} value={draft.firstStep} onChange={v => updateDraft('firstStep', v)} />
            <ToggleGroup label="Throw Accuracy" options={REACTIONS} value={draft.throwAccuracy} onChange={v => updateDraft('throwAccuracy', v)} />
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Note (optional)</Label>
            <Input className="h-7 text-xs mt-0.5" placeholder="e.g. great backhand" value={draft.note} onChange={e => updateDraft('note', e.target.value)} />
          </div>

          <Button size="sm" className="w-full h-7 text-xs" onClick={logPlay} disabled={!canLog}>
            <Plus className="h-3 w-3 mr-1" /> Log Play
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
