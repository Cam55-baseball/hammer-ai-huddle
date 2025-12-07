import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Trophy, Star } from 'lucide-react';

interface WorkoutStreakCardProps {
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
}

// Color tiers based on total workouts (every 100)
const COLOR_TIERS = [
  { min: 0, color: 'text-red-500', glowColor: 'shadow-red-500/50', label: 'Red' },
  { min: 100, color: 'text-yellow-500', glowColor: 'shadow-yellow-500/50', label: 'Yellow' },
  { min: 200, color: 'text-purple-500', glowColor: 'shadow-purple-500/50', label: 'Purple' },
  { min: 300, color: 'text-green-500', glowColor: 'shadow-green-500/50', label: 'Green' },
  { min: 400, color: 'text-blue-500', glowColor: 'shadow-blue-500/50', label: 'Blue' },
];

const getColorTier = (totalWorkouts: number) => {
  // Cycle through colors every 500 workouts
  const cyclePosition = totalWorkouts % 500;
  const tierIndex = Math.floor(cyclePosition / 100);
  return COLOR_TIERS[tierIndex] || COLOR_TIERS[0];
};

const getFlameCount = (totalWorkouts: number): number => {
  // 1 flame per 500 workouts, minimum 1 when streak >= 5
  return Math.max(1, Math.floor(totalWorkouts / 500) + 1);
};

export function WorkoutStreakCard({ currentStreak, longestStreak, totalWorkouts }: WorkoutStreakCardProps) {
  const { t } = useTranslation();
  
  const showFlame = currentStreak >= 5;
  const isGlowing = currentStreak >= 25;
  const colorTier = getColorTier(totalWorkouts);
  const flameCount = getFlameCount(totalWorkouts);
  const isNewRecord = currentStreak > 0 && currentStreak >= longestStreak;

  return (
    <Card className="relative overflow-hidden">
      {/* Background glow effect for 25+ streak */}
      {isGlowing && (
        <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-${colorTier.color.replace('text-', '')}/10 to-transparent animate-pulse`} />
      )}
      
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          {t('workoutStreak.title')}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Streak Display */}
        <div className="flex items-center justify-center gap-2">
          {showFlame && (
            <div className={`flex items-center ${isGlowing ? 'animate-pulse' : ''}`}>
              {Array.from({ length: Math.min(flameCount, 5) }).map((_, i) => (
                <Flame
                  key={i}
                  className={`h-8 w-8 ${colorTier.color} ${isGlowing ? `drop-shadow-lg ${colorTier.glowColor}` : ''} transition-all duration-300`}
                  style={{
                    filter: isGlowing ? `drop-shadow(0 0 8px currentColor)` : undefined,
                    animation: isGlowing ? `flame-glow 1.5s ease-in-out infinite ${i * 0.2}s` : undefined,
                  }}
                />
              ))}
            </div>
          )}
          
          <div className="text-center">
            <div className="text-4xl font-bold">{currentStreak}</div>
            <div className="text-sm text-muted-foreground">
              {currentStreak === 1 
                ? t('workoutStreak.dayStreak') 
                : t('workoutStreak.daysStreak')}
            </div>
          </div>
          
          {showFlame && (
            <div className={`flex items-center ${isGlowing ? 'animate-pulse' : ''}`}>
              {Array.from({ length: Math.min(flameCount, 5) }).map((_, i) => (
                <Flame
                  key={i}
                  className={`h-8 w-8 ${colorTier.color} ${isGlowing ? `drop-shadow-lg ${colorTier.glowColor}` : ''} transition-all duration-300`}
                  style={{
                    filter: isGlowing ? `drop-shadow(0 0 8px currentColor)` : undefined,
                    animation: isGlowing ? `flame-glow 1.5s ease-in-out infinite ${i * 0.2}s` : undefined,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* New Record Badge */}
        {isNewRecord && currentStreak > 0 && (
          <div className="flex items-center justify-center gap-1 text-amber-500">
            <Star className="h-4 w-4 fill-current" />
            <span className="text-sm font-medium">{t('workoutStreak.newRecord')}</span>
            <Star className="h-4 w-4 fill-current" />
          </div>
        )}

        {/* Stats Row */}
        <div className="flex justify-around pt-2 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold">{longestStreak}</div>
            <div className="text-xs text-muted-foreground">{t('workoutStreak.longestStreak')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{totalWorkouts}</div>
            <div className="text-xs text-muted-foreground">{t('workoutStreak.totalWorkouts')}</div>
          </div>
        </div>

        {/* Motivational Messages */}
        {currentStreak === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            {t('workoutStreak.noStreak')}
          </p>
        )}
        
        {currentStreak > 0 && currentStreak < 5 && (
          <p className="text-center text-sm text-muted-foreground">
            {t('workoutStreak.keepGoing')} {t('workoutStreak.fireUnlocked')}
          </p>
        )}
        
        {currentStreak >= 5 && currentStreak < 25 && (
          <p className="text-center text-sm text-muted-foreground">
            {t('workoutStreak.glowUnlocked')}
          </p>
        )}

        {/* Milestone Indicators */}
        {totalWorkouts >= 100 && totalWorkouts < 500 && (
          <p className="text-center text-xs text-primary font-medium">
            {t('workoutStreak.milestone100')}
          </p>
        )}
        
        {totalWorkouts >= 500 && (
          <p className="text-center text-xs text-primary font-medium">
            {t('workoutStreak.milestone500')}
          </p>
        )}
      </CardContent>

      {/* CSS for flame glow animation */}
      <style>{`
        @keyframes flame-glow {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }
      `}</style>
    </Card>
  );
}
