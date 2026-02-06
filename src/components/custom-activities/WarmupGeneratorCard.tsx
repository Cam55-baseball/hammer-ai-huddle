import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Plus, Loader2, Clock, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Exercise } from '@/types/customActivity';
import { useWarmupGenerator } from '@/hooks/useWarmupGenerator';
import { useAthleteGoalsAggregated } from '@/hooks/useAthleteGoalsAggregated';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WarmupGeneratorCardProps {
  exercises: Exercise[];
  onAddWarmup: (warmupExercises: Exercise[]) => void;
  sport?: 'baseball' | 'softball';
  isWarmupActivity?: boolean;
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

const WARMUP_CONTEXTS = [
  { value: 'full_practice', labelKey: 'full_practice' },
  { value: 'game', labelKey: 'game' },
  { value: 'throwing_session', labelKey: 'throwing_session' },
  { value: 'hitting_session', labelKey: 'hitting_session' },
  { value: 'strength_workout', labelKey: 'strength_workout' },
  { value: 'speed_training', labelKey: 'speed_training' },
  { value: 'general_activity', labelKey: 'general_activity' },
];

export function WarmupGeneratorCard({ exercises, onAddWarmup, sport = 'baseball', isWarmupActivity = false }: WarmupGeneratorCardProps) {
  const { t } = useTranslation();
  const [personalize, setPersonalize] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [warmupContext, setWarmupContext] = useState<string | undefined>(undefined);
  
  const { generateWarmup, isGenerating, warmupResult, clearWarmup, convertToExercises } = useWarmupGenerator();
  const { data: goals, isLoading: goalsLoading } = useAthleteGoalsAggregated(personalize);

  // For warmup activity type, require context selection when personalized
  const canGenerate = isWarmupActivity 
    ? (!personalize || warmupContext !== undefined)
    : exercises.length > 0;

  const handleGenerate = async () => {
    await generateWarmup({
      exercises,
      sport,
      personalize,
      goals: personalize ? goals : undefined,
      warmupContext: isWarmupActivity && personalize ? warmupContext : undefined,
    });
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
              disabled={isGenerating || !canGenerate || (personalize && goalsLoading)}
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
        
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <CardDescription className="text-xs">
              {isWarmupActivity 
                ? t('workoutBuilder.warmup.warmingUpFor', 'Warming up for...')
                : t('workoutBuilder.warmup.basedOn', 'Based on your workout exercises')
              }
            </CardDescription>
            
            {!warmupResult && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="personalize-warmup"
                        checked={personalize}
                        onCheckedChange={setPersonalize}
                        disabled={isGenerating}
                      />
                      <Label 
                        htmlFor="personalize-warmup" 
                        className={cn(
                          "text-xs cursor-pointer flex items-center gap-1",
                          personalize && "text-primary font-medium"
                        )}
                      >
                        <User className="h-3 w-3" />
                        {t('workoutBuilder.warmup.personalize', 'Personalize')}
                      </Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px]">
                    <p className="text-xs">
                      {t('workoutBuilder.warmup.personalizeHint', 'Customize based on your goals, position, and training focus')}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          {/* Context selector for warmup activity type when personalize is on */}
          {isWarmupActivity && personalize && !warmupResult && (
            <Select value={warmupContext} onValueChange={setWarmupContext}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('workoutBuilder.warmup.warmupContext.label', 'What are you warming up for?')} />
              </SelectTrigger>
              <SelectContent>
                {WARMUP_CONTEXTS.map((ctx) => (
                  <SelectItem key={ctx.value} value={ctx.value}>
                    {t(`workoutBuilder.warmup.warmupContext.${ctx.labelKey}`, ctx.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
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
                  {personalize && (
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                      <User className="h-2.5 w-2.5 mr-0.5" />
                      {t('workoutBuilder.warmup.personalizedFor', 'Personalized')}
                    </Badge>
                  )}
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
