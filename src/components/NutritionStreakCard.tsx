import { useTranslation } from 'react-i18next';
import { Flame, Trophy, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalVisits: number;
  tipsCollected: number;
  badgesEarned: string[];
}

interface NutritionStreakCardProps {
  streak: StreakData | null;
  totalTips: number;
  viewedTips: number;
  isLoading?: boolean;
}

export function NutritionStreakCard({ streak, totalTips, viewedTips, isLoading }: NutritionStreakCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-orange-500/20 via-red-500/20 to-amber-500/20 border-orange-500/30">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-4">
            <div className="h-12 w-12 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-3 bg-muted rounded w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStreak = streak?.currentStreak || 0;
  const longestStreak = streak?.longestStreak || 0;
  const tipsCollected = streak?.tipsCollected || viewedTips || 0;
  const progressPercent = totalTips > 0 ? (tipsCollected / totalTips) * 100 : 0;

  // Dynamic flame color based on streak
  const getFlameColor = () => {
    if (currentStreak >= 30) return 'text-purple-400';
    if (currentStreak >= 14) return 'text-red-400';
    if (currentStreak >= 7) return 'text-orange-400';
    return 'text-amber-400';
  };

  const getFlameGlow = () => {
    if (currentStreak >= 30) return 'drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]';
    if (currentStreak >= 14) return 'drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]';
    if (currentStreak >= 7) return 'drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]';
    return 'drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]';
  };

  return (
    <Card className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-amber-500/10 border-orange-500/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Streak Fire */}
          <div className="relative">
            <div className={`p-3 rounded-full bg-gradient-to-br from-orange-500/30 to-red-500/30 ${currentStreak > 0 ? 'animate-pulse' : ''}`}>
              <Flame className={`h-8 w-8 ${getFlameColor()} ${getFlameGlow()} transition-all`} />
            </div>
            {currentStreak > 0 && (
              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {currentStreak}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-lg">
                {currentStreak} {currentStreak === 1 ? t('nutrition.dayStreak') : t('nutrition.daysStreak')}
              </span>
              {currentStreak >= 7 && <span className="text-lg">🔥</span>}
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                {t('nutrition.best')}: {longestStreak}
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {tipsCollected} {t('nutrition.tipsCollected')}
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {t('nutrition.tipsExplored', { percent: Math.round(progressPercent), total: totalTips })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
