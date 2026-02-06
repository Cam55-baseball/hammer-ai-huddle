import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Sparkles, Plus, Loader2, ChevronDown, ChevronUp, User, Zap } from 'lucide-react';
import { WorkoutBlock, EnhancedExercise, BlockType, BLOCK_TYPE_CONFIGS } from '@/types/eliteWorkout';
import { useBlockWorkoutGenerator } from '@/hooks/useBlockWorkoutGenerator';
import { useAthleteGoalsAggregated } from '@/hooks/useAthleteGoalsAggregated';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BlockWorkoutGeneratorProps {
  block: WorkoutBlock;
  onAddExercises: (exercises: EnhancedExercise[]) => void;
  isLocked?: boolean;
  sport?: 'baseball' | 'softball';
}

// Block-specific questions and options
const BLOCK_QUESTIONS: Record<BlockType, {
  questionKey: string;
  options: { value: string; labelKey: string }[];
  isCustom?: boolean;
}> = {
  activation: {
    questionKey: 'activation',
    options: [
      { value: 'full_body', labelKey: 'full_body' },
      { value: 'lower_body', labelKey: 'lower_body' },
      { value: 'upper_body', labelKey: 'upper_body' },
      { value: 'core_hips', labelKey: 'core_hips' },
      { value: 'sport_specific', labelKey: 'sport_specific' },
    ],
  },
  elastic_prep: {
    questionKey: 'elastic_prep',
    options: [
      { value: 'bouncy_reactive', labelKey: 'bouncy_reactive' },
      { value: 'rotational', labelKey: 'rotational' },
      { value: 'linear', labelKey: 'linear' },
      { value: 'multi_directional', labelKey: 'multi_directional' },
    ],
  },
  cns_primer: {
    questionKey: 'cns_primer',
    options: [
      { value: 'light_spark', labelKey: 'light_spark' },
      { value: 'moderate_wakeup', labelKey: 'moderate_wakeup' },
      { value: 'full_send', labelKey: 'full_send' },
    ],
  },
  strength_output: {
    questionKey: 'strength_output',
    options: [
      { value: 'max_strength', labelKey: 'max_strength' },
      { value: 'hypertrophy', labelKey: 'hypertrophy' },
      { value: 'power', labelKey: 'power' },
      { value: 'strength_endurance', labelKey: 'strength_endurance' },
      { value: 'full_body', labelKey: 'full_body' },
    ],
  },
  power_speed: {
    questionKey: 'power_speed',
    options: [
      { value: 'explosive_power', labelKey: 'explosive_power' },
      { value: 'speed_strength', labelKey: 'speed_strength' },
      { value: 'reactive_power', labelKey: 'reactive_power' },
      { value: 'rotational_power', labelKey: 'rotational_power' },
    ],
  },
  capacity: {
    questionKey: 'capacity',
    options: [
      { value: 'aerobic_base', labelKey: 'aerobic_base' },
      { value: 'lactate_tolerance', labelKey: 'lactate_tolerance' },
      { value: 'work_capacity', labelKey: 'work_capacity' },
      { value: 'hiit', labelKey: 'hiit' },
    ],
  },
  skill_transfer: {
    questionKey: 'skill_transfer',
    options: [
      { value: 'throwing_mechanics', labelKey: 'throwing_mechanics' },
      { value: 'hitting_mechanics', labelKey: 'hitting_mechanics' },
      { value: 'defensive_agility', labelKey: 'defensive_agility' },
      { value: 'base_running', labelKey: 'base_running' },
    ],
  },
  decompression: {
    questionKey: 'decompression',
    options: [
      { value: 'full_body', labelKey: 'full_body' },
      { value: 'hips_spine', labelKey: 'hips_spine' },
      { value: 'shoulders_thoracic', labelKey: 'shoulders_thoracic' },
      { value: 'lower_body', labelKey: 'lower_body' },
    ],
  },
  recovery: {
    questionKey: 'recovery',
    options: [
      { value: 'active_recovery', labelKey: 'active_recovery' },
      { value: 'mobility_focus', labelKey: 'mobility_focus' },
      { value: 'breathwork', labelKey: 'breathwork' },
      { value: 'light_movement', labelKey: 'light_movement' },
    ],
  },
  custom: {
    questionKey: 'custom',
    options: [],
    isCustom: true,
  },
};

