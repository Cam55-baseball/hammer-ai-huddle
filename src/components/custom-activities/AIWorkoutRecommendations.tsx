import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Clock, Dumbbell, Heart, Loader2, RefreshCw, Lightbulb } from 'lucide-react';
import { useWorkoutRecommendations } from '@/hooks/useWorkoutRecommendations';
import { Exercise } from '@/types/customActivity';
import { WorkoutRecommendation } from '@/types/workoutRecommendation';
import { cn } from '@/lib/utils';

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

function RecommendationCard({ 
  recommendation, 
  onUse 
}: { 
  recommendation: WorkoutRecommendation; 
  onUse: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card className="group hover:shadow-md transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold">{recommendation.name}</CardTitle>
            <div className="flex items-center gap-2">
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
            </div>
          </div>
          <Button size="sm" onClick={onUse} className="shrink-0">
            {t('aiRecommendations.useThis')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex flex-wrap gap-1">
          {recommendation.exercises.slice(0, 5).map((ex, i) => (
            <Badge key={i} variant="secondary" className="text-xs font-normal">
              {ex.name}
            </Badge>
          ))}
          {recommendation.exercises.length > 5 && (
            <Badge variant="secondary" className="text-xs font-normal">
              +{recommendation.exercises.length - 5} more
            </Badge>
          )}
        </div>
        
        <div className="p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
            <p>{recommendation.reasoning}</p>
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
  const { 
    recommendations, 
    isLoading, 
    error, 
    generateRecommendations,
  } = useWorkoutRecommendations();

  useEffect(() => {
    generateRecommendations();
  }, [generateRecommendations]);

  const handleUseWorkout = (recommendation: WorkoutRecommendation) => {
    onUseWorkout(recommendation.exercises);
  };

  return (
    <div className="border rounded-lg p-4 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-sm">{t('aiRecommendations.title')}</h3>
        </div>
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

      {isLoading && <LoadingSkeleton />}

      {!isLoading && recommendations.length === 0 && !error && (
        <div className="text-center py-8 text-muted-foreground">
          <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t('aiRecommendations.noHistory')}</p>
        </div>
      )}

      {!isLoading && recommendations.length > 0 && (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onUse={() => handleUseWorkout(rec)}
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
