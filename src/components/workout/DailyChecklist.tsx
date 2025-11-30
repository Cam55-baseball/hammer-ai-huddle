import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Dumbbell, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  intensity?: string;
  notes?: string;
}

interface Workout {
  id: string;
  scheduled_date: string;
  status: string;
  workout_templates: {
    title: string;
    description?: string;
    workout_type: string;
    exercises: Exercise[];
    estimated_duration_minutes?: number;
  };
}

interface DailyChecklistProps {
  todaysWorkouts: Workout[];
  onWorkoutCompleted: () => void;
  previousExerciseLogs?: Record<string, number>;
}

interface SetLog {
  weight: number | null;
  reps: number | null;
}

export function DailyChecklist({ todaysWorkouts, onWorkoutCompleted, previousExerciseLogs = {} }: DailyChecklistProps) {
  const { toast } = useToast();
  const [completingWorkout, setCompletingWorkout] = useState<string | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, Record<number, { name: string; sets: SetLog[] }>>>({});

  const handleWeightChange = (workoutId: string, exerciseIndex: number, setIndex: number, weight: string, exerciseName: string, totalSets: number) => {
    setExerciseLogs(prev => {
      const workoutLogs = prev[workoutId] || {};
      const exerciseLog = workoutLogs[exerciseIndex] || {
        name: exerciseName,
        sets: Array(totalSets).fill(null).map(() => ({ weight: null, reps: null }))
      };
      
      const updatedSets = [...exerciseLog.sets];
      updatedSets[setIndex] = {
        ...updatedSets[setIndex],
        weight: weight ? parseFloat(weight) : null
      };

      return {
        ...prev,
        [workoutId]: {
          ...workoutLogs,
          [exerciseIndex]: {
            ...exerciseLog,
            sets: updatedSets
          }
        }
      };
    });
  };

  const handleCompleteWorkout = async (workoutId: string) => {
    setCompletingWorkout(workoutId);

    try {
      const { data, error } = await supabase.functions.invoke('complete-workout', {
        body: {
          workoutId,
          exerciseLogs: exerciseLogs[workoutId] || {},
        }
      });

      if (error) throw error;

      toast({
        title: "Workout completed!",
        description: `${data.completionPercentage.toFixed(0)}% of your block is now complete.`,
      });

      onWorkoutCompleted();
    } catch (error) {
      console.error('Error completing workout:', error);
      toast({
        title: "Error",
        description: "Failed to complete workout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompletingWorkout(null);
    }
  };

  if (!todaysWorkouts || todaysWorkouts.length === 0) {
    return (
      <Card className="p-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No workouts scheduled for today. Rest day!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {todaysWorkouts.map((workout) => {
        const isCompleted = workout.status === 'completed';
        const isStrength = workout.workout_templates.workout_type === 'strength';

        return (
          <Card key={workout.id} className={`p-4 sm:p-6 ${isCompleted ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {isStrength ? (
                  <Dumbbell className="h-5 w-5 text-blue-500" />
                ) : (
                  <Zap className="h-5 w-5 text-green-500" />
                )}
                <div>
                  <h3 className="font-semibold">{workout.workout_templates.title}</h3>
                  {workout.workout_templates.description && (
                    <p className="text-sm text-muted-foreground">{workout.workout_templates.description}</p>
                  )}
                </div>
              </div>
              <Badge variant={isStrength ? "default" : "secondary"}>
                {workout.workout_templates.workout_type}
              </Badge>
            </div>

            {workout.workout_templates.estimated_duration_minutes && (
              <p className="text-sm text-muted-foreground mb-4">
                Estimated time: {workout.workout_templates.estimated_duration_minutes} minutes
              </p>
            )}

            <div className="space-y-3 mb-4">
              {workout.workout_templates.exercises.map((exercise, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-start gap-3">
                    <Checkbox disabled={isCompleted} />
                    <div className="flex-1">
                      <p className="font-medium">{exercise.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {exercise.sets} sets × {exercise.reps} reps
                        {exercise.intensity && ` @ ${exercise.intensity}`}
                      </p>
                      {exercise.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{exercise.notes}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Weight tracking inputs for strength workouts */}
                  {isStrength && !isCompleted && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">Log weights:</p>
                        {previousExerciseLogs[exercise.name] && (
                          <span className="text-xs text-muted-foreground">
                            Last: <span className="font-medium text-foreground">{previousExerciseLogs[exercise.name]} lbs</span>
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Array.from({ length: exercise.sets }).map((_, setIdx) => (
                          <div key={setIdx} className="flex items-center gap-1.5">
                            <label htmlFor={`${workout.id}-${idx}-${setIdx}`} className="text-xs text-muted-foreground whitespace-nowrap">
                              Set {setIdx + 1}:
                            </label>
                            <div className="relative flex-1">
                              <Input
                                id={`${workout.id}-${idx}-${setIdx}`}
                                type="number"
                                placeholder={previousExerciseLogs[exercise.name]?.toString() || "0"}
                                min="0"
                                step="5"
                                value={exerciseLogs[workout.id]?.[idx]?.sets[setIdx]?.weight || ''}
                                onChange={(e) => handleWeightChange(workout.id, idx, setIdx, e.target.value, exercise.name, exercise.sets)}
                                className="h-9 pr-10 text-sm"
                                aria-label={`Weight for ${exercise.name}, set ${setIdx + 1}`}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                lbs
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!isCompleted && (
              <Button
                onClick={() => handleCompleteWorkout(workout.id)}
                disabled={completingWorkout === workout.id}
                className="w-full"
              >
                {completingWorkout === workout.id ? "Completing..." : "Complete Workout"}
              </Button>
            )}

            {isCompleted && (
              <div className="flex items-center justify-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Completed</span>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}