const CNS_DEMAND_COLORS = {
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function BlockWorkoutGenerator({ 
  block, 
  onAddExercises, 
  isLocked = false,
  sport = 'baseball' 
}: BlockWorkoutGeneratorProps) {
  const { t } = useTranslation();
  const [personalize, setPersonalize] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<string>('');
  const [customGoal, setCustomGoal] = useState('');
  
  const { generateExercises, isGenerating, result, clearResult, convertToEnhancedExercises } = useBlockWorkoutGenerator();
  const { data: goals, isLoading: goalsLoading } = useAthleteGoalsAggregated(personalize);

  const blockConfig = BLOCK_TYPE_CONFIGS[block.blockType];
  const questionConfig = BLOCK_QUESTIONS[block.blockType];
  
  const focusValue = questionConfig.isCustom ? customGoal : selectedFocus;
  const canGenerate = focusValue.length > 0 && (!personalize || !goalsLoading);

  const handleGenerate = async () => {
    const generatedResult = await generateExercises({
      blockType: block.blockType,
      blockIntent: block.intent,
      blockFocus: focusValue,
      personalize,
      goals: personalize ? goals : undefined,
      existingExercises: block.exercises,
      sport,
    });
    
    if (generatedResult) {
      setIsExpanded(true);
    }
  };

  const handleAddToBlock = () => {
    if (result?.exercises) {
      const exercisesToAdd = convertToEnhancedExercises(result.exercises);
      onAddExercises(exercisesToAdd);
      clearResult();
      setIsExpanded(false);
      setSelectedFocus('');
      setCustomGoal('');
    }
  };

  const handleDiscard = () => {
    clearResult();
    setIsExpanded(false);
  };

  // Don't show generator if block is locked or has too many exercises
  if (isLocked || block.exercises.length >= 8) {
    return null;
  }

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardHeader className="pb-3 pt-3 px-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">
              {t('eliteWorkout.generator.title', 'Hammer Workout Generator')}
            </CardTitle>
          </div>
          {!result && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`personalize-${block.id}`}
                      checked={personalize}
                      onCheckedChange={setPersonalize}
                      disabled={isGenerating}
                      className="scale-90"
                    />
                    <Label 
                      htmlFor={`personalize-${block.id}`} 
                      className={cn(
                        "text-xs cursor-pointer flex items-center gap-1",
                        personalize && "text-primary font-medium"
                      )}
                    >
                      <User className="h-3 w-3" />
                      {t('eliteWorkout.generator.personalize', 'Personalize')}
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[200px]">
                  <p className="text-xs">
                    {t('eliteWorkout.generator.personalizeHint', 'Customize based on your goals, position, and training focus')}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {!result && (
          <div className="space-y-2 mt-2">
            <CardDescription className="text-xs">
              {t(`eliteWorkout.generator.questions.${questionConfig.questionKey}`, 
                `What's your focus for ${blockConfig.label}?`)}
            </CardDescription>
            
            {questionConfig.isCustom ? (
              <Input
                placeholder={t('eliteWorkout.generator.customGoalPlaceholder', 'Describe your goal...')}
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                className="h-9 text-sm"
                disabled={isGenerating}
              />
            ) : (
              <Select value={selectedFocus} onValueChange={setSelectedFocus} disabled={isGenerating}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t('eliteWorkout.generator.selectFocus', 'Select focus...')} />
                </SelectTrigger>
                <SelectContent>
                  {questionConfig.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(`eliteWorkout.generator.options.${opt.labelKey}`, opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button 
              size="sm" 
              onClick={handleGenerate}
              disabled={isGenerating || !canGenerate}
              className="w-full gap-1.5 h-9"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('eliteWorkout.generator.generating', 'Generating...')}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t('eliteWorkout.generator.generate', 'Generate Exercises')}
                </>
              )}
            </Button>
          </div>
        )}
      </CardHeader>

      {result && result.exercises.length > 0 && (
        <CardContent className="pt-0 px-3 pb-3 space-y-2">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-auto py-2 px-3 bg-muted/50">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    {result.exercises.length} {t('eliteWorkout.generator.exercisesGenerated', 'exercises')}
                  </span>
                  {personalize && (
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                      <User className="h-2.5 w-2.5 mr-0.5" />
                      {t('eliteWorkout.generator.personalized', 'Personalized')}
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
            
            <CollapsibleContent className="space-y-2 mt-2">
              {result.reasoning && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                  {result.reasoning}
                </p>
              )}
              
              <div className="space-y-1.5">
                {result.exercises.map((exercise, index) => (
                  <div 
                    key={exercise.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-background/80 border text-sm"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{exercise.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {exercise.sets && exercise.reps && (
                          <span>{exercise.sets}×{exercise.reps}</span>
                        )}
                        {exercise.tempo && (
                          <span>@ {exercise.tempo}</span>
                        )}
                        {exercise.rest && (
                          <span>{exercise.rest}s rest</span>
                        )}
                      </div>
                    </div>
                    {exercise.cns_demand && (
                      <Badge 
                        variant="outline" 
                        className={cn("text-[10px] shrink-0", CNS_DEMAND_COLORS[exercise.cns_demand])}
                      >
                        {exercise.cns_demand.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-9"
              onClick={handleDiscard}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              size="sm" 
              className="flex-1 gap-1.5 h-9"
              onClick={handleAddToBlock}
            >
              <Plus className="h-4 w-4" />
              {t('eliteWorkout.generator.addToBlock', 'Add to Block')}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
