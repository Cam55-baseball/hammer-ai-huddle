import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, Heart } from 'lucide-react';
import { BREAK_DAY_DRILLS } from '@/data/speedLabProgram';
import { SpeedDrillCard } from './SpeedDrillCard';

interface BreakDayContentProps {
  onComplete: (drillLog: string[]) => void;
  onOverride: () => void;
}

export function BreakDayContent({ onComplete, onOverride }: BreakDayContentProps) {
  const { t } = useTranslation();
  const [completedDrills, setCompletedDrills] = useState<Record<string, boolean>>({});

  const toggleDrill = (drillId: string, completed: boolean) => {
    setCompletedDrills(prev => ({ ...prev, [drillId]: completed }));
  };

  const completedList = Object.entries(completedDrills)
    .filter(([, v]) => v)
    .map(([k]) => k);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Break Day Header */}
      <Card className="border-sky-500/30 bg-gradient-to-br from-sky-500/5 to-blue-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sky-700 dark:text-sky-400">
            <Shield className="h-5 w-5" />
            {t('speedLab.breakDay.title', 'Today We Protect Speed')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('speedLab.breakDay.message', 'Your body is telling us it needs a lighter day. Smart athletes listen. This session focuses on recovery and mobility so you come back faster.')}
          </p>
          <div className="flex items-center gap-2 mt-3 text-xs text-sky-600 dark:text-sky-400">
            <Heart className="h-3.5 w-3.5" />
            {t('speedLab.breakDay.fasciaInsight', 'Recovery is where speed is built.')}
          </div>
        </CardContent>
      </Card>

      {/* Break Day Drills */}
      <div className="space-y-2">
        {BREAK_DAY_DRILLS.map((drill) => (
          <SpeedDrillCard
            key={drill.id}
            drill={drill}
            completed={completedDrills[drill.id] || false}
            onToggle={(completed) => toggleDrill(drill.id, completed)}
          />
        ))}
      </div>

      {/* Complete Button */}
      <Button
        className="w-full h-14 text-lg font-bold"
        size="lg"
        onClick={() => onComplete(completedList)}
      >
        {t('speedLab.breakDay.complete', 'Complete Recovery Session')}
      </Button>

      {/* Override Option */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
            {t('speedLab.breakDay.override', 'I feel ready to train')}
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('speedLab.breakDay.overrideTitle', 'Override Break Day?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('speedLab.breakDay.overrideMessage', 'Your body signals suggest a recovery day. Are you sure you want to do a full speed session? Listen to your body — there is no shame in protecting it.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('speedLab.breakDay.stayRecovery', 'Stay on Recovery')}</AlertDialogCancel>
            <AlertDialogAction onClick={onOverride}>
              {t('speedLab.breakDay.confirmOverride', "Yes, I'm Ready")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
