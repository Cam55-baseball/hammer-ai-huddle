import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Moon } from 'lucide-react';
import { BodyAreaSelector } from '@/components/vault/quiz/BodyAreaSelector';

interface SpeedCheckInProps {
  onComplete: (data: {
    sleepRating: number;
    bodyFeel: string;
    painAreas: string[];
  }) => void;
}

const SLEEP_ICONS = ['😫', '😴', '🙂', '😊', '🤩'];
const BODY_FEEL_OPTIONS = [
  { key: 'good', emoji: '💪', label: 'Good' },
  { key: 'okay', emoji: '👍', label: 'Okay' },
  { key: 'tight', emoji: '😬', label: 'Tight' },
] as const;

export function SpeedCheckIn({ onComplete }: SpeedCheckInProps) {
  const { t } = useTranslation();
  const [sleepRating, setSleepRating] = useState<number>(0);
  const [bodyFeel, setBodyFeel] = useState<string>('');
  const [painAreas, setPainAreas] = useState<string[]>([]);
  const [showPainMap, setShowPainMap] = useState(false);

  const canContinue = sleepRating > 0 && bodyFeel !== '';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="text-center">
        <h2 className="text-xl font-bold">{t('speedLab.checkIn.title', 'Speed Check-In')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('speedLab.checkIn.subtitle', '30 seconds to dial in your body')}
        </p>
      </div>

      {/* Sleep Rating */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Moon className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{t('speedLab.checkIn.sleep', 'How did you sleep?')}</span>
          </div>
          <div className="flex justify-center gap-3">
            {SLEEP_ICONS.map((icon, idx) => (
              <button
                key={idx}
                onClick={() => setSleepRating(idx + 1)}
                className={`text-3xl p-2 rounded-xl transition-all duration-200 min-w-[52px] min-h-[52px] ${
                  sleepRating === idx + 1
                    ? 'bg-primary/20 scale-110 ring-2 ring-primary'
                    : 'hover:bg-muted/50 hover:scale-105'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Body Feel */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <span className="font-medium text-sm mb-3 block">
            {t('speedLab.checkIn.bodyFeel', 'How does your body feel?')}
          </span>
          <div className="flex gap-3 justify-center">
            {BODY_FEEL_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setBodyFeel(opt.key)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 min-w-[80px] min-h-[72px] ${
                  bodyFeel === opt.key
                    ? 'bg-primary/20 ring-2 ring-primary scale-105'
                    : 'bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="text-xs font-medium">
                  {t(`speedLab.checkIn.${opt.key}`, opt.label)}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pain Areas */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-sm">
              {t('speedLab.checkIn.pain', 'Any pain?')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPainMap(!showPainMap)}
            >
              {showPainMap
                ? t('speedLab.checkIn.hidePainMap', 'Hide')
                : t('speedLab.checkIn.showPainMap', 'Tap to Mark')}
            </Button>
          </div>
          {painAreas.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {painAreas.map((area) => (
                <span key={area} className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full">
                  {area}
                </span>
              ))}
            </div>
          )}
          {showPainMap && (
            <div className="mt-2">
              <BodyAreaSelector selectedAreas={painAreas} onChange={setPainAreas} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Continue Button */}
      <Button
        className="w-full h-14 text-lg font-bold"
        size="lg"
        disabled={!canContinue}
        onClick={() => onComplete({ sleepRating, bodyFeel, painAreas })}
      >
        {t('speedLab.checkIn.continue', 'Continue')}
      </Button>
    </div>
  );
}
