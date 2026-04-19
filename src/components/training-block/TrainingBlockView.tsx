import { useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useTrainingBlock, BlockWorkout, BlockExercise } from '@/hooks/useTrainingBlock';
import { useTrainingPreferences } from '@/hooks/useTrainingPreferences';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dumbbell,
  Calendar as CalendarIcon,
  Target,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500 border-green-500/30',
  nearing_completion: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  ready_for_regeneration: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  archived: 'bg-muted text-muted-foreground border-muted',
};

const WORKOUT_STATUS_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  missed: <XCircle className="h-4 w-4 text-destructive" />,
  scheduled: <Clock className="h-4 w-4 text-muted-foreground" />,
};

export function TrainingBlockView() {
  const { t } = useTranslation();
  const { sport } = useSportTheme();
  const {
    activeBlock,
    workouts,
    exercises,
    stats,
    isLoading,
    generateBlock,
    completeWorkout,
    adaptBlock,
    rescheduleWorkout,
  } = useTrainingBlock();
  const { preferences } = useTrainingPreferences();

  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const [completeDialog, setCompleteDialog] = useState<string | null>(null);
  const [reschedulePopover, setReschedulePopover] = useState<string | null>(null);
  const [rpe, setRpe] = useState(6);
  const [completionNotes, setCompletionNotes] = useState('');

  const getExercisesForWorkout = (workoutId: string): BlockExercise[] =>
    exercises.filter(e => e.workout_id === workoutId);

  const workoutsByWeek = workouts.reduce<Record<number, BlockWorkout[]>>((acc, w) => {
    if (!acc[w.week_number]) acc[w.week_number] = [];
    acc[w.week_number].push(w);
    return acc;
  }, {});

  const handleComplete = (workoutId: string) => {
    completeWorkout.mutate(
      { workoutId, rpe, notes: completionNotes || undefined },
      {
        onSuccess: () => {
          setCompleteDialog(null);
          setRpe(6);
          setCompletionNotes('');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // No active block — show generation prompt
  if (!activeBlock) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Dumbbell className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">
            {t('trainingBlock.noBlock', 'No Active Training Block')}
          </h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-md">
            {t('trainingBlock.noBlockDesc', 'Generate a personalized 6-week training block based on your goals, experience, and available days.')}
          </p>
          <Button
            onClick={() => generateBlock.mutate(sport || 'baseball')}
            disabled={generateBlock.isPending}
            size="lg"
            className="gap-2"
          >
            <Zap className="h-5 w-5" />
            {generateBlock.isPending
              ? t('trainingBlock.generating', 'Generating...')
              : t('trainingBlock.generate', 'Generate Training Block')}
          </Button>
          {!preferences && (
            <p className="text-xs text-muted-foreground mt-3">
              {t('trainingBlock.setPrefsHint', 'Set your training preferences first for better results')}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const hasPendingChange =
    activeBlock.pending_goal_change === true ||
    activeBlock.status === 'ready_for_regeneration';

  return (
    <div className="space-y-6">
      {import.meta.env.DEV && (
        <div className="rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 p-3 text-[11px] font-mono space-y-1">
          <div><span className="text-amber-600 font-semibold">DEBUG</span> blockId: {activeBlock.id}</div>
          <div>created_at: {activeBlock.created_at}</div>
          <div>status: {activeBlock.status} · pending_goal_change: {String(activeBlock.pending_goal_change)}</div>
          <div className="truncate">prefs: {JSON.stringify(preferences)}</div>
        </div>
      )}
      {/* Block Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg capitalize">
                {activeBlock.goal}
              </CardTitle>
              <Badge variant="outline" className={cn('text-xs', STATUS_COLORS[activeBlock.status])}>
                {activeBlock.status.replace(/_/g, ' ')}
              </Badge>
              {activeBlock.pending_goal_change && (
                <Badge variant="outline" className="text-xs text-amber-500">
                  Goal change pending
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => adaptBlock.mutate({ regenerate: hasPendingChange })}
                disabled={adaptBlock.isPending}
                className="gap-1"
              >
                <RefreshCw className={cn("h-3 w-3", adaptBlock.isPending && "animate-spin")} />
                Adapt
              </Button>
              {activeBlock.status === 'ready_for_regeneration' && (
                <Button
                  size="sm"
                  onClick={() => generateBlock.mutate(sport || 'baseball')}
                  disabled={generateBlock.isPending}
                  className="gap-1"
                >
                  <Zap className="h-3 w-3" />
                  Next Block
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5" />
              {activeBlock.start_date} → {activeBlock.end_date}
            </span>
            <span className="capitalize">{activeBlock.sport}</span>
          </div>
          {stats && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{stats.completed} / {stats.total} workouts</span>
                <span className="font-medium">{stats.completionRate}%</span>
              </div>
              <Progress value={stats.completionRate} className="h-2" />
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" /> {stats.completed} done
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-destructive" /> {stats.missed} missed
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {stats.scheduled} remaining
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Week-by-week breakdown */}
      {[1, 2, 3, 4, 5, 6].map(week => {
        const weekWorkouts = workoutsByWeek[week] || [];
        if (weekWorkouts.length === 0) return null;
        const isExpanded = expandedWeek === week;
        const weekCompleted = weekWorkouts.filter(w => w.status === 'completed').length;
        const weekTotal = weekWorkouts.length;

        return (
          <Card key={week}>
            <button
              className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-t-xl"
              onClick={() => setExpandedWeek(isExpanded ? null : week)}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold">Week {week}</span>
                <Badge variant="secondary" className="text-xs">
                  {weekCompleted}/{weekTotal}
                </Badge>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {isExpanded && (
              <CardContent className="space-y-3 pt-0">
                {weekWorkouts.map(workout => {
                  const wExercises = getExercisesForWorkout(workout.id);
                  return (
                    <div
                      key={workout.id}
                      className={cn(
                        'p-4 rounded-lg border',
                        workout.status === 'completed' && 'border-green-500/30 bg-green-500/5',
                        workout.status === 'missed' && 'border-destructive/30 bg-destructive/5',
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {WORKOUT_STATUS_ICONS[workout.status]}
                          <span className="font-medium capitalize">
                            {workout.workout_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {workout.day_label}
                            {workout.scheduled_date && ` · ${workout.scheduled_date}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {workout.estimated_duration && (
                            <span className="text-xs text-muted-foreground">{workout.estimated_duration} min</span>
                          )}
                          {workout.status === 'scheduled' && (
                            <Popover
                              open={reschedulePopover === workout.id}
                              onOpenChange={open => setReschedulePopover(open ? workout.id : null)}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  title="Reschedule workout"
                                >
                                  <CalendarClock className="h-3.5 w-3.5" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                  mode="single"
                                  selected={workout.scheduled_date ? new Date(workout.scheduled_date) : undefined}
                                  onSelect={d => {
                                    if (!d) return;
                                    rescheduleWorkout.mutate(
                                      { workoutId: workout.id, newDate: format(d, 'yyyy-MM-dd') },
                                      { onSuccess: () => setReschedulePopover(null) }
                                    );
                                  }}
                                  disabled={d => d < new Date(new Date().setHours(0, 0, 0, 0))}
                                  initialFocus
                                  className={cn('p-3 pointer-events-auto')}
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                          {workout.status === 'scheduled' && (
                            <Dialog
                              open={completeDialog === workout.id}
                              onOpenChange={open => {
                                if (!open) setCompleteDialog(null);
                                else setCompleteDialog(workout.id);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Complete
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Log Workout Completion</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>RPE (Rate of Perceived Exertion): {rpe}</Label>
                                    <Slider
                                      value={[rpe]}
                                      onValueChange={([v]) => setRpe(v)}
                                      min={1}
                                      max={10}
                                      step={1}
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                      <span>Easy (1)</span>
                                      <span>Max effort (10)</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Notes (optional)</Label>
                                    <Input
                                      value={completionNotes}
                                      onChange={e => setCompletionNotes(e.target.value)}
                                      placeholder="How did it feel?"
                                    />
                                  </div>
                                  <Button
                                    onClick={() => handleComplete(workout.id)}
                                    disabled={completeWorkout.isPending}
                                    className="w-full"
                                  >
                                    {completeWorkout.isPending ? 'Saving...' : 'Mark Complete'}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>

                      {/* Exercise list */}
                      {wExercises.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {wExercises.map(ex => (
                            <div
                              key={ex.id}
                              className="flex items-center justify-between text-sm py-1 px-2 rounded bg-background/50"
                            >
                              <span className="font-medium">{ex.name}</span>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{ex.sets}×{ex.reps}</span>
                                {ex.weight && <span>{ex.weight} lbs</span>}
                                {ex.tempo && <span>⏱ {ex.tempo}</span>}
                                {ex.cns_demand && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[10px] h-4',
                                      ex.cns_demand === 'high' && 'border-red-400 text-red-400',
                                      ex.cns_demand === 'medium' && 'border-amber-400 text-amber-400',
                                      ex.cns_demand === 'low' && 'border-green-400 text-green-400',
                                    )}
                                  >
                                    {ex.cns_demand}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
