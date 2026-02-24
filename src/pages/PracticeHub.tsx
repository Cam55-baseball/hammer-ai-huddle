import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSportTerminology } from '@/hooks/useSportTerminology';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { usePerformanceSession, type DrillBlock } from '@/hooks/usePerformanceSession';
import { SessionTypeSelector } from '@/components/practice/SessionTypeSelector';
import { DrillBlockBuilder } from '@/components/practice/DrillBlockBuilder';
import { GameSessionFields } from '@/components/practice/GameSessionFields';
import { VoiceNoteInput } from '@/components/practice/VoiceNoteInput';
import { Target, Flame, Wind, Shield, Zap, Brain, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const modules = [
  { id: 'hitting', icon: Target, label: 'Hitting' },
  { id: 'pitching', icon: Flame, label: 'Pitching' },
  { id: 'throwing', icon: Wind, label: 'Throwing' },
  { id: 'fielding', icon: Shield, label: 'Fielding' },
  { id: 'baserunning', icon: Zap, label: 'Baserunning' },
  { id: 'mental', icon: Brain, label: 'Mental' },
];

type FlowStep = 'select_type' | 'build_session';

export default function PracticeHub() {
  const { t } = useTranslation();
  const { term, sport } = useSportTerminology();
  const { sport: sportKey } = useSportTheme();
  const { createSession, saving } = usePerformanceSession();
  const { toast } = useToast();

  const [activeModule, setActiveModule] = useState('hitting');
  const [step, setStep] = useState<FlowStep>('select_type');
  const [sessionType, setSessionType] = useState<string | null>(null);
  const [drillBlocks, setDrillBlocks] = useState<DrillBlock[]>([]);
  const [notes, setNotes] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [opponentLevel, setOpponentLevel] = useState('');

  const isGameType = sessionType === 'game' || sessionType === 'live_scrimmage';

  const handleSelectType = (type: string) => {
    setSessionType(type);
    setStep('build_session');
    setDrillBlocks([]);
    setNotes('');
    setOpponentName('');
    setOpponentLevel('');
  };

  const handleBack = () => {
    setStep('select_type');
    setSessionType(null);
  };

  const handleSave = async () => {
    if (!sessionType) return;
    if (isGameType && (!opponentName || !opponentLevel)) {
      toast({ title: 'Missing fields', description: 'Game sessions require opponent name and level.', variant: 'destructive' });
      return;
    }
    if (drillBlocks.length === 0) {
      toast({ title: 'No drill blocks', description: 'Add at least one drill block.', variant: 'destructive' });
      return;
    }
    const missingIntent = drillBlocks.some(b => !b.intent);
    if (missingIntent) {
      toast({ title: 'Missing intent', description: 'Every drill block requires an intent tag.', variant: 'destructive' });
      return;
    }

    try {
      await createSession({
        sport: sportKey,
        session_type: sessionType,
        session_date: new Date().toISOString().split('T')[0],
        drill_blocks: drillBlocks,
        notes: notes || undefined,
        opponent_name: isGameType ? opponentName : undefined,
        opponent_level: isGameType ? opponentLevel : undefined,
      });
      // Reset
      setStep('select_type');
      setSessionType(null);
      setDrillBlocks([]);
      setNotes('');
    } catch {
      // Error toast handled by hook
    }
  };

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
              {step === 'select_type' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <mod.icon className="h-5 w-5 text-primary" />
                      Start {mod.label} Session
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SessionTypeSelector value={sessionType} onChange={handleSelectType} />
                  </CardContent>
                </Card>
              )}

              {step === 'build_session' && sessionType && (
                <>
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    <h2 className="text-lg font-semibold capitalize">{sessionType.replace(/_/g, ' ')}</h2>
                  </div>

                  {isGameType && (
                    <Card>
                      <CardContent className="pt-4">
                        <GameSessionFields
                          opponentName={opponentName}
                          opponentLevel={opponentLevel}
                          onNameChange={setOpponentName}
                          onLevelChange={setOpponentLevel}
                        />
                      </CardContent>
                    </Card>
                  )}

                  <DrillBlockBuilder
                    module={activeModule}
                    blocks={drillBlocks}
                    onChange={setDrillBlocks}
                  />

                  <VoiceNoteInput value={notes} onChange={setNotes} />

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSave}
                    disabled={saving || drillBlocks.length === 0}
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Session
                  </Button>
                </>
              )}

              {step === 'select_type' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent {mod.label} Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">No sessions logged yet. Start your first {mod.label.toLowerCase()} session above.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
