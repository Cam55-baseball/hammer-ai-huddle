import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface FeelingState {
  body: number; // 1-5
  mind: number; // 1-5
  note?: string;
}

interface FeelingsPromptProps {
  value: FeelingState;
  onChange: (state: FeelingState) => void;
}

const bodyOptions = [
  { value: 1, emoji: '🤕', label: 'Hurting' },
  { value: 2, emoji: '😓', label: 'Tired' },
  { value: 3, emoji: '😐', label: 'OK' },
  { value: 4, emoji: '💪', label: 'Good' },
  { value: 5, emoji: '🔥', label: 'Great' },
];

const mindOptions = [
  { value: 1, emoji: '😵', label: 'Struggling' },
  { value: 2, emoji: '😶‍🌫️', label: 'Distracted' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🎯', label: 'Focused' },
  { value: 5, emoji: '🔒', label: 'Locked In' },
];

export function FeelingsPrompt({ value, onChange }: FeelingsPromptProps) {
  return (
    <Card>
      <CardContent className="py-4 space-y-4">
        {/* Body */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            How is your body feeling right now?
          </label>
          <div className="grid grid-cols-5 gap-2">
            {bodyOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...value, body: opt.value })}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border p-2 transition-all',
                  value.body === opt.value
                    ? 'bg-primary/10 border-primary ring-2 ring-primary scale-105'
                    : 'bg-muted/20 border-border hover:bg-muted'
                )}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-[10px] font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mind */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Mentally, where are you at?
          </label>
          <div className="grid grid-cols-5 gap-2">
            {mindOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...value, mind: opt.value })}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border p-2 transition-all',
                  value.mind === opt.value
                    ? 'bg-primary/10 border-primary ring-2 ring-primary scale-105'
                    : 'bg-muted/20 border-border hover:bg-muted'
                )}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-[10px] font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Optional note */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Anything specific to note? <span className="opacity-50">(optional)</span>
          </label>
          <Textarea
            placeholder="Shoulder felt tight, had great energy, etc."
            value={value.note ?? ''}
            onChange={e => onChange({ ...value, note: e.target.value })}
            rows={2}
            className="text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
