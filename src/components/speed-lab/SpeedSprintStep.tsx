import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Users, Timer } from 'lucide-react';
import { DistanceConfig } from '@/data/speedLabProgram';

interface SpeedSprintStepProps {
  distances: DistanceConfig[];
  onContinue: () => void;
}

export function SpeedSprintStep({ distances, onContinue }: SpeedSprintStepProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Hero instruction */}
      <div className="text-center">
        <div className="text-5xl mb-3">🏃‍♂️💨</div>
        <h2 className="text-2xl font-bold mb-1">
          {t('speedLab.sprintStep.title', 'Run Your Sprints!')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('speedLab.sprintStep.subtitle', 'Time to test your speed')}
        </p>
      </div>

      {/* Main instruction card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed">
              {t('speedLab.sprintStep.instruction', 'Find a flat, open space. Sprint as fast as you can!')}
            </p>
          </div>

          {/* Distance cards */}
          <div className="space-y-2">
            {distances.map((d) => (
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
                <Badge variant="outline" className="text-[10px]">
                  {t('speedLab.sprintStep.optional', 'Optional')}
                </Badge>
              </div>
            ))}
          </div>

          {/* Rest tip */}
          <div className="flex items-center gap-2 bg-amber-500/10 rounded-lg px-3 py-2">
            <Timer className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              {t('speedLab.sprintStep.restTip', 'Rest 2-3 minutes between sprints')}
            </p>
          </div>

          {/* Partner tip */}
          <div className="flex items-center gap-2 bg-blue-500/10 rounded-lg px-3 py-2">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
              {t('speedLab.sprintStep.partnerTip', 'Have someone tap START when you go and STOP when you finish')}
            </p>
          </div>

          {/* All optional note */}
          <p className="text-xs text-muted-foreground text-center italic">
            {t('speedLab.sprintStep.allOptional', "All distances are optional — run what you can!")}
          </p>
        </CardContent>
      </Card>

      <Button
        className="w-full h-14 text-lg font-bold"
        size="lg"
        onClick={onContinue}
      >
        {t('speedLab.sprintStep.done', "I'm Done Sprinting →")}
      </Button>
    </div>
  );
}
