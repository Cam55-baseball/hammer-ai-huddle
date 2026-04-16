import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PitchLocationGrid } from '@/components/micro-layer/PitchLocationGrid';
import { PitchMovementSelector } from '@/components/micro-layer/PitchMovementSelector';
import { useSportConfig } from '@/hooks/useSportConfig';
import { normalizeDirections, deriveMovementKey } from '@/lib/pitchMovementProfile';
import { cn } from '@/lib/utils';


const PITCH_RESULTS = [
  { value: 'ball', label: 'Ball', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-300' },
  { value: 'called_strike', label: 'Called Strike', color: 'bg-green-500/20 text-green-700 dark:text-green-300' },
  { value: 'swinging_strike', label: 'Swinging Strike', color: 'bg-green-600/20 text-green-800 dark:text-green-200' },
  { value: 'foul', label: 'Foul', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' },
  { value: 'in_play_out', label: 'In Play (Out)', color: 'bg-red-500/20 text-red-700 dark:text-red-300' },
  { value: 'in_play_hit', label: 'In Play (Hit)', color: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
];

interface PitchEntryProps {
  onSubmit: (pitch: PitchData) => void;
  advancedMode: boolean;
  pitchNumber: number;
  sport: 'baseball' | 'softball';
}

export interface PitchData {
  pitch_type?: string;
  pitch_velocity_mph?: number;
  velocity_band?: string;
  pitch_location?: { row: number; col: number };
  pitch_result: string;
  exit_velocity_mph?: number;
  launch_angle?: number;
  spray_direction?: string;
  contact_quality?: string;
  batted_ball_type?: string;
  pitch_movement?: { directions: ('up' | 'down' | 'left' | 'right')[]; key: string };
  pitch_movement_profile?: string;
}

export function PitchEntry({ onSubmit, advancedMode, pitchNumber, sport }: PitchEntryProps) {
  const { pitchTypes } = useSportConfig();
  const [pitchType, setPitchType] = useState('');
  const [velocity, setVelocity] = useState('');
  const [location, setLocation] = useState<{ row: number; col: number } | undefined>();
  const [result, setResult] = useState('');
  const [exitVelo, setExitVelo] = useState('');
  const [launchAngle, setLaunchAngle] = useState('');
  const [spray, setSpray] = useState('');
  const [contactQuality, setContactQuality] = useState('');
  const [battedBallType, setBattedBallType] = useState('');
  const [pitchMovement, setPitchMovement] = useState<('up' | 'down' | 'left' | 'right')[]>([]);

  const isInPlay = result === 'in_play_out' || result === 'in_play_hit';

  const handleSubmit = () => {
    if (!result) return;
    const pitch: PitchData = {
      pitch_result: result,
      ...(pitchType && { pitch_type: pitchType }),
      ...(velocity && { pitch_velocity_mph: Number(velocity) }),
      ...(location && { pitch_location: location }),
      ...(isInPlay && exitVelo && { exit_velocity_mph: Number(exitVelo) }),
      ...(isInPlay && launchAngle && { launch_angle: Number(launchAngle) }),
      ...(isInPlay && spray && { spray_direction: spray }),
      ...(isInPlay && contactQuality && { contact_quality: contactQuality }),
      ...(isInPlay && battedBallType && { batted_ball_type: battedBallType }),
      pitch_movement: {
        directions: normalizeDirections(pitchMovement),
        key: deriveMovementKey(pitchMovement),
      },
    };
    onSubmit(pitch);
    // Reset
    setPitchType('');
    setVelocity('');
    setLocation(undefined);
    setResult('');
    setExitVelo('');
    setLaunchAngle('');
    setSpray('');
    setContactQuality('');
    setBattedBallType('');
    setPitchMovement([]);
  };

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground">Pitch #{pitchNumber}</span>
      </div>

      {/* Quick result buttons */}
      <div>
        <Label className="text-xs">Result <span className="text-destructive">*</span></Label>
        <div className="grid grid-cols-3 gap-1.5 mt-1">
          {PITCH_RESULTS.map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => setResult(r.value)}
              className={cn(
                'px-2 py-1.5 rounded text-xs font-medium border transition-all',
                result === r.value ? `${r.color} ring-2 ring-primary` : 'bg-muted/30 hover:bg-muted/50'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {advancedMode && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Pitch Type</Label>
              <Select value={pitchType} onValueChange={setPitchType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {pitchTypes.map(pt => (
                    <SelectItem key={pt.id} value={pt.id}>{pt.abbreviation} — {pt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Velocity (MPH)</Label>
              <Input type="number" className="h-8 text-xs" value={velocity} onChange={e => setVelocity(e.target.value)} placeholder="e.g. 87" />
            </div>
          </div>

          <PitchLocationGrid value={location} onSelect={setLocation} sport={sport} />

          <PitchMovementSelector value={pitchMovement} onChange={setPitchMovement} />

          {isInPlay && (
            <div className="space-y-3 border-t pt-3">
              <Label className="text-xs font-bold">Batted Ball Data</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Exit Velocity (MPH)</Label>
                  <Input type="number" className="h-8 text-xs" value={exitVelo} onChange={e => setExitVelo(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Launch Angle</Label>
                  <Input type="number" className="h-8 text-xs" value={launchAngle} onChange={e => setLaunchAngle(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Contact</Label>
                  <Select value={contactQuality} onValueChange={setContactQuality}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {['hard', 'medium', 'soft'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={battedBallType} onValueChange={setBattedBallType}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {['ground_ball', 'line_drive', 'fly_ball', 'pop_up'].map(v => (
                        <SelectItem key={v} value={v}>{v.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Spray</Label>
                  <Select value={spray} onValueChange={setSpray}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {['pull_line', 'pull', 'left_center', 'center', 'right_center', 'oppo', 'oppo_line'].map(v => (
                        <SelectItem key={v} value={v}>{v.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Button onClick={handleSubmit} disabled={!result} size="sm" className="w-full">
        Log Pitch
      </Button>
    </div>
  );
}
