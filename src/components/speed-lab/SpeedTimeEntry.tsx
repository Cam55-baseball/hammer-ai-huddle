import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DistanceConfig } from '@/data/speedLabProgram';
import { PartnerTimer } from './PartnerTimer';

interface SpeedTimeEntryProps {
  distances: DistanceConfig[];
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
}

export function SpeedTimeEntry({ distances, values, onChange }: SpeedTimeEntryProps) {
  const { t } = useTranslation();
  const [partnerMode, setPartnerMode] = useState(false);
  const [activeTimerDistance, setActiveTimerDistance] = useState<string | null>(null);

  const handleTimerComplete = (distance: string, timeSeconds: number) => {
    onChange(distance, parseFloat(timeSeconds.toFixed(2)));
    setActiveTimerDistance(null);
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

      {/* Distance Inputs */}
      {distances.map((dist) => (
        <Card key={dist.key}>
          <CardContent className="pt-4 pb-4">
            <Label className="font-semibold text-sm mb-2 block">{dist.label}</Label>

            {partnerMode && activeTimerDistance === dist.key ? (
              <PartnerTimer
                distanceLabel={dist.label}
                onComplete={(time) => handleTimerComplete(dist.key, time)}
                onCancel={() => setActiveTimerDistance(null)}
              />
            ) : (
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="30"
                  placeholder="0.00"
                  value={values[dist.key] || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0) onChange(dist.key, val);
                    else if (e.target.value === '') onChange(dist.key, 0);
                  }}
                  className="text-2xl font-mono h-14 text-center"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">sec</span>
                {partnerMode && (
                  <button
                    onClick={() => setActiveTimerDistance(dist.key)}
                    className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                  >
                    ⏱ {t('speedLab.logResults.startTimer', 'Timer')}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
