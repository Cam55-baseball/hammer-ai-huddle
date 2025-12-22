import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Minus, Lock, Unlock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdaptiveDifficultyBadgeProps {
  level: number; // 1-10
  trend?: 'up' | 'down' | 'stable';
  tier: 'beginner' | 'advanced' | 'chaos';
  tierLocked?: boolean;
  nextAdjustment?: 'increase' | 'decrease' | 'maintain';
  className?: string;
}

export function AdaptiveDifficultyBadge({
  level,
  trend,
  tier,
  tierLocked = false,
  nextAdjustment,
  className,
}: AdaptiveDifficultyBadgeProps) {
  const { t } = useTranslation();

  const TrendIcon = trend === 'up' 
    ? TrendingUp 
    : trend === 'down' 
      ? TrendingDown 
      : Minus;

  const trendColor = trend === 'up'
    ? 'text-tex-vision-success'
    : trend === 'down'
      ? 'text-tex-vision-timing'
      : 'text-tex-vision-text-muted';

  const tierConfig = {
    beginner: {
      label: t('texVision.tiers.beginner'),
      color: 'bg-tex-vision-success/20 text-tex-vision-success border-tex-vision-success/30',
      icon: null,
    },
    advanced: {
      label: t('texVision.tiers.advanced'),
      color: 'bg-tex-vision-primary/20 text-tex-vision-primary-light border-tex-vision-primary/30',
      icon: null,
    },
    chaos: {
      label: t('texVision.tiers.chaos'),
      color: 'bg-tex-vision-feedback/20 text-tex-vision-feedback border-tex-vision-feedback/30',
      icon: Zap,
    },
  };

  const currentTierConfig = tierConfig[tier];
  const TierIcon = currentTierConfig.icon;

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-xl",
      "bg-tex-vision-primary-dark/80 border border-tex-vision-primary/20",
      className
    )}>
      {/* Difficulty Level Bar */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-tex-vision-text-muted font-medium">
          {t('texVision.difficulty.level')}
        </span>
        <div className="flex gap-0.5">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-4 rounded-sm transition-all duration-200",
                i < level 
                  ? "bg-tex-vision-primary-light" 
                  : "bg-tex-vision-primary/20"
              )}
            />
          ))}
        </div>
        <span className="text-sm font-bold text-tex-vision-text min-w-[2rem]">
          {level}/10
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-tex-vision-primary/30" />

      {/* Tier Badge */}
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-bold",
        currentTierConfig.color
      )}>
        {tierLocked ? (
          <Lock className="h-3 w-3" />
        ) : TierIcon ? (
          <TierIcon className="h-3 w-3" />
        ) : (
          <Unlock className="h-3 w-3 opacity-50" />
        )}
        <span>{currentTierConfig.label}</span>
      </div>

      {/* Trend Indicator */}
      {trend && (
        <>
          <div className="w-px h-6 bg-tex-vision-primary/30" />
          <div className={cn("flex items-center gap-1", trendColor)}>
            <TrendIcon className="h-4 w-4" />
            {nextAdjustment && (
              <span className="text-[10px] uppercase tracking-wider font-medium">
                {nextAdjustment === 'increase' && t('texVision.difficulty.nextUp')}
                {nextAdjustment === 'decrease' && t('texVision.difficulty.nextDown')}
                {nextAdjustment === 'maintain' && t('texVision.difficulty.maintain')}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
