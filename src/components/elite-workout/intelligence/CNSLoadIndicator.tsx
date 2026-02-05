import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatCNSLoad } from '@/utils/loadCalculation';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap } from 'lucide-react';

interface CNSLoadIndicatorProps {
  load: number;
  maxLoad?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CNSLoadIndicator({ 
  load, 
  maxLoad = 200, 
  showLabel = true,
  size = 'md',
  className 
}: CNSLoadIndicatorProps) {
  const { t } = useTranslation();
  const format = formatCNSLoad(load);
  const percentage = Math.min((load / maxLoad) * 100, 100);
  
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };
  
  const getProgressColor = () => {
    if (percentage > 75) return 'bg-red-500';
    if (percentage > 50) return 'bg-orange-500';
    if (percentage > 30) return 'bg-amber-500';
    return 'bg-green-500';
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2', className)}>
            <Zap className={cn(
              'flex-shrink-0',
              size === 'sm' && 'h-3 w-3',
              size === 'md' && 'h-4 w-4',
              size === 'lg' && 'h-5 w-5',
              format.color
            )} />
            
            <div className="flex-1 min-w-[60px]">
              <div className={cn('w-full bg-muted rounded-full overflow-hidden', sizeClasses[size])}>
                <div 
                  className={cn('h-full transition-all duration-300 rounded-full', getProgressColor())}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            
            {showLabel && (
              <span className={cn(
                'font-medium tabular-nums',
                size === 'sm' && 'text-xs',
                size === 'md' && 'text-sm',
                size === 'lg' && 'text-base',
                format.color
              )}>
                {load}
              </span>
            )}
          </div>
        </TooltipTrigger>
        
        <TooltipContent>
          <p className="text-sm">
            <span className="font-semibold">{t('eliteWorkout.cnsLoad', 'CNS Load')}:</span>{' '}
            <span className={format.color}>{load}</span> ({format.label})
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {load > 150 
              ? t('eliteWorkout.cnsWarning', 'Consider reducing intensity')
              : load > 100 
                ? t('eliteWorkout.cnsElevated', 'Monitor recovery')
                : t('eliteWorkout.cnsGood', 'Good training load')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface CNSLoadBadgeProps {
  load: number;
  className?: string;
}

export function CNSLoadBadge({ load, className }: CNSLoadBadgeProps) {
  const format = formatCNSLoad(load);
  
  return (
    <div className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      'bg-muted/50 border',
      className
    )}>
      <Zap className={cn('h-3 w-3', format.color)} />
      <span className={format.color}>{load}</span>
    </div>
  );
}
