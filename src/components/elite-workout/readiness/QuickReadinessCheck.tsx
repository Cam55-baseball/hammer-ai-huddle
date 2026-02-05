import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { QuickReadinessCheck, ReadinessData } from '@/types/eliteWorkout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Battery, Moon, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

interface QuickReadinessCheckProps {
  onComplete: (check: QuickReadinessCheck) => void;
  existingVaultData?: ReadinessData['fromVault'];
  className?: string;
}

export function QuickReadinessCheckCard({ 
  onComplete, 
  existingVaultData,
  className 
}: QuickReadinessCheckProps) {
  const { t } = useTranslation();
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [soreness, setSoreness] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  
  const isComplete = sleepQuality && energyLevel && soreness;
  
  const handleComplete = () => {
    if (sleepQuality && energyLevel && soreness) {
      onComplete({
        sleepQuality,
        energyLevel,
        soreness,
        timestamp: new Date().toISOString(),
      });
    }
  };
  
  const RatingButton = ({ 
    value, 
    selected, 
    onSelect, 
    emoji 
  }: { 
    value: 1 | 2 | 3 | 4 | 5; 
    selected: boolean; 
    onSelect: () => void;
    emoji: string;
  }) => (
    <button
      onClick={onSelect}
      className={cn(
        'w-12 h-12 rounded-xl text-2xl transition-all',
        'hover:scale-110 active:scale-95',
        selected 
          ? 'bg-primary text-primary-foreground shadow-lg scale-110' 
          : 'bg-muted hover:bg-muted/80'
      )}
    >
      {emoji}
    </button>
  );
  
  const SLEEP_EMOJIS = ['😫', '😴', '😐', '😊', '🤩'];
  const ENERGY_EMOJIS = ['🪫', '🔋', '⚡', '💪', '🔥'];
  const SORENESS_EMOJIS = ['😵', '🥴', '😬', '😌', '💯'];
  
  return (
    <Card className={cn('border-primary/20', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {t('eliteWorkout.readiness.title', 'Quick Readiness Check')}
          </CardTitle>
          {existingVaultData && (
            <Badge variant="outline" className="text-xs">
              {t('eliteWorkout.readiness.vaultDataAvailable', 'Vault data available')}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sleep Quality */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Moon className="h-4 w-4" />
            {t('eliteWorkout.readiness.sleepQuality', 'How did you sleep?')}
          </div>
          <div className="flex justify-between gap-1">
            {([1, 2, 3, 4, 5] as const).map((val, i) => (
              <RatingButton
                key={val}
                value={val}
                selected={sleepQuality === val}
                onSelect={() => setSleepQuality(val)}
                emoji={SLEEP_EMOJIS[i]}
              />
            ))}
          </div>
        </div>
        
        {/* Energy Level */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Battery className="h-4 w-4" />
            {t('eliteWorkout.readiness.energyLevel', 'Energy level?')}
          </div>
          <div className="flex justify-between gap-1">
            {([1, 2, 3, 4, 5] as const).map((val, i) => (
              <RatingButton
                key={val}
                value={val}
                selected={energyLevel === val}
                onSelect={() => setEnergyLevel(val)}
                emoji={ENERGY_EMOJIS[i]}
              />
            ))}
          </div>
        </div>
        
        {/* Soreness */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            {t('eliteWorkout.readiness.soreness', 'Any soreness?')}
          </div>
          <div className="flex justify-between gap-1">
            {([1, 2, 3, 4, 5] as const).map((val, i) => (
              <RatingButton
                key={val}
                value={val}
                selected={soreness === val}
                onSelect={() => setSoreness(val)}
                emoji={SORENESS_EMOJIS[i]}
              />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            {t('eliteWorkout.readiness.sorenessHint', '😵 = very sore, 💯 = feeling great')}
          </p>
        </div>
        
        {/* Submit */}
        <Button
          onClick={handleComplete}
          disabled={!isComplete}
          className="w-full gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          {t('eliteWorkout.readiness.ready', "I'm Ready!")}
        </Button>
      </CardContent>
    </Card>
  );
}

interface ReadinessIndicatorProps {
  data: ReadinessData;
  className?: string;
}

export function ReadinessIndicator({ data, className }: ReadinessIndicatorProps) {
  const { t } = useTranslation();
  
  const score = data.overallScore || calculateReadinessScore(data);
  
  const getScoreColor = () => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };
  
  const getRecommendation = () => {
    if (score >= 80) return { key: 'full_send', label: '🚀 Full Send!', color: 'bg-green-500/20' };
    if (score >= 60) return { key: 'modify_volume', label: '⚡ Modify Volume', color: 'bg-amber-500/20' };
    return { key: 'recovery_focus', label: '🌙 Recovery Focus', color: 'bg-red-500/20' };
  };
  
  const rec = getRecommendation();
  
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('text-2xl font-bold tabular-nums', getScoreColor())}>
        {score}%
      </div>
      <Badge variant="outline" className={cn('text-xs', rec.color)}>
        {rec.label}
      </Badge>
    </div>
  );
}

function calculateReadinessScore(data: ReadinessData): number {
  let score = 100;
  
  if (data.quickCheck) {
    const { sleepQuality, energyLevel, soreness } = data.quickCheck;
    // Each factor contributes equally
    const sleepScore = (sleepQuality / 5) * 33;
    const energyScore = (energyLevel / 5) * 33;
    const sorenessScore = (soreness / 5) * 34;
    score = Math.round(sleepScore + energyScore + sorenessScore);
  }
  
  if (data.fromVault) {
    // Adjust based on vault data
    if (data.fromVault.sleepQuality && data.fromVault.sleepQuality < 3) {
      score -= 10;
    }
    if (data.fromVault.stressLevel && data.fromVault.stressLevel > 7) {
      score -= 15;
    }
    if (data.fromVault.painAreas && data.fromVault.painAreas.length > 0) {
      score -= data.fromVault.painAreas.length * 5;
    }
  }
  
  return Math.max(0, Math.min(100, score));
}
