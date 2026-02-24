import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { PitchLocationGrid } from './PitchLocationGrid';
import { useSportConfig } from '@/hooks/useSportConfig';

interface PitchingMicroInputProps {
  pitchType?: string;
  velocityBand?: string;
  spinRate?: number;
  commandZone?: { row: number; col: number };
  onPitchTypeChange: (val: string) => void;
  onVelocityBandChange: (val: string) => void;
  onSpinRateChange: (val: number) => void;
  onCommandZoneChange: (val: { row: number; col: number }) => void;
}

const velocityBands = ['<60', '60-70', '70-80', '80-90', '90+'] as const;

export function PitchingMicroInput({
  pitchType, velocityBand, spinRate, commandZone,
  onPitchTypeChange, onVelocityBandChange, onSpinRateChange, onCommandZoneChange,
}: PitchingMicroInputProps) {
  const { pitchTypes } = useSportConfig();

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Pitch Type</label>
        <Select value={pitchType} onValueChange={onPitchTypeChange}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select pitch" /></SelectTrigger>
          <SelectContent>
            {pitchTypes.map((p: any) => (
              <SelectItem key={p.id ?? p} value={p.id ?? p}>{p.name ?? p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Velocity Band</label>
          <Select value={velocityBand} onValueChange={onVelocityBandChange}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Velocity" /></SelectTrigger>
            <SelectContent>
              {velocityBands.map(v => (
                <SelectItem key={v} value={v}>{v} mph</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Spin Rate</label>
          <Input
            type="number"
            placeholder="RPM"
            value={spinRate ?? ''}
            onChange={e => onSpinRateChange(Number(e.target.value))}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <PitchLocationGrid value={commandZone} onSelect={onCommandZoneChange} />
    </div>
  );
}
