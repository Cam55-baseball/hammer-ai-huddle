import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { DistanceConfig } from '@/data/speedLabProgram';
import { PartnerTimer } from './PartnerTimer';

interface SpeedTimeEntryProps {
  distances: DistanceConfig[];
  sprintReps: Record<string, number>;
  values: Record<string, number[]>;
  personalBests: Record<string, number>;
  onChange: (key: string, repIndex: number, value: number) => void;
  onTimingMethod?: (key: string, method: 'self' | 'partner') => void;
}

export function SpeedTimeEntry({
  distances,
  sprintReps,
  values,
  personalBests,
  onChange,
  onTimingMethod,
}: SpeedTimeEntryProps) {
  const { t } = useTranslation();
  const [partnerMode, setPartnerMode] = useState(false);
  const [activeTimer, setActiveTimer] = useState<{ distanceKey: string; repIndex: number } | null>(null);

  const handleTimerComplete = (distanceKey: string, repIndex: number, timeSeconds: number) => {
    onChange(distanceKey, repIndex, parseFloat(timeSeconds.toFixed(2)));
    onTimingMethod?.(distanceKey, 'partner');
    setActiveTimer(null);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold">{t('speedLab.logResults.title', 'Log Your Times')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('speedLab.logResults.subtitle', 'Enter your sprint times in seconds')}
        </p>
      </div>

      {/* Partner Mode Toggle */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-sm">
                {t('speedLab.logResults.partnerMode', 'Partner Mode')}
              </span>
              <p className="text-xs text-muted-foreground">
                {t('speedLab.logResults.partnerModeDesc', 'Have a coach or parent time you')}
              </p>
            </div>
            <Switch checked={partnerMode} onCheckedChange={setPartnerMode} />
          </div>
        </CardContent>
      </Card>

      {/* Distance Cards with Per-Rep Inputs */}
      {distances.map((dist) => {
        const reps = sprintReps[dist.key] || 1;
        const repTimes = values[dist.key] || [];
        const pb = personalBests[dist.key];
        const validTimes = repTimes.filter(t => t > 0);
        const bestTimeInSession = validTimes.length > 0 ? Math.min(...validTimes) : null;

        return (
          <Card key={dist.key}>
            <CardContent className="pt-4 pb-4 space-y-3">
              {/* Distance Header */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold text-sm">{dist.label}</Label>
                  <span className="text-xs text-muted-foreground ml-2">
                    {t('speedLab.sprintStep.reps', '{{count}} reps', { count: reps })}
                  </span>
                </div>
                {pb > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    {t('speedLab.logResults.pbLabel', 'PB: {{time}}s', { time: pb.toFixed(2) })}
                  </Badge>
                )}
              </div>

              {/* Rep Inputs */}
              {Array.from({ length: reps }, (_, repIdx) => {
                const isTimerActive = activeTimer?.distanceKey === dist.key && activeTimer?.repIndex === repIdx;
                const repTime = repTimes[repIdx] || 0;
                const isBest = bestTimeInSession !== null && repTime > 0 && repTime === bestTimeInSession;
                const isNewPB = pb > 0 && repTime > 0 && repTime < pb;

                if (isTimerActive && partnerMode) {
                  return (
                    <PartnerTimer
                      key={repIdx}
                      distanceLabel={`${dist.label} - ${t('speedLab.logResults.rep', 'Rep {{number}}', { number: repIdx + 1 })}`}
                      onComplete={(time) => handleTimerComplete(dist.key, repIdx, time)}
                      onCancel={() => setActiveTimer(null)}
                    />
                  );
                }

                return (
                  <div key={repIdx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12 shrink-0">
                      {t('speedLab.logResults.rep', 'Rep {{number}}', { number: repIdx + 1 })}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="30"
                      placeholder="0.00"
                      value={repTime || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0) onChange(dist.key, repIdx, val);
                        else if (e.target.value === '') onChange(dist.key, repIdx, 0);
                      }}
                      className="text-lg font-mono h-10 text-center flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-6">sec</span>
                    {isBest && repTime > 0 && (
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                    )}
                    {isNewPB && (
                      <Badge className="text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 shrink-0">
                        {t('speedLab.logResults.newPB', 'New PB!')}
                      </Badge>
                    )}
                    {partnerMode && !isTimerActive && (
                      <button
                        onClick={() => setActiveTimer({ distanceKey: dist.key, repIndex: repIdx })}
                        className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0"
                      >
                        ⏱
                      </button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
