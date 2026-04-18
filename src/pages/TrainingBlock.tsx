import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { TrainingBlockView } from '@/components/training-block/TrainingBlockView';
import { TrainingPreferencesEditor } from '@/components/training-block/TrainingPreferencesEditor';
import { DailyWorkoutPlanner } from '@/components/training-block/DailyWorkoutPlanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTrainingBlock } from '@/hooks/useTrainingBlock';
import { CalendarRange, Zap } from 'lucide-react';

export default function TrainingBlockPage() {
  const [params, setParams] = useSearchParams();
  const { activeBlock } = useTrainingBlock();
  const mode = params.get('mode') === 'daily' ? 'daily' : 'block';

  const setMode = (m: string) => {
    const next = new URLSearchParams(params);
    next.set('mode', m);
    setParams(next, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Hammer Workout Plan</h1>
            <p className="text-sm text-muted-foreground">
              Build a 6-week training block or generate a one-off workout for any day.
            </p>
          </div>
        </div>

        <Tabs value={mode} onValueChange={setMode} className="w-full">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="block" className="gap-2">
              <CalendarRange className="h-4 w-4" />
              6-Week Block
            </TabsTrigger>
            <TabsTrigger value="daily" className="gap-2">
              <Zap className="h-4 w-4" />
              Daily Plan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="block" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TrainingBlockView />
              </div>
              <div>
                <TrainingPreferencesEditor />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="daily" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DailyWorkoutPlanner />
              </div>
              <div>
                {activeBlock && (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    You have an active 6-week block running. Daily workouts you save here will appear on your Game Plan alongside it.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
