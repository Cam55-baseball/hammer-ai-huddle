import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';

const playTypes = ['ground_ball', 'fly_ball', 'line_drive', 'bunt', 'pop_up'] as const;
const results = ['clean', 'error', 'assist'] as const;

interface FieldingMicroInputProps {
  playType?: string;
  result?: string;
  throwAccuracy?: number;
  onPlayTypeChange: (val: string) => void;
  onResultChange: (val: string) => void;
  onThrowAccuracyChange: (val: number) => void;
}

export function FieldingMicroInput({
  playType, result, throwAccuracy = 50,
  onPlayTypeChange, onResultChange, onThrowAccuracyChange,
}: FieldingMicroInputProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Play Type</label>
        <Select value={playType} onValueChange={onPlayTypeChange}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select play type" /></SelectTrigger>
          <SelectContent>
            {playTypes.map(p => (
              <SelectItem key={p} value={p} className="capitalize">{p.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Result</label>
        <ToggleGroup type="single" value={result} onValueChange={v => v && onResultChange(v)}>
          {results.map(r => (
            <ToggleGroupItem key={r} value={r} variant="outline" size="sm" className="text-xs capitalize">
              {r}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Throw Accuracy ({throwAccuracy}%)</label>
        <Slider
          value={[throwAccuracy]}
          onValueChange={([v]) => onThrowAccuracyChange(v)}
          min={0} max={100} step={5}
          className="mt-1"
        />
      </div>
    </div>
  );
}
