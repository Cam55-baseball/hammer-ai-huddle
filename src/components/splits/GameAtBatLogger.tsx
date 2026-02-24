import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CountSelector } from '@/components/micro-layer/CountSelector';
import { ContactQualitySelector } from '@/components/micro-layer/ContactQualitySelector';
import { ExitDirectionSelector } from '@/components/micro-layer/ExitDirectionSelector';
import { PitchLocationGrid } from '@/components/micro-layer/PitchLocationGrid';
import { useDataDensityLevel } from '@/hooks/useDataDensityLevel';
import { useSportConfig } from '@/hooks/useSportConfig';
import { Plus, Trash2 } from 'lucide-react';

const RESULTS = ['single', 'double', 'triple', 'home_run', 'walk', 'strikeout', 'flyout', 'groundout', 'lineout', 'hbp', 'sac_fly', 'sac_bunt', 'error', 'fc'] as const;

interface AtBat {
  result: string;
  count?: { balls: number; strikes: number };
  contactQuality?: string;
  exitDirection?: string;
  pitchLocation?: { row: number; col: number };
}

interface GameAtBatLoggerProps {
  atBats: AtBat[];
  onAdd: (ab: AtBat) => void;
  onRemove: (index: number) => void;
}

export function GameAtBatLogger({ atBats, onAdd, onRemove }: GameAtBatLoggerProps) {
  const { isAdvanced } = useDataDensityLevel();
  const { hittingOutcomes } = useSportConfig();
  const [result, setResult] = useState('');
  const [count, setCount] = useState<{ balls: number; strikes: number }>({ balls: 0, strikes: 0 });
  const [contactQuality, setContactQuality] = useState<string>();
  const [exitDirection, setExitDirection] = useState<string>();
  const [pitchLoc, setPitchLoc] = useState<{ row: number; col: number }>();

  const handleAdd = useCallback(() => {
    if (!result) return;
    const ab: AtBat = { result, count };
    if (isAdvanced) {
      if (contactQuality) ab.contactQuality = contactQuality;
      if (exitDirection) ab.exitDirection = exitDirection;
      if (pitchLoc) ab.pitchLocation = pitchLoc;
    }
    onAdd(ab);
    setResult('');
    setCount({ balls: 0, strikes: 0 });
    setContactQuality(undefined);
    setExitDirection(undefined);
    setPitchLoc(undefined);
  }, [result, count, contactQuality, exitDirection, pitchLoc, isAdvanced, onAdd]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Game At-Bats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logged at-bats */}
        {atBats.map((ab, i) => (
          <div key={i} className="flex items-center justify-between rounded border p-2 text-sm">
            <span className="font-medium capitalize">#{i + 1}: {ab.result.replace('_', ' ')}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {/* New at-bat form */}
        <div className="space-y-3 rounded-lg border border-dashed p-3">
          <Select value={result} onValueChange={setResult}>
            <SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
            <SelectContent>
              {RESULTS.map(r => (
                <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <CountSelector value={count} onChange={setCount} />

          {isAdvanced && (
            <div className="grid grid-cols-2 gap-3">
              <ContactQualitySelector value={contactQuality} onValueChange={setContactQuality} />
              <ExitDirectionSelector value={exitDirection} onValueChange={setExitDirection} />
            </div>
          )}

          {isAdvanced && (
            <PitchLocationGrid value={pitchLoc} onSelect={setPitchLoc} />
          )}

          <Button onClick={handleAdd} disabled={!result} size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Log At-Bat
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
