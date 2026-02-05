import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { WorkoutPreset } from '@/hooks/useWorkoutPresets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Clock, Zap, Play, Copy } from 'lucide-react';

interface PresetCardProps {
  preset: WorkoutPreset;
  onUse: (preset: WorkoutPreset) => void;
  onDuplicate?: (preset: WorkoutPreset) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  explosive_lower: 'bg-red-500/10 border-red-500/30 text-red-600',
  elastic_day: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
  game_day_prime: 'bg-green-500/10 border-green-500/30 text-green-600',
  fascial_recovery: 'bg-blue-500/10 border-blue-500/30 text-blue-600',
  upper_power: 'bg-purple-500/10 border-purple-500/30 text-purple-600',
  speed_development: 'bg-orange-500/10 border-orange-500/30 text-orange-600',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced: 'bg-red-100 text-red-700',
  all: 'bg-muted text-muted-foreground',
};

export function PresetCard({ preset, onUse, onDuplicate }: PresetCardProps) {
  const { t } = useTranslation();
  
  const categoryColor = CATEGORY_COLORS[preset.category] || 'bg-muted border-border';
  const difficultyColor = DIFFICULTY_COLORS[preset.difficulty || 'all'] || DIFFICULTY_COLORS.all;
  
  return (
    <Card className={cn('relative overflow-hidden transition-all hover:shadow-md', categoryColor)}>
      {preset.isLocked && (
        <div className="absolute top-2 right-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-bold line-clamp-1">
            {preset.name}
          </CardTitle>
        </div>
        {preset.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {preset.description}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Metrics Row */}
        <div className="flex items-center gap-3 text-xs">
          {preset.estimatedDurationMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{preset.estimatedDurationMinutes} {t('common.min', 'min')}</span>
            </div>
          )}
          {preset.cnsLoadEstimate && (
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>{preset.cnsLoadEstimate} CNS</span>
            </div>
          )}
        </div>
        
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {preset.difficulty && (
            <Badge variant="secondary" className={cn('text-xs', difficultyColor)}>
              {t(`eliteWorkout.presets.difficulty.${preset.difficulty}`, preset.difficulty)}
            </Badge>
          )}
          {preset.sport && preset.sport !== 'both' && (
            <Badge variant="outline" className="text-xs">
              {preset.sport === 'baseball' ? '⚾' : '🥎'} {preset.sport}
            </Badge>
          )}
          {preset.isSystem && (
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
              {t('eliteWorkout.presets.hammers', 'Hammers')}
            </Badge>
          )}
        </div>
        
        {/* Fascial Bias Bar */}
        {preset.fascialBias && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              {t('eliteWorkout.load.fascial', 'Fascial Bias')}
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
              <div 
                className="bg-blue-500 transition-all" 
                style={{ width: `${preset.fascialBias.compression}%` }} 
                title="Compression"
              />
              <div 
                className="bg-amber-500 transition-all" 
                style={{ width: `${preset.fascialBias.elastic}%` }} 
                title="Elastic"
              />
              <div 
                className="bg-green-500 transition-all" 
                style={{ width: `${preset.fascialBias.glide}%` }} 
                title="Glide"
              />
            </div>
          </div>
        )}
        
        {/* Blocks Preview */}
        <div className="text-xs text-muted-foreground">
          {preset.blocks.length} {t('eliteWorkout.blocks.count', 'blocks')}
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            className="flex-1 gap-1.5" 
            onClick={() => onUse(preset)}
          >
            <Play className="h-3.5 w-3.5" />
            {t('eliteWorkout.presets.usePreset', 'Use Preset')}
          </Button>
          {!preset.isLocked && onDuplicate && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onDuplicate(preset)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
