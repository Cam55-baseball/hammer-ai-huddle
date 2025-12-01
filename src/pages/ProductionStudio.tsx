import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { PageLoadingSkeleton } from "@/components/skeletons/PageLoadingSkeleton";
import { useToast } from "@/hooks/use-toast";
import { WorkoutCalendar } from "@/components/workout/WorkoutCalendar";
import { DailyChecklist } from "@/components/workout/DailyChecklist";
import { ProgressTracker } from "@/components/workout/ProgressTracker";
import { EquipmentList } from "@/components/workout/EquipmentList";
import { Clapperboard, Lock, Dumbbell, Zap, X } from "lucide-react";

export default function ProductionStudio() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasSubModuleAccess, loading: subLoading } = useSubscription();
  const { toast } = useToast();
  
  const [selectedSport, setSelectedSport] = useState<'baseball' | 'softball'>(() => {
    const saved = localStorage.getItem('selectedSport');
    return (saved === 'baseball' || saved === 'softball') ? saved : 'baseball';
  });

  const [workoutData, setWorkoutData] = useState<any>(null);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);

  const hasAccess = hasSubModuleAccess('production_studio', 'hitting', selectedSport);

  // Validate session on mount and redirect if invalid
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        console.log('No valid session, redirecting to auth');
        await supabase.auth.signOut();
        navigate('/auth');
      }
    };
    checkSession();
  }, [navigate]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!authLoading && !subLoading && !hasAccess) {
      toast({
        title: "Subscription Required",
        description: `Subscribe to the ${selectedSport} Hitting Module to access Production Studio.`,
        variant: "destructive",
      });
      navigate('/pricing');
    }
  }, [authLoading, subLoading, hasAccess, selectedSport, navigate, toast]);

  const handleUpdateMetrics = async (exitVelocity: number, distance: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-power-metrics', {
        body: {
          exitVelocity,
          distance,
          progressId: workoutData?.progress?.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Success! 🎉",
        description: "Power metrics updated successfully!",
      });
      
      // Reload workout data to get updated metrics
      await loadWorkoutData();
    } catch (error: any) {
      console.error('Error updating metrics:', error);
      if (error.message?.includes('Cannot update metrics yet')) {
        toast({
          title: "Too Soon",
          description: `You can update your metrics again in ${error.daysRemaining} days`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update metrics. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    if (hasAccess && user) {
      loadWorkoutData();
    }
  }, [hasAccess, selectedSport, user]);

  const loadWorkoutData = async () => {
    setLoadingWorkouts(true);
    try {
      // Get user's local date
      const localDate = new Date();
      const localDateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
      
      const { data, error } = await supabase.functions.invoke('get-workout-schedule', {
        body: {
          subModule: 'production_studio',
          parentModule: 'hitting',
          sport: selectedSport,
          localDate: localDateStr,
        }
      });

      // Handle 401 Unauthorized - session expired or invalid
      if (error?.message?.includes('Unauthorized') || data?.error === 'Unauthorized') {
        await supabase.auth.signOut();
        navigate('/auth');
        return;
      }

      if (error || data?.error) {
        const errorMsg = error?.message || data?.error || '';
        throw new Error(errorMsg);
      }

      // Check if user needs program initialization
      if (data?.status === 'no_progress') {
        console.log('No workout program found, initializing...');
        await initializeProgram();
        return;
      }
      
      setWorkoutData(data);
    } catch (error) {
      console.error('Error loading workout data:', error);
      toast({
        title: "Error",
        description: "Failed to load workout program. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingWorkouts(false);
    }
  };

  const initializeProgram = async () => {
    try {
      // Get user's local date (not UTC)
      const localDate = new Date();
      const localDateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
      
      const { data, error } = await supabase.functions.invoke('initialize-workout-program', {
        body: {
          subModule: 'production_studio',
          parentModule: 'hitting',
          sport: selectedSport,
          experienceLevel: 'beginner',
          localDate: localDateStr,
        }
      });

      if (error) throw error;

      toast({
        title: "Welcome to Production Studio!",
        description: "Your 6-week workout program has been initialized.",
      });

      await loadWorkoutData();
    } catch (error) {
      console.error('Error initializing program:', error);
      toast({
        title: "Error",
        description: "Failed to initialize workout program. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || subLoading || loadingWorkouts) {
    return <PageLoadingSkeleton />;
  }

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center space-y-4">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-bold">Subscription Required</h2>
            <p className="text-muted-foreground">
              Subscribe to the {selectedSport} Hitting Module to access Production Studio.
            </p>
            <Button onClick={() => navigate('/pricing')} className="w-full">
              View Pricing
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const todaysWorkouts = workoutData?.workouts?.filter((w: any) => w.scheduled_date === workoutData.today) || [];
  const daysRemaining = workoutData?.progress ? 42 - workoutData.progress.current_day_in_block : 42;

  return (
    <DashboardLayout>
      <div className="container max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clapperboard className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Production Studio</h1>
              <p className="text-sm text-muted-foreground">Hitting Power Development</p>
            </div>
          </div>

          <Tabs value={selectedSport} onValueChange={(v) => setSelectedSport(v as 'baseball' | 'softball')}>
            <TabsList>
              <TabsTrigger value="baseball">⚾ Baseball</TabsTrigger>
              <TabsTrigger value="softball">🥎 Softball</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {workoutData?.progress && (
          <ProgressTracker
            completionPercentage={workoutData.progress.completion_percentage || 0}
            completedWorkouts={workoutData.progress.total_workouts_completed || 0}
            totalWorkouts={42}
            currentBlock={workoutData.progress.current_block || 1}
            daysRemaining={daysRemaining}
            exitVelocity={workoutData.progress.exit_velocity}
            exitVelocityPrevious={workoutData.progress.exit_velocity_previous}
            exitVelocityLastUpdated={workoutData.progress.exit_velocity_last_updated}
            distance={workoutData.progress.distance}
            distancePrevious={workoutData.progress.distance_previous}
            distanceLastUpdated={workoutData.progress.distance_last_updated}
            progressId={workoutData.progress.id}
            onUpdateMetrics={handleUpdateMetrics}
          />
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">
                {new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })} Workout
              </h2>
              <DailyChecklist
                todaysWorkouts={todaysWorkouts}
                onWorkoutCompleted={loadWorkoutData}
                previousExerciseLogs={workoutData?.previousExerciseLogs || {}}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">6-Week Calendar</h2>
              <WorkoutCalendar
                workouts={workoutData?.workouts || []}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                onWorkoutClick={setSelectedWorkout}
              />
            </div>

            {workoutData?.equipment && (
              <EquipmentList equipment={workoutData.equipment} />
            )}
          </div>
        </div>
      </div>

      {/* Workout Preview Dialog */}
      <Dialog open={!!selectedWorkout} onOpenChange={() => setSelectedWorkout(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedWorkout?.workout_templates.workout_type === 'strength' ? (
                  <Dumbbell className="h-5 w-5 text-blue-500" />
                ) : (
                  <Zap className="h-5 w-5 text-green-500" />
                )}
                <span>{selectedWorkout?.workout_templates.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedWorkout?.status === 'completed' && (
                  <Badge variant="default" className="bg-green-600">
                    ✓ Completed
                  </Badge>
                )}
                <Badge variant={selectedWorkout?.workout_templates.workout_type === 'strength' ? "default" : "secondary"}>
                  {selectedWorkout?.workout_templates.workout_type}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedWorkout && (
            <div className="space-y-4">
              {selectedWorkout.workout_templates.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedWorkout.workout_templates.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Scheduled: {new Date(selectedWorkout.scheduled_date).toLocaleDateString()}</span>
                {selectedWorkout.workout_templates.estimated_duration_minutes && (
                  <span>Duration: {selectedWorkout.workout_templates.estimated_duration_minutes} min</span>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Exercises</h3>
                {selectedWorkout.workout_templates.exercises.map((exercise: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium">{exercise.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {exercise.sets} sets × {exercise.reps} reps
                      {exercise.intensity && ` @ ${exercise.intensity}`}
                    </p>
                    {exercise.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{exercise.notes}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Logged Weights for Completed Workouts */}
              {selectedWorkout.status === 'completed' && selectedWorkout.exercise_logs && Object.keys(selectedWorkout.exercise_logs).length > 0 && (
                <div className="space-y-3 mt-4 pt-4 border-t">
                  <h3 className="font-semibold text-green-600">Logged Weights</h3>
                  {Object.entries(selectedWorkout.exercise_logs).map(([idx, log]: [string, any]) => (
                    <div key={idx} className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <p className="font-medium text-sm">{log.name}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {log.sets?.map((set: any, setIdx: number) => (
                          <Badge key={setIdx} variant="outline" className="font-mono text-xs bg-background">
                            Set {setIdx + 1}: {set.weight || '-'} lbs
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                  {selectedWorkout.completed_date && (
                    <p className="text-xs text-muted-foreground">
                      Completed on {new Date(selectedWorkout.completed_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}