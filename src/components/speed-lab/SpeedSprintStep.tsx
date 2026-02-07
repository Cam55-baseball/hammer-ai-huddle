import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Timer, AlertTriangle, Footprints } from 'lucide-react';
import { DistanceConfig, SportType, GAME_READY_SPRINT_TARGET } from '@/data/speedLabProgram';

interface SpeedSprintStepProps {
  distances: DistanceConfig[];
  sprintReps: Record<string, number>;
  readinessAdjusted: boolean;
  readinessScore: number;
  sessionNumber: number;
  sport: SportType;
  barefootDistances: string[];
  onContinue: () => void;
}

export function SpeedSprintStep({
  distances,
  sprintReps,
  readinessAdjusted,
  readinessScore,
  sessionNumber,
  sport,
  barefootDistances,
  onContinue,
}: SpeedSprintStepProps) {
  const { t } = useTranslation();

  const totalSprints = useMemo(
    () => Object.values(sprintReps).reduce((a, b) => a + b, 0),
    [sprintReps]
  );

  const progressPercent = Math.min((totalSprints / GAME_READY_SPRINT_TARGET) * 100, 100);

  const gameReadyMessage = sport === 'baseball'
    ? t('speedLab.sprintStep.gameReadyBaseball', 'Train to sprint 16 times in a game. Full MLB season ready.')
    : t('speedLab.sprintStep.gameReadySoftball', 'Train to sprint 16 times in a game. Full AUSL season ready.');

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Hero */}
      <div className="text-center">
        <div className="text-5xl mb-3">🏃‍♂️💨</div>
        <h2 className="text-2xl font-bold mb-1">
          {t('speedLab.sprintStep.title', 'Run Your Sprints!')}
        </h2>
        <p className="text-sm text-muted-foreground">{gameReadyMessage}</p>
      </div>

      {/* Game-Ready Progress */}
      <Card className="border-primary/20">
        <CardContent className="pt-4 pb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">
              {t('speedLab.sprintStep.gameReadyProgress', '{{current}} of {{target}} game-ready sprints', {
                current: totalSprints,
                target: GAME_READY_SPRINT_TARGET,
              })}
            </span>
            <span className="text-xs text-muted-foreground">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Readiness Adjustment Banner */}
      {readinessAdjusted && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            {t('speedLab.sprintStep.readinessAdjusted', "Your body is recovering today. We've adjusted your sprint count.")}
          </p>
        </div>
      )}

      {/* Sprint Plan */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-5 pb-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">
              {t('speedLab.sprintStep.instruction', 'Find a flat, open space. Sprint as fast as you can!')}
            </span>
          </div>

          {distances.map((d) => {
            const reps = sprintReps[d.key] || 0;
            const isBarefoot = barefootDistances.includes(d.key);
            return (
              <div
                key={d.key}
                className="flex items-center justify-between bg-background/60 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-2">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm">{d.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">({d.yards} yd)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isBarefoot && (
                    <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-700 dark:text-green-400">
                      🦶 {t('speedLab.sprintStep.barefoot', 'Barefoot OK')}
                    </Badge>
                  )}
                  <Badge className="text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20">
                    {t('speedLab.sprintStep.reps', '{{count}} reps', { count: reps })}
                  </Badge>
                </div>
              </div>
            );
          })}

          {/* Rest tip */}
          <div className="flex items-center gap-2 bg-amber-500/10 rounded-lg px-3 py-2 mt-2">
            <Timer className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              {t('speedLab.sprintStep.restTip', 'Rest 2-3 minutes between sprints. Walk back slowly.')}
            </p>
          </div>

          {/* Barefoot explanation */}
          {barefootDistances.length > 0 && (
            <div className="flex items-start gap-2 bg-green-500/10 rounded-lg px-3 py-2">
              <Footprints className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-green-700 dark:text-green-400">
                {t('speedLab.sprintStep.barefootTip', 'Barefoot training strengthens feet, ankles, and fascial connections — the foundation of elastic speed.')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        className="w-full h-14 text-lg font-bold"
        size="lg"
        onClick={onContinue}
      >
        {t('speedLab.sprintStep.done', 'Begin Sprinting →')}
      </Button>

      {/* Barefoot Disclaimer */}
      {barefootDistances.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-center italic px-2">
          {t('speedLab.barefoot.disclaimer', 'Barefoot training is introduced gradually to strengthen feet and connective tissue. Always train on safe, clean surfaces. If you experience pain, stop immediately and return to shoes. Consult a qualified professional before beginning any barefoot training program.')}
        </p>
      )}
    </div>
  );
}
