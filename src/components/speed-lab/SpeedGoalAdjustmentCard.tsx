import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

interface SpeedGoalAdjustmentCardProps {
  visible: boolean;
}

export function SpeedGoalAdjustmentCard({ visible }: SpeedGoalAdjustmentCardProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 animate-in slide-in-from-bottom duration-500">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="bg-amber-500/20 rounded-full p-2 flex-shrink-0">
            <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-sm mb-1">
              {t('speedLab.adjustment.title', 'Speed Focus Shift')}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('speedLab.adjustment.message', "Your body is adapting. We're shifting focus to help speed stick. This is normal — it means your nervous system is building a stronger foundation.")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
