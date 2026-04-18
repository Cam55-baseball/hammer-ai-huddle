import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dumbbell, ArrowRight, Calendar, Sparkles } from 'lucide-react';
import { useTrainingBlock } from '@/hooks/useTrainingBlock';

/**
 * Hammer Workout Plan tile — surfaces the /training-block module on the Dashboard.
 * Shows active block progress when one exists, otherwise a "Generate plan" CTA
 * with both 6-Week and Daily quick-start options.
 */
export function WorkoutPlanCTA() {
  const navigate = useNavigate();
  const { activeBlock, stats, isLoading } = useTrainingBlock();

  if (isLoading) return null;

  // Active block — show progress + jump-in
  if (activeBlock && stats) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base capitalize">Hammer Workout Plan</h3>
                <p className="text-xs text-muted-foreground capitalize">
                  {activeBlock.goal} · 6-week block
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate('/training-block')} className="gap-1">
              Open <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{stats.completed} / {stats.total} workouts</span>
              <span className="font-medium">{stats.completionRate}%</span>
            </div>
            <Progress value={stats.completionRate} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No block — surface both modes
  return (
    <Card className="border-dashed border-primary/30">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-base">Hammer Workout Plan</h3>
            <p className="text-xs text-muted-foreground">
              Generate a personalized 6-week block or a single-session daily workout.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            className="gap-1.5 flex-1"
            onClick={() => navigate('/training-block?mode=block')}
          >
            <Dumbbell className="h-3.5 w-3.5" />
            6-Week Block
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 flex-1"
            onClick={() => navigate('/training-block?mode=daily')}
          >
            <Calendar className="h-3.5 w-3.5" />
            Daily Plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
