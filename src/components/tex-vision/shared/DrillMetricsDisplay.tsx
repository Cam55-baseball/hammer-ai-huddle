import { useTranslation } from 'react-i18next';
import { Target, Zap, TrendingUp, TrendingDown, Minus, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrillMetricsDisplayProps {
  accuracy?: number;
  reactionTimeMs?: number;
  difficulty?: number;
  streak?: number;
  trend?: 'improving' | 'declining' | 'stable';
  className?: string;
}

export function DrillMetricsDisplay({
  accuracy,
  reactionTimeMs,
  difficulty,
  streak,
  trend,
  className,
}: DrillMetricsDisplayProps) {
  const { t } = useTranslation();

  const TrendIcon = trend === 'improving' 
    ? TrendingUp 
    : trend === 'declining' 
      ? TrendingDown 
      : Minus;

  const trendColor = trend === 'improving'
    ? 'text-tex-vision-success'
    : trend === 'declining'
      ? 'text-tex-vision-timing'
      : 'text-tex-vision-text-muted';

  return (
    <div className={cn(
      "flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl",
      "bg-tex-vision-primary-dark/80 backdrop-blur-sm border border-tex-vision-primary/30",
      className
    )}>
      {/* Accuracy */}
      {accuracy !== undefined && (
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-tex-vision-primary-light" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-tex-vision-text-muted">
              {t('texVision.metrics.accuracy')}
            </span>
            <span className={cn(
              "text-sm font-bold",
              accuracy >= 80 ? "text-tex-vision-success" : 
              accuracy >= 60 ? "text-tex-vision-timing" : 
              "text-tex-vision-text"
            )}>
              {accuracy.toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* Reaction Time */}
      {reactionTimeMs !== undefined && (
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-tex-vision-feedback" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-tex-vision-text-muted">
              {t('texVision.metrics.reactionTime')}
            </span>
            <span className={cn(
              "text-sm font-bold",
              reactionTimeMs <= 300 ? "text-tex-vision-success" : 
              reactionTimeMs <= 500 ? "text-tex-vision-timing" : 
              "text-tex-vision-text"
            )}>
              {reactionTimeMs}ms
            </span>
          </div>
        </div>
      )}

      {/* Difficulty Level */}
      {difficulty !== undefined && (
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-3 rounded-full transition-colors duration-200",
                  i < difficulty 
                    ? "bg-tex-vision-primary-light" 
                    : "bg-tex-vision-primary/20"
                )}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-tex-vision-text">
            {difficulty}/10
          </span>
        </div>
      )}

      {/* Streak */}
      {streak !== undefined && streak > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-tex-vision-success/20 border border-tex-vision-success/30">
          <Flame className="h-3.5 w-3.5 text-tex-vision-success" />
          <span className="text-xs font-bold text-tex-vision-success">
            {streak}
          </span>
        </div>
      )}

      {/* Trend */}
      {trend && (
        <div className={cn("flex items-center gap-1", trendColor)}>
          <TrendIcon className="h-4 w-4" />
          <span className="text-xs font-medium capitalize">
            {t(`texVision.trends.${trend}`)}
          </span>
        </div>
      )}
    </div>
  );
}
