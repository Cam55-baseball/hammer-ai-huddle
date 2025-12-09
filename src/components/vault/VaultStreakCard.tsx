import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Flame, Trophy, Calendar, Award } from 'lucide-react';
import { VaultStreak } from '@/hooks/useVault';
import { cn } from '@/lib/utils';

interface VaultStreakCardProps {
  streak: VaultStreak | null;
  compact?: boolean;
  isLoading?: boolean;
}

export function VaultStreakCard({ streak, compact = false, isLoading = false }: VaultStreakCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    if (compact) {
      return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-3 w-28 bg-muted rounded animate-pulse" />
          </div>
        </div>
      );
    }
    return (
      <Card className="overflow-hidden border-orange-500/20 bg-gradient-to-br from-background to-orange-500/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-muted animate-pulse" />
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="h-12 w-16 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-4 w-32 mx-auto bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-8 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-2 w-full bg-muted rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-14 bg-muted/50 rounded-md animate-pulse" />
            <div className="h-14 bg-muted/50 rounded-md animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStreak = streak?.current_streak || 0;
  const longestStreak = streak?.longest_streak || 0;
  const totalEntries = streak?.total_entries || 0;
  const badges = streak?.badges_earned || [];

  // Streak visual levels
  const getStreakVisual = () => {
    if (currentStreak >= 25) {
      return { flames: '🔥', glow: true, color: 'text-orange-400' };
    }
    if (currentStreak >= 5) {
      return { flames: '🔥', glow: false, color: 'text-orange-500' };
    }
    return { flames: '', glow: false, color: 'text-muted-foreground' };
  };

  const visual = getStreakVisual();

  // Progress to next milestone
  const milestones = [7, 14, 30, 60, 100];
  const nextMilestone = milestones.find(m => m > currentStreak) || 100;
  const prevMilestone = milestones.filter(m => m <= currentStreak).pop() || 0;
  const progressToNext = ((currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100;

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'week_warrior': return '🏅';
      case 'two_week_titan': return '⭐';
      case 'monthly_master': return '🏆';
      case 'sixty_day_sentinel': return '💎';
      case 'century_champion': return '👑';
      default: return '🎖️';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
        <div className={cn("text-2xl", visual.glow && "animate-pulse")}>
          {visual.flames || '📅'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {currentStreak} {currentStreak === 1 ? t('vault.streak.day') : t('vault.streak.days')}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {t('vault.streak.keepGoing')}
          </p>
        </div>
        {currentStreak > 0 && (
          <Badge variant="secondary" className="bg-orange-500/20 text-orange-600">
            {t('vault.streak.active')}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-orange-500/20 bg-gradient-to-br from-background to-orange-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flame className={cn("h-5 w-5", visual.color, visual.glow && "animate-pulse")} />
          {t('vault.streak.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Streak Display */}
        <div className="flex items-center justify-center gap-2">
          <span className={cn("text-5xl font-bold", visual.color)}>
            {currentStreak}
          </span>
          <span className={cn("text-3xl", visual.glow && "animate-pulse")}>
            {visual.flames}
          </span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {currentStreak === 1
            ? t('vault.streak.day')
            : t('vault.streak.days')}
        </p>

        {/* Progress to Next Milestone */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>{nextMilestone - currentStreak} {t('vault.streak.toNextMilestone')}</span>
            <span>{Math.round(progressToNext)}%</span>
          </div>
          <Progress value={progressToNext} className="h-2" />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{t('vault.streak.longest')}</p>
              <p className="text-sm font-semibold">{longestStreak} {t('vault.streak.days')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
            <Calendar className="h-4 w-4 text-blue-500" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{t('vault.streak.totalEntries')}</p>
              <p className="text-sm font-semibold">{totalEntries}</p>
            </div>
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs font-medium flex items-center gap-1">
              <Award className="h-3 w-3" />
              {t('vault.streak.badgesEarned')}
            </p>
            <div className="flex flex-wrap gap-1">
              {badges.map((badge) => (
                <Badge key={badge} variant="outline" className="text-xs gap-1">
                  {getBadgeIcon(badge)}
                  {t(`vault.badges.${badge}`, badge.replace(/_/g, ' '))}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
