import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { FascialBias } from '@/types/eliteWorkout';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FascialBiasIndicatorProps {
  bias: FascialBias;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

export function FascialBiasIndicator({ 
  bias, 
  size = 'md',
  showLabels = false,
  className 
}: FascialBiasIndicatorProps) {
  const { t } = useTranslation();
  
  const total = bias.compression + bias.elastic + bias.glide;
  if (total === 0) return null;
  
  const percentages = {
    compression: Math.round((bias.compression / total) * 100),
    elastic: Math.round((bias.elastic / total) * 100),
    glide: Math.round((bias.glide / total) * 100),
  };
  
  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };
  
  const getDominant = () => {
    if (percentages.compression >= percentages.elastic && percentages.compression >= percentages.glide) {
      return 'compression';
    }
    if (percentages.elastic >= percentages.glide) {
      return 'elastic';
    }
    return 'glide';
  };
  
  const dominant = getDominant();
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('space-y-1', className)}>
            <div className={cn(
              'w-full rounded-full overflow-hidden flex',
              heights[size],
              'bg-muted'
            )}>
              {/* Compression */}
              <div 
                className="bg-purple-500 transition-all duration-300"
                style={{ width: `${percentages.compression}%` }}
              />
              {/* Elastic */}
              <div 
                className="bg-sky-500 transition-all duration-300"
                style={{ width: `${percentages.elastic}%` }}
              />
              {/* Glide */}
              <div 
                className="bg-teal-500 transition-all duration-300"
                style={{ width: `${percentages.glide}%` }}
              />
            </div>
            
            {showLabels && (
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span className="text-purple-500">C: {percentages.compression}%</span>
                <span className="text-sky-500">E: {percentages.elastic}%</span>
                <span className="text-teal-500">G: {percentages.glide}%</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        
        <TooltipContent>
          <div className="space-y-1.5">
            <p className="font-semibold text-sm">
              {t('eliteWorkout.fasciaBias', 'Fascia Bias')}
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-500" />
                <span>{t('eliteWorkout.fascia.compression', 'Compression')}: {percentages.compression}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-sky-500" />
                <span>{t('eliteWorkout.fascia.elastic', 'Elastic')}: {percentages.elastic}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-teal-500" />
                <span>{t('eliteWorkout.fascia.glide', 'Glide')}: {percentages.glide}%</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {t(`eliteWorkout.fasciaDominant.${dominant}`, `${dominant} dominant`)}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface FascialBiasBadgeProps {
  bias: FascialBias;
  className?: string;
}

export function FascialBiasBadge({ bias, className }: FascialBiasBadgeProps) {
  const { t } = useTranslation();
  
  const total = bias.compression + bias.elastic + bias.glide;
  if (total === 0) return null;
  
  const getDominant = () => {
    if (bias.compression >= bias.elastic && bias.compression >= bias.glide) {
      return { type: 'compression', color: 'bg-purple-500/20 text-purple-700 dark:text-purple-300' };
    }
    if (bias.elastic >= bias.glide) {
      return { type: 'elastic', color: 'bg-sky-500/20 text-sky-700 dark:text-sky-300' };
    }
    return { type: 'glide', color: 'bg-teal-500/20 text-teal-700 dark:text-teal-300' };
  };
  
  const dominant = getDominant();
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      dominant.color,
      className
    )}>
      {t(`eliteWorkout.fascia.${dominant.type}`, dominant.type)}
    </span>
  );
}
