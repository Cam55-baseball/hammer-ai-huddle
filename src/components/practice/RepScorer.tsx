import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PitchLocationGrid } from '@/components/micro-layer/PitchLocationGrid';
import { useSportConfig } from '@/hooks/useSportConfig';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ScoredRep {
  pitch_location?: { row: number; col: number };
  contact_quality?: string;
  exit_direction?: string;
  pitch_type?: string;
  pitch_result?: string;
  swing_decision?: string;
  intent?: string;
}

interface RepScorerProps {
  module: string;
  reps: ScoredRep[];
  onRepsChange: (reps: ScoredRep[]) => void;
}

const contactOptions = [
  { value: 'miss', label: '❌ Miss', color: 'bg-red-500/20 text-red-700 border-red-300' },
  { value: 'foul', label: '⚠️ Foul', color: 'bg-amber-500/20 text-amber-700 border-amber-300' },
  { value: 'weak', label: '🔸 Weak', color: 'bg-orange-500/20 text-orange-700 border-orange-300' },
  { value: 'hard', label: '💪 Hard', color: 'bg-green-500/20 text-green-700 border-green-300' },
  { value: 'barrel', label: '🔥 Barrel', color: 'bg-primary/20 text-primary border-primary/30' },
];

const directionOptions = [
  { value: 'pull', label: 'Pull' },
  { value: 'middle', label: 'Middle' },
  { value: 'oppo', label: 'Oppo' },
];

const pitchResultOptions = [
  { value: 'strike', label: '⚡ Strike', color: 'bg-green-500/20 text-green-700 border-green-300' },
  { value: 'ball', label: '⚾ Ball', color: 'bg-red-500/20 text-red-700 border-red-300' },
  { value: 'hit', label: '💥 Hit', color: 'bg-amber-500/20 text-amber-700 border-amber-300' },
  { value: 'out', label: '✅ Out', color: 'bg-primary/20 text-primary border-primary/30' },
];

export function RepScorer({ module, reps, onRepsChange }: RepScorerProps) {
  const { pitchTypes } = useSportConfig();
  const [current, setCurrent] = useState<ScoredRep>({});
  const [step, setStep] = useState(0);

  const isHitting = module === 'hitting';
  const isPitching = module === 'pitching';

  const commitRep = useCallback(() => {
    onRepsChange([...reps, current]);
    setCurrent({});
    setStep(0);
  }, [current, reps, onRepsChange]);

  const removeRep = useCallback((index: number) => {
    onRepsChange(reps.filter((_, i) => i !== index));
  }, [reps, onRepsChange]);

  const updateCurrent = (field: keyof ScoredRep, value: any) => {
    const updated = { ...current, [field]: value };
    setCurrent(updated);

    // Auto-advance step
    if (isHitting) {
      if (field === 'pitch_location' && step === 0) setStep(1);
      if (field === 'contact_quality' && step === 1) {
        if (value === 'miss') {
          // Auto-commit misses
          onRepsChange([...reps, updated]);
          setCurrent({});
          setStep(0);
          return;
        }
        setStep(2);
      }
      if (field === 'exit_direction' && step === 2) {
        // Auto-commit
        onRepsChange([...reps, updated]);
        setCurrent({});
        setStep(0);
        return;
      }
    }
    if (isPitching) {
      if (field === 'pitch_type' && step === 0) setStep(1);
      if (field === 'pitch_location' && step === 1) setStep(2);
      if (field === 'pitch_result' && step === 2) {
        // Auto-commit
        onRepsChange([...reps, updated]);
        setCurrent({});
        setStep(0);
        return;
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Rep feed */}
      <AnimatePresence>
        {reps.length > 0 && (
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {reps.map((rep, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="group"
              >
                <Badge
                  variant="secondary"
                  className="cursor-pointer h-8 gap-1 transition-all group-hover:bg-destructive/20"
                  onClick={() => removeRep(i)}
                >
                  <span className="text-xs font-medium">#{i + 1}</span>
                  {rep.contact_quality && <span className="text-xs">{rep.contact_quality}</span>}
                  {rep.pitch_result && <span className="text-xs">{rep.pitch_result}</span>}
                  {rep.exit_direction && <span className="text-xs opacity-60">→{rep.exit_direction}</span>}
                  <Trash2 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-destructive" />
                </Badge>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Current rep input */}
      <Card className="border-dashed border-primary/30">
        <CardContent className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Rep #{reps.length + 1}
            </p>
            {reps.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {reps.length} reps logged
              </Badge>
            )}
          </div>

          {isHitting && (
            <>
              {/* Step 1: Pitch location */}
              <div className={cn(step > 0 && 'opacity-50')}>
                <PitchLocationGrid
                  value={current.pitch_location}
                  onSelect={v => updateCurrent('pitch_location', v)}
                />
              </div>

              {/* Step 2: Contact quality */}
              {step >= 1 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Contact Quality</label>
                  <div className="grid grid-cols-5 gap-2">
                    {contactOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateCurrent('contact_quality', opt.value)}
                        className={cn(
                          'rounded-lg border p-2 text-center text-xs font-medium transition-all',
                          current.contact_quality === opt.value
                            ? opt.color + ' ring-2 ring-primary scale-105'
                            : 'bg-muted/30 border-border hover:bg-muted'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Exit direction */}
              {step >= 2 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Exit Direction</label>
                  <div className="grid grid-cols-3 gap-2">
                    {directionOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateCurrent('exit_direction', opt.value)}
                        className={cn(
                          'rounded-lg border p-3 text-center text-sm font-medium transition-all',
                          current.exit_direction === opt.value
                            ? 'bg-primary/20 border-primary text-primary ring-2 ring-primary'
                            : 'bg-muted/30 border-border hover:bg-muted'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          )}

          {isPitching && (
            <>
              {/* Step 1: Pitch type */}
              <div className={cn(step > 0 && 'opacity-50')}>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Pitch Type</label>
                <div className="flex flex-wrap gap-2">
                  {pitchTypes.slice(0, 6).map(pt => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => updateCurrent('pitch_type', pt.id)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                        current.pitch_type === pt.id
                          ? 'bg-primary/20 border-primary text-primary ring-2 ring-primary'
                          : 'bg-muted/30 border-border hover:bg-muted'
                      )}
                    >
                      {pt.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Location */}
              {step >= 1 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <PitchLocationGrid
                    value={current.pitch_location}
                    onSelect={v => updateCurrent('pitch_location', v)}
                  />
                </motion.div>
              )}

              {/* Step 3: Result */}
              {step >= 2 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Result</label>
                  <div className="grid grid-cols-4 gap-2">
                    {pitchResultOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateCurrent('pitch_result', opt.value)}
                        className={cn(
                          'rounded-lg border p-3 text-center text-xs font-medium transition-all',
                          current.pitch_result === opt.value
                            ? opt.color + ' ring-2 ring-primary scale-105'
                            : 'bg-muted/30 border-border hover:bg-muted'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* Generic module: simple volume + execution */}
          {!isHitting && !isPitching && (
            <div className="text-center py-4">
              <Button onClick={commitRep} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Log Rep
              </Button>
            </div>
          )}

          {/* Manual commit for edge cases */}
          {(isHitting || isPitching) && Object.keys(current).length > 0 && (
            <Button onClick={commitRep} variant="ghost" size="sm" className="w-full text-xs">
              <Check className="h-3 w-3 mr-1" /> Commit rep manually
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
