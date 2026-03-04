import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSportTerminology } from '@/hooks/useSportTerminology';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { usePerformanceSession, type DrillBlock } from '@/hooks/usePerformanceSession';
import { SessionTypeSelector } from '@/components/practice/SessionTypeSelector';
import { GameSessionFields } from '@/components/practice/GameSessionFields';
import { RepScorer, type ScoredRep } from '@/components/practice/RepScorer';
import { GameScorecard, type AtBat } from '@/components/practice/GameScorecard';
import { FeelingsPrompt, type FeelingState } from '@/components/practice/FeelingsPrompt';
import { SessionConfigPanel, type SessionConfig } from '@/components/practice/SessionConfigPanel';
import { SessionConfigBar } from '@/components/practice/SessionConfigBar';
import { RecentSessionsList } from '@/components/practice/RecentSessionsList';
import { VoiceNoteInput } from '@/components/practice/VoiceNoteInput';
import { PostSessionSummary } from '@/components/practice/PostSessionSummary';
import { Target, Flame, Wind, Shield, Zap, Brain, ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useSessionDefaults } from '@/hooks/useSessionDefaults';

const modules = [
  { id: 'hitting', icon: Target, label: 'Hitting' },
  { id: 'pitching', icon: Flame, label: 'Pitching' },
  { id: 'throwing', icon: Wind, label: 'Throwing' },
  { id: 'fielding', icon: Shield, label: 'Fielding' },
  { id: 'catching', icon: Shield, label: 'Catching' },
  { id: 'baserunning', icon: Zap, label: 'Baserunning' },
  { id: 'mental', icon: Brain, label: 'Mental' },
];

type FlowStep = 'select_type' | 'readiness' | 'configure_session' | 'build_session' | 'session_summary';

