import { Badge } from '@/components/ui/badge';

const intents = [
  { id: 'mechanics', label: 'Mechanics' },
  { id: 'power', label: 'Power' },
  { id: 'accuracy', label: 'Accuracy' },
  { id: 'timing', label: 'Timing' },
  { id: 'pitch_selection', label: 'Pitch Selection' },
  { id: 'situational', label: 'Situational' },
  { id: 'recovery', label: 'Recovery' },
  { id: 'conditioning', label: 'Conditioning' },
];

interface IntentSelectorProps {
  value: string;
  onChange: (intent: string) => void;
}

export function IntentSelector({ value, onChange }: IntentSelectorProps) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-2 block">Intent <span className="text-destructive">*</span></label>
      <div className="flex flex-wrap gap-2">
        {intents.map(intent => (
          <Badge
            key={intent.id}
            variant={value === intent.id ? 'default' : 'outline'}
            className="cursor-pointer transition-all hover:scale-105"
            onClick={() => onChange(intent.id)}
          >
            {intent.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
