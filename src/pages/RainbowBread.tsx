import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { PageLoadingSkeleton } from "@/components/skeletons/PageLoadingSkeleton";
import { useToast } from "@/hooks/use-toast";
import { WorkoutCalendar } from "@/components/workout/WorkoutCalendar";
import { DailyChecklist } from "@/components/workout/DailyChecklist";
import { ProgressTracker } from "@/components/workout/ProgressTracker";
import { EquipmentList } from "@/components/workout/EquipmentList";
import { Rainbow, Lock } from "lucide-react";

export default function RainbowBread() {
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

  const hasAccess = hasSubModuleAccess('rainbow_bread', 'throwing', selectedSport);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!authLoading && !subLoading && !hasAccess) {
      toast({
        title: "Subscription Required",
        description: `Subscribe to the ${selectedSport} Throwing Module to access Rainbow Bread.`,
        variant: "destructive",
      });
      navigate('/pricing');
    }
  }, [authLoading, subLoading, hasAccess, selectedSport, navigate, toast]);

  useEffect(() => {
    if (hasAccess) {
      loadWorkoutData();
    }
  }, [hasAccess, selectedSport]);

  const loadWorkoutData = async () => {
    setLoadingWorkouts(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-workout-schedule', {
        body: {
          subModule: 'rainbow_bread',
          parentModule: 'throwing',
          sport: selectedSport,
        }
      });

      if (error) {
        if (error.message?.includes('not found')) {
          await initializeProgram();
        } else {
          throw error;
        }
      } else {
        setWorkoutData(data);
      }
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
      const { data, error } = await supabase.functions.invoke('initialize-workout-program', {
        body: {
          subModule: 'rainbow_bread',
          parentModule: 'throwing',
          sport: selectedSport,
          experienceLevel: 'beginner',
        }
      });

      if (error) throw error;

      toast({
        title: "Welcome to Rainbow Bread!",
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
              Subscribe to the {selectedSport} Throwing Module to access Rainbow Bread.
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
            <Rainbow className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Rainbow Bread</h1>
              <p className="text-sm text-muted-foreground">Defensive Development & Arm Care</p>
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
          />
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Today's Workouts</h2>
              <DailyChecklist
                todaysWorkouts={todaysWorkouts}
                onWorkoutCompleted={loadWorkoutData}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">6-Week Calendar</h2>
              <WorkoutCalendar
                workouts={workoutData?.workouts || []}
                currentMonth={currentMonth}
                onWorkoutClick={(workout) => console.log('Workout clicked:', workout)}
              />
            </div>

            {workoutData?.equipment && (
              <EquipmentList equipment={workoutData.equipment} />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}