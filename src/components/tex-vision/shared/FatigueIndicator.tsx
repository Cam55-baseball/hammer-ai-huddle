import { useTranslation } from 'react-i18next';
import { AlertTriangle, Coffee, Moon, Eye } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FatigueIndicatorProps {
  level: number; // 0-100
  onTakeBreak?: () => void;
  onEndSession?: () => void;
  showRecoverySuggestion?: boolean;
  className?: string;
}

export function FatigueIndicator({
  level,
  onTakeBreak,
  onEndSession,
  showRecoverySuggestion = true,
  className,
}: FatigueIndicatorProps) {
  const { t } = useTranslation();

  const getFatigueState = () => {
    if (level >= 80) return 'critical';
    if (level >= 60) return 'high';
    if (level >= 40) return 'medium';
    return 'low';
  };

  const state = getFatigueState();

  const stateConfig = {
    low: {
      color: 'bg-tex-vision-success',
      textColor: 'text-tex-vision-success',
      borderColor: 'border-tex-vision-success/30',
      bgColor: 'bg-tex-vision-success/10',
      icon: Eye,
      label: t('texVision.fatigue.levels.low'),
      message: t('texVision.fatigue.messages.low'),
    },
    medium: {
      color: 'bg-tex-vision-timing',
      textColor: 'text-tex-vision-timing',
      borderColor: 'border-tex-vision-timing/30',
      bgColor: 'bg-tex-vision-timing/10',
      icon: Eye,
      label: t('texVision.fatigue.levels.medium'),
      message: t('texVision.fatigue.messages.medium'),
    },
    high: {
      color: 'bg-tex-vision-timing',
      textColor: 'text-tex-vision-timing',
      borderColor: 'border-tex-vision-timing/30',
      bgColor: 'bg-tex-vision-timing/10',
      icon: AlertTriangle,
      label: t('texVision.fatigue.levels.high'),
      message: t('texVision.fatigue.messages.high'),
    },
    critical: {
      color: 'bg-tex-vision-text-muted',
      textColor: 'text-tex-vision-text',
      borderColor: 'border-tex-vision-text/30',
      bgColor: 'bg-tex-vision-primary-dark/80',
      icon: Moon,
      label: t('texVision.fatigue.levels.critical'),
      message: t('texVision.fatigue.messages.critical'),
    },
  };

  const config = stateConfig[state];
  const Icon = config.icon;

  // Don't show if fatigue is very low
  if (level < 20) return null;

  return (
    <div className={cn(
      "rounded-xl border p-3",
      config.borderColor,
      config.bgColor,
      className
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          config.bgColor
        )}>
          <Icon className={cn("h-5 w-5", config.textColor)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className={cn("text-sm font-bold", config.textColor)}>
              {config.label}
            </span>
            <span className="text-xs font-medium text-tex-vision-text-muted">
              {level.toFixed(0)}%
            </span>
          </div>
          
          <Progress 
            value={level} 
            className={cn("h-1.5 mb-2", config.bgColor)}
            indicatorClassName={config.color}
          />
          
          {showRecoverySuggestion && (
            <p className="text-xs text-tex-vision-text-muted mb-2">
              {config.message}
            </p>
          )}
          
          {/* Action buttons for high fatigue */}
          {state === 'high' || state === 'critical' ? (
            <div className="flex items-center gap-2 mt-2">
              {onTakeBreak && state === 'high' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onTakeBreak}
                  className="h-7 text-xs border-tex-vision-timing/50 text-tex-vision-timing hover:bg-tex-vision-timing/10"
                >
                  <Coffee className="h-3 w-3 mr-1" />
                  {t('texVision.fatigue.actions.takeBreak')}
                </Button>
              )}
              {onEndSession && state === 'critical' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onEndSession}
                  className="h-7 text-xs border-tex-vision-text/50 text-tex-vision-text hover:bg-tex-vision-text/10"
                >
                  <Moon className="h-3 w-3 mr-1" />
                  {t('texVision.fatigue.actions.endSession')}
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
