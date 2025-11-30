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
}

export function DailyChecklist({ todaysWorkouts, onWorkoutCompleted }: DailyChecklistProps) {
  const { toast } = useToast();
  const [completingWorkout, setCompletingWorkout] = useState<string | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, any>>({});

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
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
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