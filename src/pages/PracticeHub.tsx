import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSportTerminology } from '@/hooks/useSportTerminology';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { usePerformanceSession, type DrillBlock } from '@/hooks/usePerformanceSession';
import { SessionTypeSelector } from '@/components/practice/SessionTypeSelector';
import { RepScorer, type ScoredRep } from '@/components/practice/RepScorer';
import { FeelingsPrompt, type FeelingState } from '@/components/practice/FeelingsPrompt';
import { SessionConfigPanel, type SessionConfig } from '@/components/practice/SessionConfigPanel';
import { SessionConfigBar } from '@/components/practice/SessionConfigBar';
import { RecentSessionsList } from '@/components/practice/RecentSessionsList';
import { VoiceNoteInput } from '@/components/practice/VoiceNoteInput';
import { SessionVideoUploader } from '@/components/practice/SessionVideoUploader';
import { PostSessionSummary } from '@/components/practice/PostSessionSummary';
import { SchedulePracticeDialog } from '@/components/practice/SchedulePracticeDialog';
import { PlayerScheduledSessions } from '@/components/practice/PlayerScheduledSessions';
import { PendingSessionApprovals } from '@/components/practice/PendingSessionApprovals';

import { VideoRepLogger } from '@/components/practice/VideoRepLogger';
import { useScheduledPracticeSessions } from '@/hooks/useScheduledPracticeSessions';
import { Target, Flame, Wind, Shield, Zap, ArrowLeft, ArrowRight, Save, Loader2, Video } from 'lucide-react';
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
  
];

type FlowStep = 'select_type' | 'readiness' | 'configure_session' | 'build_session' | 'session_summary';

export default function PracticeHub() {
  const { t } = useTranslation();
  const { term, sport } = useSportTerminology();
  const { sport: sportKey } = useSportTheme();
  const { createSession, saving } = usePerformanceSession();
  const { toast } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const { updateStatus } = useScheduledPracticeSessions();

  const [activeModule, setActiveModule] = useState(searchParams.get('module') || 'hitting');
  const { getHandedness } = useSessionDefaults(activeModule);
  const currentHandedness = useMemo(() => getHandedness(), [activeModule, getHandedness]);
  const [step, setStep] = useState<FlowStep>('select_type');
  const [sessionType, setSessionType] = useState<string | null>(null);
  const [scheduledId, setScheduledId] = useState<string | null>(searchParams.get('scheduled') || null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [notes, setNotes] = useState('');
  const [feelings, setFeelings] = useState<FeelingState>({ body: 3, mind: 3 });

  // Rep-based scoring
  const [reps, setReps] = useState<ScoredRep[]>([]);
  // Post-session summary
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);

  // Video+Log mode toggle
  const [videoLogMode, setVideoLogMode] = useState(false);

  // Deep-link: auto-start from URL params
  useEffect(() => {
    const urlType = searchParams.get('type');
    const urlModule = searchParams.get('module');
    if (urlModule && urlType && step === 'select_type') {
      setActiveModule(urlModule);
      handleSelectType(urlType);
      // Clear params to avoid re-triggering
      setSearchParams({}, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isGameType = sessionType === 'live_abs';
  

  // Session-level AI field validation
  // Goal of Rep and Actual Outcome are optional — no longer block save
  const sessionAIFieldsValid = true;

  const handleSelectType = (type: string) => {
    setSessionType(type);
    setStep('readiness');
    setReps([]);
    setNotes('');
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
    
    setNotes('');
    setSavedSessionId(null);
    setScheduledId(null);
  };

  // Convert reps into drill blocks for the backend
  const buildDrillBlocks = (): DrillBlock[] => {
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

    const drillBlocks = buildDrillBlocks();
    if (drillBlocks.length === 0 && reps.length === 0) {
      toast({ title: 'No data', description: 'Score at least one rep.', variant: 'destructive' });
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
        micro_layer_data: reps.length > 0 ? reps : undefined,
      });
      // Transition to summary instead of resetting
      setSavedSessionId(result.id);
      setStep('session_summary');
      // Mark scheduled session as completed
      if (scheduledId) {
        await updateStatus(scheduledId, 'completed');
      }
    } catch {
      // Error toast handled by hook
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Practice Intelligence</h1>
            <p className="text-muted-foreground">Log sessions, track progress, and build your MPI score</p>
          </div>
          <SchedulePracticeDialog defaultModule={activeModule} />
        </div>

        <PendingSessionApprovals />
        <PlayerScheduledSessions />

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


                  {/* Logging mode toggle — Standard vs Video+Log */}
                  {!isGameType && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={videoLogMode ? 'ghost' : 'default'}
                        size="sm"
                        onClick={() => setVideoLogMode(false)}
                        className="text-xs gap-1"
                      >
                        Standard Logging
                      </Button>
                      <Button
                        type="button"
                        variant={videoLogMode ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setVideoLogMode(true)}
                        className="text-xs gap-1"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Video + Log
                      </Button>
                    </div>
                  )}

                  {/* Main scoring area */}
                  {videoLogMode ? (
                    <VideoRepLogger
                      module={activeModule}
                      reps={reps}
                      onRepsChange={setReps}
                      sessionConfig={sessionConfig}
                    />
                  ) : (
                    <RepScorer
                      module={activeModule}
                      reps={reps}
                      onRepsChange={setReps}
                      sessionConfig={sessionConfig}
                    />
                  )}

                  {/* Video uploader + Voice notes in collapsible section */}
                  <SessionVideoUploader reps={reps} sessionId={savedSessionId ?? undefined} />

                  <details className="group">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                      Voice Notes & Overrides
                    </summary>
                    <div className="mt-2">
                      <VoiceNoteInput value={notes} onChange={setNotes} />
                    </div>
                  </details>


                  {/* Sticky bottom action bar */}
                  <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border py-3 -mx-4 px-4 mt-4 flex items-center gap-3">
                    <div className="flex-1 text-xs text-muted-foreground">
                      {`${reps.length} reps`} logged
                    </div>
                    <Button
                      size="lg"
                      onClick={handleSave}
                      disabled={saving || reps.length === 0}
                      className="gap-2"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Session
                    </Button>
                  </div>
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
