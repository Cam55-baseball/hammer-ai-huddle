import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Sparkles, 
  Clock, 
  Dumbbell, 
  Heart, 
  Loader2, 
  RefreshCw, 
  Lightbulb, 
  AlertTriangle,
  ShieldAlert,
  Zap
} from 'lucide-react';
import { useWorkoutRecommendations, RecoveryWarning } from '@/hooks/useWorkoutRecommendations';
import { Exercise } from '@/types/customActivity';
import { WorkoutRecommendation, ExerciseWithWarning } from '@/types/workoutRecommendation';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AIWorkoutRecommendationsProps {
  onUseWorkout: (exercises: Exercise[]) => void;
}

const FOCUS_ICONS: Record<string, React.ReactNode> = {
  strength: <Dumbbell className="h-4 w-4" />,
  cardio: <Heart className="h-4 w-4" />,
  recovery: <Sparkles className="h-4 w-4" />,
  balanced: <Lightbulb className="h-4 w-4" />,
};

const FOCUS_COLORS: Record<string, string> = {
  strength: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  cardio: 'bg-red-500/20 text-red-400 border-red-500/30',
  recovery: 'bg-green-500/20 text-green-400 border-green-500/30',
  balanced: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

/**
 * Recovery warning banner component
 */
function RecoveryWarningBanner({ 
  warning, 
  onShowAlternatives 
}: { 
  warning: RecoveryWarning; 
  onShowAlternatives?: () => void;
}) {
  const { t } = useTranslation();
  const isHigh = warning.severity === 'high';

  return (
    <Alert 
      variant={isHigh ? "destructive" : "default"} 
      className={cn(
        "mb-4 overflow-hidden",
        isHigh 
          ? "border-destructive/50 bg-destructive/10" 
          : "border-amber-500/50 bg-amber-500/10"
      )}
    >
      <ShieldAlert className={cn("h-4 w-4", isHigh ? "text-destructive" : "text-amber-500")} />
      <AlertTitle className={cn(
        "font-bold",
        isHigh ? "text-destructive" : "text-amber-600 dark:text-amber-400"
      )}>
        {isHigh ? t('aiRecommendations.recoveryAlertHigh', 'Recovery Alert') : t('aiRecommendations.recoveryAlertModerate', 'Recovery Notice')}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2 break-words">
        <p className="text-sm break-words">{warning.reason}</p>
        {warning.suggestions.length > 0 && (
          <ul className="text-xs list-disc list-inside opacity-80 space-y-1">
            {warning.suggestions.map((suggestion, i) => (
              <li key={i}>{suggestion}</li>
            ))}
          </ul>
        )}
        {onShowAlternatives && (
          <Button
            variant="outline"
            size="sm"
            onClick={onShowAlternatives}
            className="mt-2 gap-2"
          >
            <Zap className="h-3 w-3" />
            {t('aiRecommendations.viewLighterOptions', 'View Lighter Options')}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Exercise badge with optional pain warning tooltip
 */
function ExerciseBadge({ exercise }: { exercise: ExerciseWithWarning }) {
  const hasWarning = !!exercise.painWarning;
  const isHighSeverity = exercise.painWarning?.severity === 'high';

  const badge = (
    <Badge 
      variant="secondary" 
      className={cn(
        "text-xs font-normal gap-1 max-w-full truncate",
        hasWarning && (isHighSeverity 
          ? "border-destructive/50 bg-destructive/10" 
          : "border-amber-500/50 bg-amber-500/10")
      )}
    >
      {hasWarning && (
        <AlertTriangle className={cn(
          "h-3 w-3",
          isHighSeverity ? "text-destructive" : "text-amber-500"
        )} />
      )}
      {exercise.name}
    </Badge>
  );

  if (!hasWarning) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-[250px]">
          <p className="font-medium text-sm">{exercise.painWarning?.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Affected areas: {exercise.painWarning?.affectedAreas.join(', ')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function RecommendationCard({ 
  recommendation, 
  onUse,
  isLighterAlternative = false,
}: { 
  recommendation: WorkoutRecommendation; 
  onUse: () => void;
  isLighterAlternative?: boolean;
}) {
  const { t } = useTranslation();
  const exercises = recommendation.exercises as ExerciseWithWarning[];
  const warningCount = exercises.filter(ex => ex.painWarning).length;

  return (
    <Card className={cn(
      "group hover:shadow-md transition-all overflow-hidden",
      isLighterAlternative && "border-green-500/30 bg-green-500/5"
    )}>
      <CardHeader className="p-3 sm:p-6 pb-2">
        <div className="flex flex-col gap-2">
          <div className="space-y-1 min-w-0 w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-bold break-words">{recommendation.name}</CardTitle>
              {isLighterAlternative && (
                <Badge variant="outline" className="text-xs bg-green-500/20 text-green-500 border-green-500/30">
                  Lighter Option
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant="outline" 
                className={cn("text-xs", FOCUS_COLORS[recommendation.focus])}
              >
                {FOCUS_ICONS[recommendation.focus]}
                <span className="ml-1 capitalize">{recommendation.focus}</span>
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {recommendation.estimatedDuration} min
              </span>
              {warningCount > 0 && (
                <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-500">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
                </Badge>
              )}
            </div>
          </div>
          <Button size="sm" onClick={onUse} className="shrink-0 self-end">
            {t('aiRecommendations.useThis')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0 space-y-3">
        <div className="flex flex-wrap gap-1">
          {exercises.slice(0, 5).map((ex, i) => (
            <ExerciseBadge key={i} exercise={ex} />
          ))}
          {exercises.length > 5 && (
            <Badge variant="secondary" className="text-xs font-normal">
              +{exercises.length - 5} more
            </Badge>
          )}
        </div>
        
        <div className="p-2 rounded-md bg-muted/50 text-xs text-muted-foreground overflow-hidden">
          <div className="flex items-start gap-2 min-w-0">
            <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
            <p className="break-words min-w-0">{recommendation.reasoning}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map(i => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex gap-1">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AIWorkoutRecommendations({ onUseWorkout }: AIWorkoutRecommendationsProps) {
  const { t } = useTranslation();
  const [showAlternatives, setShowAlternatives] = useState(false);
  
  const { 
    recommendations, 
    lighterAlternatives,
    recoveryWarning,
    isLoading, 
    error, 
    generateRecommendations,
  } = useWorkoutRecommendations();

  useEffect(() => {
    generateRecommendations();
  }, [generateRecommendations]);

  const handleUseWorkout = (recommendation: WorkoutRecommendation) => {
    // Strip pain warnings when passing to workout builder
    const cleanExercises = recommendation.exercises.map(({ painWarning, ...ex }) => ex);
    onUseWorkout(cleanExercises as Exercise[]);
  };

  const displayedRecommendations = showAlternatives && lighterAlternatives.length > 0 
    ? lighterAlternatives 
    : recommendations;

  return (
    <div className="border rounded-lg p-2 sm:p-4 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-sm">{t('aiRecommendations.title')}</h3>
        </div>
        <div className="flex items-center gap-2">
          {lighterAlternatives.length > 0 && (
            <Button
              variant={showAlternatives ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="gap-1"
            >
              <Zap className="h-3 w-3" />
              {showAlternatives ? 'Main' : 'Lighter'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={generateRecommendations}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isLoading ? t('aiRecommendations.generating') : t('aiRecommendations.generate')}
          </Button>
        </div>
      </div>

      {/* Recovery warning banner */}
      {recoveryWarning && recoveryWarning.show && !isLoading && (
        <RecoveryWarningBanner 
          warning={recoveryWarning}
          onShowAlternatives={lighterAlternatives.length > 0 ? () => setShowAlternatives(true) : undefined}
        />
      )}

      {isLoading && <LoadingSkeleton />}

      {!isLoading && displayedRecommendations.length === 0 && !error && (
        <div className="text-center py-8 text-muted-foreground">
          <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t('aiRecommendations.noHistory')}</p>
        </div>
      )}

      {!isLoading && displayedRecommendations.length > 0 && (
        <div className="space-y-3">
          {displayedRecommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onUse={() => handleUseWorkout(rec)}
              isLighterAlternative={showAlternatives}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-4 text-destructive text-sm">
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={generateRecommendations}
            className="mt-2"
          >
            {t('common.tryAgain')}
          </Button>
        </div>
      )}
    </div>
  );
}