export default function PracticeHub() {
  const { t } = useTranslation();
  const { term, sport } = useSportTerminology();
  const { sport: sportKey } = useSportTheme();
  const { createSession, saving } = usePerformanceSession();
  const { toast } = useToast();

  const [activeModule, setActiveModule] = useState('hitting');
  const { getHandedness } = useSessionDefaults(activeModule);
  const currentHandedness = useMemo(() => getHandedness(), [activeModule, getHandedness]);
  const [step, setStep] = useState<FlowStep>('select_type');
  const [sessionType, setSessionType] = useState<string | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [notes, setNotes] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [opponentLevel, setOpponentLevel] = useState('');
  const [feelings, setFeelings] = useState<FeelingState>({ body: 3, mind: 3 });

  // Rep-based scoring
  const [reps, setReps] = useState<ScoredRep[]>([]);
  // Game scoring
  const [atBats, setAtBats] = useState<AtBat[]>([]);
  // Post-session summary
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);

  const isGameType = sessionType === 'game' || sessionType === 'live_abs';
  const isGameScorecardModule = ['hitting', 'pitching', 'fielding'].includes(activeModule);

  const handleSelectType = (type: string) => {
    setSessionType(type);
    setStep('readiness');
    setReps([]);
    setAtBats([]);
    setNotes('');
    setOpponentName('');
    setOpponentLevel('');
    setFeelings({ body: 3, mind: 3 });
    setSessionConfig(null);
  };

  const handleReadinessConfirm = () => {
    setStep('configure_session');
  };

  const handleConfigConfirm = (config: SessionConfig) => {
    setSessionConfig(config);
    setStep('build_session');
  };

  const handleBack = () => {
    if (step === 'build_session') {
      setStep('configure_session');
    } else if (step === 'configure_session') {
      setStep('readiness');
    } else if (step === 'readiness') {
      setStep('select_type');
      setSessionType(null);
    } else {
      setStep('select_type');
      setSessionType(null);
    }
  };

  const handleSummaryDone = () => {
    setStep('select_type');
    setSessionType(null);
    setSessionConfig(null);
    setReps([]);
    setAtBats([]);
    setNotes('');
    setSavedSessionId(null);
  };

  // Convert reps/atBats into drill blocks for the backend
  const buildDrillBlocks = (): DrillBlock[] => {
    if (isGameType && atBats.length > 0) {
      return atBats.map((ab, i) => ({
        id: crypto.randomUUID(),
        drill_type: 'game_ab',
        intent: 'competitive',
        volume: ab.pitches.length,
        execution_grade: ['1B', '2B', '3B', 'HR'].includes(ab.outcome) ? 65 : ab.outcome === 'BB' ? 55 : 35,
        outcome_tags: [ab.outcome],
        notes: `AB${i + 1}: ${ab.outcome} (${ab.pitches.length} pitches)`,
      }));
    }

    if (reps.length > 0) {
      const qualityMap: Record<string, number> = { barrel: 70, hard: 60, weak: 40, foul: 30, miss: 20 };
      const resultMap: Record<string, number> = { strike: 60, out: 55, ball: 35, hit: 70 };

      let totalGrade = 0;
      const outcomeTags: string[] = [];

      for (const rep of reps) {
        if (rep.contact_quality) {
          totalGrade += qualityMap[rep.contact_quality] ?? 50;
          if (!outcomeTags.includes(rep.contact_quality)) outcomeTags.push(rep.contact_quality);
        } else if (rep.pitch_result) {
          totalGrade += resultMap[rep.pitch_result] ?? 50;
          if (!outcomeTags.includes(rep.pitch_result)) outcomeTags.push(rep.pitch_result);
        } else {
          totalGrade += 50;
        }
      }

      return [{
        id: crypto.randomUUID(),
        drill_type: activeModule === 'pitching' ? 'pitch_session' : 'hitting_session',
        intent: 'mechanics',
        volume: reps.length,
        execution_grade: Math.round(totalGrade / reps.length),
        outcome_tags: outcomeTags,
      }];
    }

    return [];
  };

  const handleSave = async () => {
    if (!sessionType || !sessionConfig) return;
    if (isGameType && (!opponentName || !opponentLevel)) {
      toast({ title: 'Missing fields', description: 'Game sessions require opponent name and level.', variant: 'destructive' });
      return;
    }

    const drillBlocks = buildDrillBlocks();
    if (drillBlocks.length === 0 && reps.length === 0 && atBats.length === 0) {
      toast({ title: 'No data', description: 'Score at least one rep or at-bat.', variant: 'destructive' });
      return;
    }

    try {
      const result = await createSession({
        sport: sportKey,
        session_type: sessionType,
        session_date: new Date().toISOString().split('T')[0],
        season_context: sessionConfig.season_context,
        drill_blocks: drillBlocks,
        notes: notes || undefined,
        opponent_name: isGameType ? opponentName : undefined,
        opponent_level: isGameType ? opponentLevel : undefined,
        module: activeModule,
        coach_id: sessionConfig.coach_selection.type === 'assigned' ? sessionConfig.coach_selection.coach_id : undefined,
        fatigue_state: {
          body: feelings.body,
          mind: feelings.mind,
          
          note: feelings.note,
          coach_type: sessionConfig.coach_selection.type,
          coach_session_type: sessionConfig.coach_session_type,
          external_coach_name: sessionConfig.coach_selection.type === 'external' ? sessionConfig.coach_selection.external_name : undefined,
          pitch_distance_ft: sessionConfig.pitch_distance_ft,
          velocity_band: sessionConfig.velocity_band,
          environment: sessionConfig.environment,
          indoor_outdoor: sessionConfig.indoor_outdoor,
          rep_source: sessionConfig.rep_source,
        },
        micro_layer_data: reps.length > 0 ? reps : isGameType ? atBats.flatMap(ab => ab.pitches) : undefined,
      });
      // Transition to summary instead of resetting
      setSavedSessionId(result.id);
      setStep('session_summary');
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

        <Tabs value={activeModule} onValueChange={(val) => { if (step === 'select_type') setActiveModule(val); }} className="space-y-4">
          <TabsList className={cn(
            "flex w-full overflow-x-auto gap-1 p-1 whitespace-nowrap",
            step !== 'select_type' && "pointer-events-none opacity-50"
          )}>
            {modules.map(mod => (
              <TabsTrigger key={mod.id} value={mod.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 shrink-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-bold data-[state=active]:bg-primary/10">
                <mod.icon className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">{mod.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {modules.map(mod => (
            <TabsContent key={mod.id} value={mod.id} className="space-y-4">
              {/* Step 1: Select Type */}
              {step === 'select_type' && (
                <>
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
                  <RecentSessionsList sport={sportKey} moduleLabel={mod.label} />
                </>
              )}

              {/* Step 2: Pre-Session Readiness */}
              {step === 'readiness' && sessionType && (
                <>
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    <h2 className="text-lg font-semibold capitalize">{sessionType.replace(/_/g, ' ')}</h2>
                  </div>

                  <FeelingsPrompt value={feelings} onChange={setFeelings} />

                  <Button onClick={handleReadinessConfirm} className="w-full" size="lg">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Continue to Setup
                  </Button>
                </>
              )}

              {/* Step 3: Configure Session */}
              {step === 'configure_session' && sessionType && (
                <>
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    <h2 className="text-lg font-semibold capitalize">{sessionType.replace(/_/g, ' ')}</h2>
                  </div>

                  <SessionConfigPanel
                    module={activeModule}
                    sessionType={sessionType}
                    onConfirm={handleConfigConfirm}
                    onBack={handleBack}
                  />
                </>
              )}

              {/* Step 4: Log Reps */}
              {step === 'build_session' && sessionType && sessionConfig && (
                <>
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    <h2 className="text-lg font-semibold capitalize">{sessionType.replace(/_/g, ' ')}</h2>
                  </div>

                  {/* Session config summary bar */}
                  <SessionConfigBar config={sessionConfig} onEdit={() => setStep('configure_session')} module={activeModule} handedness={currentHandedness} />


                  {/* Main scoring area */}
                  {isGameType && isGameScorecardModule ? (
                    <GameScorecard
                      module={activeModule}
                      atBats={atBats}
                      onAtBatsChange={setAtBats}
                      sport={sportKey}
                    />
                  ) : (
                    <RepScorer
                      module={activeModule}
                      reps={reps}
                      onRepsChange={setReps}
                      sessionConfig={sessionConfig}
                    />
                  )}

                  {/* Voice notes */}
                  <VoiceNoteInput value={notes} onChange={setNotes} />

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSave}
                    disabled={saving || (reps.length === 0 && atBats.length === 0)}
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Session ({isGameType ? `${atBats.length} ABs` : `${reps.length} reps`})
                  </Button>
                </>
              )}
              {/* Step 5: Post-Session Summary */}
              {step === 'session_summary' && savedSessionId && sessionType && (
                <PostSessionSummary
                  sessionId={savedSessionId}
                  module={activeModule}
                  sessionType={sessionType}
                  onDone={handleSummaryDone}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
