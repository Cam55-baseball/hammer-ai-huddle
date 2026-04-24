import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type SideMode = 'R' | 'L' | 'BOTH';

interface SessionIntentGateProps {
  module: string;
  onSelect: (mode: SideMode) => void;
}

const hittingOptions: { value: SideMode; label: string }[] = [
  { value: 'R', label: 'Right' },
  { value: 'BOTH', label: 'Switch' },
  { value: 'L', label: 'Left' },
];

const throwingOptions: { value: SideMode; label: string }[] = [
  { value: 'R', label: 'Right' },
  { value: 'BOTH', label: 'Ambidextrous' },
  { value: 'L', label: 'Left' },
];

const MOODS = ['😞', '😐', '🙂', '😊', '🤩'];
const ENERGY = [1, 2, 3, 4, 5];

export function SessionIntentGate({ module, onSelect }: SessionIntentGateProps) {
  const isHitting = module === 'hitting' || module === 'bunting';
  const options = isHitting ? hittingOptions : throwingOptions;
  const title = isHitting ? "Today's Batting Side" : "Today's Throwing Hand";
  const { user } = useAuth();
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);

  const captureMood = async (m: number) => {
    setMood(m);
    if (!user) return;
    try {
      await (supabase as any).from('session_start_moods').insert({
        user_id: user.id, mood: m + 1, energy: energy ?? 3,
      });
    } catch {}
  };
  const captureEnergy = async (e: number) => {
    setEnergy(e);
    if (!user) return;
    try {
      await (supabase as any).from('session_start_moods').insert({
        user_id: user.id, mood: (mood ?? 2) + 1, energy: e,
      });
    } catch {}
  };

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-center mb-1">{title}</p>
          <p className="text-xs text-muted-foreground text-center mb-3">
            Tap to set your focus for this session
          </p>
          <div className="grid grid-cols-3 gap-2">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSelect(opt.value)}
                className={cn(
                  'rounded-lg border-2 py-2.5 px-2 text-center font-semibold transition-all text-xs',
                  'bg-muted/20 border-border hover:bg-muted/40 text-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Optional 1-tap mood + energy capture (additive, never blocks) */}
        <div className="border-t pt-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground text-center">How do you feel? (optional)</p>
          <div className="flex justify-center gap-1.5">
            {MOODS.map((emoji, i) => (
              <button
                key={i}
                type="button"
                onClick={() => captureMood(i)}
                className={cn(
                  'h-8 w-8 rounded-full border text-base transition-all',
                  mood === i ? 'border-primary bg-primary/10 scale-110' : 'border-border bg-muted/20 hover:bg-muted/40'
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="flex justify-center gap-1.5">
            {ENERGY.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => captureEnergy(e)}
                className={cn(
                  'h-6 px-2 rounded border text-[10px] transition-all',
                  energy === e ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border bg-muted/20 hover:bg-muted/40'
                )}
              >
                ⚡{e}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

