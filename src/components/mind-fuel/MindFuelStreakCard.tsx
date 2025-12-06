import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Flame, Trophy, Brain, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalVisits: number;
  lessonsCollected: number;
  badgesEarned: string[];
  categoriesExplored: Record<string, number>;
}

interface StatsData {
  totalLessons: number;
  viewedLessons: number;
  lessonsRemainingToday: number;
  dailyLimit: number;
}

interface MindFuelStreakCardProps {
  streak: StreakData | null;
  stats: StatsData | null;
  isLoading?: boolean;
}

export default function MindFuelStreakCard({ streak, stats, isLoading }: MindFuelStreakCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-violet-500/20">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  const currentStreak = streak?.currentStreak || 0;
  const longestStreak = streak?.longestStreak || 0;
  const lessonsCollected = streak?.lessonsCollected || 0;
  const totalLessons = stats?.totalLessons || 500;
  const viewedLessons = stats?.viewedLessons || 0;
  const progressPercent = totalLessons > 0 ? Math.round((viewedLessons / totalLessons) * 100) : 0;

  // Dynamic flame color based on streak
  const getFlameColor = () => {
    if (currentStreak >= 100) return 'text-violet-400';
    if (currentStreak >= 60) return 'text-fuchsia-500';
    if (currentStreak >= 30) return 'text-purple-500';
    if (currentStreak >= 7) return 'text-orange-500';
    return 'text-orange-400';
  };

  const getFlameGlow = () => {
    if (currentStreak >= 100) return 'drop-shadow-[0_0_12px_rgba(167,139,250,0.8)]';
    if (currentStreak >= 60) return 'drop-shadow-[0_0_10px_rgba(217,70,239,0.7)]';
    if (currentStreak >= 30) return 'drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]';
    if (currentStreak >= 7) return 'drop-shadow-[0_0_6px_rgba(249,115,22,0.5)]';
    return '';
  };

  return (
    <Card className="bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-violet-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-violet-500" />
          {t('mindFuel.streak.title', 'Mental Training Streak')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main streak display */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Flame icon with streak */}
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20`}>
              <Flame className={`h-8 w-8 sm:h-10 sm:w-10 ${getFlameColor()} ${getFlameGlow()}`} />
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-foreground">
                {currentStreak}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                {t('mindFuel.streak.days', 'day streak')}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <div>
                <div className="text-sm font-semibold">{longestStreak}</div>
                <div className="text-xs text-muted-foreground">
                  {t('mindFuel.streak.longest', 'longest')}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-500" />
              <div>
                <div className="text-sm font-semibold">{lessonsCollected}</div>
                <div className="text-xs text-muted-foreground">
                  {t('mindFuel.streak.collected', 'lessons')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('mindFuel.streak.progress', 'Lessons Explored')}</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {viewedLessons} / {totalLessons} {t('mindFuel.streak.lessonsViewed', 'lessons viewed')}
          </div>
        </div>

        {/* Daily limit indicator */}
        {stats && (
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              {t('mindFuel.streak.dailyLimit', 'Daily fuel remaining')}
            </span>
            <Badge variant={stats.lessonsRemainingToday > 0 ? 'default' : 'secondary'}>
              {stats.lessonsRemainingToday} / {stats.dailyLimit}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
