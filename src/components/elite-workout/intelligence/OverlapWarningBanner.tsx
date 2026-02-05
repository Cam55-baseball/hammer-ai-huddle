import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { OverlapWarning } from '@/types/eliteWorkout';
import { AlertTriangle, Info, Zap, TrendingUp, Moon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OverlapWarningBannerProps {
  warnings: OverlapWarning[];
  onDismiss?: (index: number) => void;
  className?: string;
}

const WARNING_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  cns: Zap,
  elastic: TrendingUp,
  load_spike: AlertTriangle,
  recovery: Moon,
};

export function OverlapWarningBanner({ warnings, onDismiss, className }: OverlapWarningBannerProps) {
  const { t } = useTranslation();
  
  if (warnings.length === 0) return null;
  
  return (
    <div className={cn('space-y-2', className)}>
      {warnings.map((warning, index) => {
        const Icon = WARNING_ICONS[warning.type] || AlertTriangle;
        const isWarning = warning.severity === 'warning';
        
        return (
          <div
            key={`${warning.type}-${index}`}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border',
              isWarning 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100'
                : 'bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-100'
            )}
          >
            <Icon className={cn(
              'h-5 w-5 flex-shrink-0 mt-0.5',
              isWarning ? 'text-amber-500' : 'text-sky-500'
            )} />
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {t(`eliteWorkout.warnings.${warning.type}`, warning.message)}
              </p>
              {warning.suggestion && (
                <p className="text-xs mt-1 opacity-80">
                  💡 {warning.suggestion}
                </p>
              )}
            </div>
            
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => onDismiss(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface OverlapWarningCompactProps {
  warnings: OverlapWarning[];
  className?: string;
}

export function OverlapWarningCompact({ warnings, className }: OverlapWarningCompactProps) {
  const { t } = useTranslation();
  
  if (warnings.length === 0) return null;
  
  const hasWarning = warnings.some(w => w.severity === 'warning');
  
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
      hasWarning 
        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
        : 'bg-sky-500/20 text-sky-700 dark:text-sky-300',
      className
    )}>
      <AlertTriangle className="h-3 w-3" />
      <span>
        {warnings.length} {t('eliteWorkout.warningsCount', 'warning(s)')}
      </span>
    </div>
  );
}
