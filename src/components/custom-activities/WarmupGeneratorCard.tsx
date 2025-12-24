import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Plus, Loader2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Exercise } from '@/types/customActivity';
import { useWarmupGenerator } from '@/hooks/useWarmupGenerator';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface WarmupGeneratorCardProps {
  exercises: Exercise[];
  onAddWarmup: (warmupExercises: Exercise[]) => void;
  sport?: 'baseball' | 'softball';
}

const CATEGORY_LABELS = {
  'general': 'General Activation',
  'dynamic': 'Dynamic Stretches',
  'movement-prep': 'Movement Prep',
  'arm-care': 'Arm Care',
};

const CATEGORY_COLORS = {
  'general': 'bg-blue-500/20 text-blue-400',
  'dynamic': 'bg-green-500/20 text-green-400',
  'movement-prep': 'bg-amber-500/20 text-amber-400',
  'arm-care': 'bg-rose-500/20 text-rose-400',
};

export function WarmupGeneratorCard({ exercises, onAddWarmup, sport = 'baseball' }: WarmupGeneratorCardProps) {
  const { t } = useTranslation();
  const { generateWarmup, isGenerating, warmupResult, clearWarmup, convertToExercises } = useWarmupGenerator();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGenerate = async () => {
    await generateWarmup(exercises, sport);
    setIsExpanded(true);
  };

  const handleAddToWorkout = () => {
    if (warmupResult?.warmupExercises) {
      const exercisesToAdd = convertToExercises(warmupResult.warmupExercises);
      onAddWarmup(exercisesToAdd);
      clearWarmup();
      setIsExpanded(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">
              {t('workoutBuilder.warmup.title', 'AI Warmup Generator')}
            </CardTitle>
          </div>
          {!warmupResult && (
            <Button 
              size="sm" 
              onClick={handleGenerate}
              disabled={isGenerating || exercises.length === 0}
              className="gap-1.5"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('workoutBuilder.warmup.generating', 'Generating...')}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t('workoutBuilder.warmup.generate', 'Generate Warmup')}
                </>
              )}
            </Button>
          )}
        </div>
        <CardDescription className="text-xs">
          {t('workoutBuilder.warmup.basedOn', 'Based on your workout exercises')}
        </CardDescription>
      </CardHeader>

      {warmupResult && warmupResult.warmupExercises.length > 0 && (
        <CardContent className="pt-0 space-y-3">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-auto py-2 px-3 bg-muted/50">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {warmupResult.warmupExercises.length} exercises • ~{warmupResult.estimatedDuration} min
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-3 mt-3">
              {warmupResult.reasoning && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                  {warmupResult.reasoning}
                </p>
              )}
              
              <div className="space-y-2">
                {warmupResult.warmupExercises.map((exercise, index) => (
                  <div 
                    key={exercise.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{exercise.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {exercise.sets && exercise.reps && `${exercise.sets}×${exercise.reps}`}
                        {exercise.duration && `${exercise.duration}s`}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", CATEGORY_COLORS[exercise.category])}>
                      {CATEGORY_LABELS[exercise.category]}
                    </Badge>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={clearWarmup}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              size="sm" 
              className="flex-1 gap-1.5"
              onClick={handleAddToWorkout}
            >
              <Plus className="h-4 w-4" />
              {t('workoutBuilder.warmup.addToStart', 'Add to Start')}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
