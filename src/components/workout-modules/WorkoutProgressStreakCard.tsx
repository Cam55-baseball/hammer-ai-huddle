import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Flame, Trophy, Calendar, Star, Sparkles } from 'lucide-react';
import { ConfettiEffect } from '@/components/bounce-back-bay/ConfettiEffect';

const WORKOUT_MILESTONES = [10, 50, 100, 200, 350, 500, 700, 1000];

interface WorkoutProgressStreakCardProps {
  currentWeek: number;
  totalWeeks?: number;
  weekCompletionPercent: number;
  overallPercent: number;
  lastActivity?: string;
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  reachedMilestone?: number | null;
}

const COLOR_TIERS = [
  { min: 0, color: 'text-red-500', glowColor: 'shadow-red-500/50' },
  { min: 100, color: 'text-yellow-500', glowColor: 'shadow-yellow-500/50' },
  { min: 200, color: 'text-purple-500', glowColor: 'shadow-purple-500/50' },
  { min: 300, color: 'text-green-500', glowColor: 'shadow-green-500/50' },
  { min: 400, color: 'text-blue-500', glowColor: 'shadow-blue-500/50' },
];

const getColorTier = (totalWorkouts: number) => {
  const cyclePosition = totalWorkouts % 500;
  const tierIndex = Math.floor(cyclePosition / 100);
  return COLOR_TIERS[tierIndex] || COLOR_TIERS[0];
};

export function WorkoutProgressStreakCard({
  currentWeek,
  totalWeeks = 6,
  weekCompletionPercent,
  overallPercent,
  lastActivity,
  currentStreak,
  longestStreak,
  totalWorkouts,
  reachedMilestone,
}: WorkoutProgressStreakCardProps) {
  const { t } = useTranslation();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showMilestoneBadge, setShowMilestoneBadge] = useState(false);
  const [displayedMilestone, setDisplayedMilestone] = useState<number | null>(null);

  useEffect(() => {
    if (reachedMilestone && WORKOUT_MILESTONES.includes(reachedMilestone)) {
      setDisplayedMilestone(reachedMilestone);
      setShowConfetti(true);
      setShowMilestoneBadge(true);
      
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 100]);
      }
      
      const badgeTimer = setTimeout(() => {
        setShowMilestoneBadge(false);
        setDisplayedMilestone(null);
      }, 5000);
      
      return () => clearTimeout(badgeTimer);
    }
  }, [reachedMilestone]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('workoutModules.notStarted');
    return new Date(dateString).toLocaleDateString();
  };

  const showFlame = currentStreak >= 5;
  const isGlowing = currentStreak >= 25;
  const colorTier = getColorTier(totalWorkouts);
  const isNewRecord = currentStreak > 0 && currentStreak >= longestStreak;

  const getMilestoneKey = (milestone: number): string => {
    return `workoutStreak.milestone${milestone}`;
  };

  const getParticleCount = (milestone: number): number => {
    if (milestone >= 1000) return 100;
    if (milestone >= 500) return 80;
    if (milestone >= 200) return 60;
    return 40;
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      {showConfetti && displayedMilestone && (
        <ConfettiEffect 
          particleCount={getParticleCount(displayedMilestone)} 
          duration={displayedMilestone >= 500 ? 4000 : 3000}
        />
      )}

      {showMilestoneBadge && displayedMilestone && (
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-transparent z-10 animate-pulse" />
      )}

      <CardContent className="p-3 sm:p-4">
        {/* Header with week badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold">{t('workoutModules.progressAndStreak')}</span>
          </div>
          <Badge variant="secondary" className="text-sm font-bold px-2 py-0.5">
            {t('workoutModules.weekLabel', { current: currentWeek, total: totalWeeks })}
          </Badge>
        </div>

        {/* Main content - Side by side on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Progress Section */}
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('workoutModules.thisWeek')}</span>
                <span className="font-medium">{weekCompletionPercent}%</span>
              </div>
              <Progress value={weekCompletionPercent} className="h-1.5" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('workoutModules.overallProgress')}</span>
                <span className="font-medium">{overallPercent}%</span>
              </div>
              <Progress value={overallPercent} className="h-1.5" />
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
              <Calendar className="h-3 w-3" />
              <span>{t('workoutModules.lastActivity')}: {formatDate(lastActivity)}</span>
            </div>
          </div>

          {/* Streak Section */}
          <div className="flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-border/50 pt-3 sm:pt-0 sm:pl-3">
            <div className="flex items-center gap-1">
              {showFlame && (
                <Flame
                  className={`h-5 w-5 ${colorTier.color} ${isGlowing ? 'animate-pulse' : ''}`}
                  style={{ filter: isGlowing ? 'drop-shadow(0 0 6px currentColor)' : undefined }}
                />
              )}
              <span className="text-2xl font-bold">{currentStreak}</span>
              {showFlame && (
                <Flame
                  className={`h-5 w-5 ${colorTier.color} ${isGlowing ? 'animate-pulse' : ''}`}
                  style={{ filter: isGlowing ? 'drop-shadow(0 0 6px currentColor)' : undefined }}
                />
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {currentStreak === 1 ? t('workoutStreak.dayStreak') : t('workoutStreak.daysStreak')}
            </span>

            {/* Milestone Badge */}
            {showMilestoneBadge && displayedMilestone && (
              <Badge className="mt-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                {t('workoutStreak.milestoneUnlocked')}
              </Badge>
            )}

            {/* New Record */}
            {isNewRecord && currentStreak > 0 && !showMilestoneBadge && (
              <div className="flex items-center gap-1 text-amber-500 mt-1">
                <Star className="h-3 w-3 fill-current" />
                <span className="text-xs font-medium">{t('workoutStreak.newRecord')}</span>
              </div>
            )}

            {/* Stats Row */}
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              <div className="text-center">
                <div className="font-semibold text-foreground">{longestStreak}</div>
                <div>{t('workoutStreak.best')}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground">{totalWorkouts}</div>
                <div>{t('workoutStreak.total')}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
