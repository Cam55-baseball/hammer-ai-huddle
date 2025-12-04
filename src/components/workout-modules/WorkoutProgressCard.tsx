import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Flame, Trophy, Calendar } from 'lucide-react';

interface WorkoutProgressCardProps {
  currentWeek: number;
  totalWeeks?: number;
  weekCompletionPercent: number;
  overallPercent: number;
  lastActivity?: string;
}

export function WorkoutProgressCard({
  currentWeek,
  totalWeeks = 6,
  weekCompletionPercent,
  overallPercent,
  lastActivity,
}: WorkoutProgressCardProps) {
  const { t } = useTranslation();

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('workoutModules.notStarted');
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flame className="h-5 w-5 text-orange-500" />
          {t('workoutModules.yourProgress')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t('workoutModules.currentWeek')}
            </span>
          </div>
          <Badge variant="secondary" className="text-lg font-bold px-3">
            {currentWeek} / {totalWeeks}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t('workoutModules.thisWeek')}</span>
            <span className="font-medium">{weekCompletionPercent}%</span>
          </div>
          <Progress value={weekCompletionPercent} className="h-2" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t('workoutModules.overallProgress')}</span>
            <span className="font-medium">{overallPercent}%</span>
          </div>
          <Progress value={overallPercent} className="h-2" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4" />
            {t('workoutModules.lastActivity')}
          </div>
          <span className="text-sm">{formatDate(lastActivity)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
