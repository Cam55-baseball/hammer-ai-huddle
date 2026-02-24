import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSportTerminology } from '@/hooks/useSportTerminology';
import { Target, Flame, Wind, Shield, Zap, Brain } from 'lucide-react';

const modules = [
  { id: 'hitting', icon: Target, label: 'Hitting' },
  { id: 'pitching', icon: Flame, label: 'Pitching' },
  { id: 'throwing', icon: Wind, label: 'Throwing' },
  { id: 'fielding', icon: Shield, label: 'Fielding' },
  { id: 'baserunning', icon: Zap, label: 'Baserunning' },
  { id: 'mental', icon: Brain, label: 'Mental' },
];

const sessionTypes = [
  { id: 'personal_practice', label: 'Personal Practice' },
  { id: 'team_practice', label: 'Team Practice' },
  { id: 'coach_lesson', label: 'Coach Lesson' },
  { id: 'game', label: 'Game' },
  { id: 'post_game_analysis', label: 'Post-Game Analysis' },
  { id: 'bullpen', label: 'Bullpen' },
  { id: 'live_scrimmage', label: 'Live Scrimmage' },
  { id: 'rehab_session', label: 'Rehab Session' },
];

export default function PracticeHub() {
  const { t } = useTranslation();
  const { term, sport } = useSportTerminology();
  const [activeModule, setActiveModule] = useState('hitting');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Practice Intelligence</h1>
          <p className="text-muted-foreground">Log sessions, track progress, and build your MPI score</p>
        </div>

        <Tabs value={activeModule} onValueChange={setActiveModule} className="space-y-4">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
            {modules.map(mod => (
              <TabsTrigger key={mod.id} value={mod.id} className="flex items-center gap-1.5 text-xs md:text-sm">
                <mod.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{mod.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {modules.map(mod => (
            <TabsContent key={mod.id} value={mod.id} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <mod.icon className="h-5 w-5 text-primary" />
                    {mod.label} — {sport === 'softball' && mod.id === 'pitching' ? term('sessionTypes', 'bullpen') : mod.label} Module
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {sessionTypes.map(st => (
                      <Button
                        key={st.id}
                        variant="outline"
                        className="h-auto py-4 flex flex-col items-center gap-1 text-center"
                      >
                        <span className="text-sm font-medium">
                          {st.id === 'bullpen' ? term('sessionTypes', 'bullpen') : st.label}
                        </span>
                        <span className="text-xs text-muted-foreground">Start Session</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent {mod.label} Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">No sessions logged yet. Start your first {mod.label.toLowerCase()} session above.</p>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
