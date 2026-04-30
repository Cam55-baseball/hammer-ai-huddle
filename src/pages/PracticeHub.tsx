import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
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

import { VoiceNoteInput } from '@/components/practice/VoiceNoteInput';
import { SessionVideoUploader } from '@/components/practice/SessionVideoUploader';
import { PostSessionSummaryV2 } from '@/components/practice/PostSessionSummaryV2';
import { SchedulePracticeDialog } from '@/components/practice/SchedulePracticeDialog';
import { PlayerScheduledSessions } from '@/components/practice/PlayerScheduledSessions';
import { PendingSessionApprovals } from '@/components/practice/PendingSessionApprovals';

import { VideoRepLogger } from '@/components/practice/VideoRepLogger';
import { useScheduledPracticeSessions } from '@/hooks/useScheduledPracticeSessions';
import { Target, Flame, Wind, Shield, Zap, Hand, ArrowLeft, ArrowRight, Save, Loader2, Video, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useSessionDefaults } from '@/hooks/useSessionDefaults';
import { useSwitchHitterProfile } from '@/hooks/useSwitchHitterProfile';
import { useLiveRepBroadcast } from '@/hooks/useLiveRepBroadcast';
import { PartnerRepsFeed } from '@/components/practice/PartnerRepsFeed';

const modules = [
  { id: 'hitting', icon: Target, label: 'Hitting' },
  { id: 'pitching', icon: Flame, label: 'Pitching' },
  { id: 'throwing', icon: Wind, label: 'Throwing' },
  { id: 'fielding', icon: Shield, label: 'Fielding' },
  { id: 'baserunning', icon: Zap, label: 'Baserunning' },
  { id: 'bunting', icon: Hand, label: 'Bunting' },
];

type FlowStep = 'select_type' | 'readiness' | 'configure_session' | 'build_session' | 'session_summary';

export default function PracticeHub() {
  const { t } = useTranslation();
  const { term, sport } = useSportTerminology();
  const navigate = useNavigate();
  const { sport: sportKey } = useSportTheme();
  const { createSession, saving } = usePerformanceSession();
  const { toast } = useToast();
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const { updateStatus } = useScheduledPracticeSessions();

  // Prescribed drill pre-fill from URL params
  const prescribedDrillType = searchParams.get('drill_type');
  const prescribedModule = searchParams.get('module');
  const prescribedConstraints = searchParams.get('constraints');

  const [activeModule, setActiveModule] = useState(prescribedModule || searchParams.get('module') || 'hitting');
  const [prescribedBanner, setPrescribedBanner] = useState<string | null>(null);

  // Reset module selection when sport changes
  useEffect(() => {
    if (step === 'select_type') {
      setActiveModule('hitting');
    }
  }, [sportKey]);

  // Auto-configure prescribed drill from HIE
  useEffect(() => {
    if (prescribedDrillType && prescribedModule) {
      // Map module to activeModule
      const moduleMap: Record<string, string> = {
        'practice-hub': 'hitting',
        'tex-vision': 'hitting',
        'speed-lab': 'baserunning',
      };
      const mappedModule = moduleMap[prescribedModule] || prescribedModule;
      if (modules.some(m => m.id === mappedModule)) {
        setActiveModule(mappedModule);
      }
      setPrescribedBanner(`Starting Prescribed Drill: ${prescribedDrillType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
    }
  }, [prescribedDrillType, prescribedModule]);

  const { primaryBattingSide, primaryThrowingHand } = useSwitchHitterProfile();
  const currentHandedness = useMemo(() => {
    const isHitting = activeModule === 'hitting' || activeModule === 'bunting';
    const side = isHitting ? primaryBattingSide : primaryThrowingHand;
    if (side === 'R' || side === 'L') return side;
    return undefined;
  }, [activeModule, primaryBattingSide, primaryThrowingHand]);
  const [step, setStep] = useState<FlowStep>('select_type');
  const [sessionType, setSessionType] = useState<string | null>(null);
  const [scheduledId, setScheduledId] = useState<string | null>(searchParams.get('scheduled') || null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [notes, setNotes] = useState('');
  const [feelings, setFeelings] = useState<FeelingState>({ body: 3, mind: 3 });

  // Rep-based scoring
  const [reps, setReps] = useState<ScoredRep[]>([]);

  // Live rep broadcast for linked sessions
  const { partnerReps, broadcastRep, broadcastRemoveRep } = useLiveRepBroadcast({
    linkCode: sessionConfig?.link_code,
    enabled: step === 'build_session' && !!sessionConfig?.link_code,
  });

  // Wrap setReps to broadcast new reps to partner
  const handleRepsChange = (newReps: ScoredRep[]) => {
    if (newReps.length > reps.length) {
      // A rep was added — broadcast the latest one
      const latest = newReps[newReps.length - 1];
      broadcastRep({
        index: newReps.length - 1,
        contact_quality: latest.contact_quality,
        pitch_result: latest.pitch_result,
        pitch_type: latest.pitch_type,
        swing_decision: latest.swing_decision,
        exit_direction: latest.exit_direction,
        pitch_location: latest.pitch_location,
        timestamp: Date.now(),
      });
    } else if (newReps.length < reps.length) {
      // A rep was removed — find which index
      const removedIndex = reps.findIndex((r, i) => newReps[i] !== r);
      if (removedIndex >= 0) broadcastRemoveRep(removedIndex);
    }
    setReps(newReps);
  };

  // Post-session summary
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [linkAttachError, setLinkAttachError] = useState<{
    sessionId: string;
    code: string;
    message: string;
    expired: boolean;
  } | null>(null);
  const [linkAttachConfirmed, setLinkAttachConfirmed] = useState<{ code: string } | null>(null);
  const [retryingLink, setRetryingLink] = useState(false);

  const attachSessionToLink = async (sessionId: string, code: string, userId: string) => {
    const { error } = await supabase.rpc('attach_session_to_link' as any, {
      p_user_id: userId,
      p_link_code: code,
      p_session_id: sessionId,
    });
    if (error) {
      const e: any = new Error(error.message || 'Attach failed');
      e.expired = false;
      throw e;
    }
    // Verify attach actually landed on our side
    const { data: row } = await supabase
      .from('live_ab_links' as any)
      .select('creator_user_id, joiner_user_id, creator_session_id, joiner_session_id, status')
      .eq('link_code', code)
      .maybeSingle();
    if (!row) {
      const e: any = new Error('Link not found');
      e.expired = false;
      throw e;
    }
    const r = row as any;
    const mine =
      r.creator_user_id === userId
        ? r.creator_session_id
        : r.joiner_user_id === userId
          ? r.joiner_session_id
          : null;
    if (mine !== sessionId) {
      const e: any = new Error(
        r.status === 'expired'
          ? 'Link expired before save'
          : 'Session was not attached to the link',
      );
      e.expired = r.status === 'expired';
      throw e;
    }
  };

  const handleRetryAttach = async () => {
    if (!linkAttachError || !user?.id) return;
    setRetryingLink(true);
    try {
      await attachSessionToLink(linkAttachError.sessionId, linkAttachError.code, user.id);
      const code = linkAttachError.code;
      setLinkAttachError(null);
      setLinkAttachConfirmed({ code });
      toast({ title: 'Linked', description: 'Session linked successfully.' });
    } catch (err: any) {
      toast({
        title: 'Still couldn\u2019t link',
        description: err?.message ?? 'Try again in a moment.',
        variant: 'destructive',
      });
      // Promote to expired banner if the retry revealed expiration
      if (err?.expired) {
        setLinkAttachError((prev) => (prev ? { ...prev, expired: true, message: err.message } : prev));
      }
    } finally {
      setRetryingLink(false);
    }
  };

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
    setLinkAttachError(null);
    setScheduledId(null);
  };

  // Convert reps into drill blocks for the backend
  const buildDrillBlocks = (): DrillBlock[] => {
    if (reps.length > 0) {
      const qualityMap: Record<string, number> = { barrel: 70, solid: 60, flare_burner: 55, misshit_clip: 45, weak: 30, whiff: 15 };
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

    // ── CONSTRAINT ENFORCEMENT ──
    let constraintWarning: string | null = null;
    if (prescribedConstraints) {
      try {
        const prescribed = JSON.parse(prescribedConstraints);
        const actualReps = reps.length;
        const actualVelocity = sessionConfig.velocity_band;

        // Check rep count mismatch
        if (prescribed.reps && actualReps > 0) {
          const repDiff = Math.abs(actualReps - prescribed.reps) / prescribed.reps;
          if (repDiff > 0.5) {
            constraintWarning = `Prescribed: ${prescribed.reps} reps. Logged: ${actualReps} reps. This session may not count toward your prescription.`;
            toast({ title: 'Constraint Mismatch', description: constraintWarning, variant: 'destructive' });
          } else if (repDiff > 0.2) {
            constraintWarning = `Prescribed: ${prescribed.reps} reps. Logged: ${actualReps} reps. Partial adherence recorded.`;
            toast({ title: 'Partial Adherence', description: constraintWarning });
          }
        }

        // Check velocity mismatch
        if (prescribed.velocity_band && actualVelocity && prescribed.velocity_band !== actualVelocity) {
          const velWarning = `Prescribed velocity: ${prescribed.velocity_band} mph. Used: ${actualVelocity} mph.`;
          toast({ title: 'Velocity Mismatch', description: velWarning });
        }
      } catch {
        // Non-JSON constraints, skip enforcement
      }
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
        link_code: sessionConfig.link_code,
        micro_layer_data: reps.length > 0 ? reps : undefined,
      });

      // Attach session to link state machine (handles bidirectional linking atomically)
      setLinkAttachError(null);
      setLinkAttachConfirmed(null);
      if (sessionConfig.link_code && result.id && user?.id) {
        try {
          await attachSessionToLink(result.id, sessionConfig.link_code, user.id);
          setLinkAttachConfirmed({ code: sessionConfig.link_code });
        } catch (linkErr: any) {
          console.error('[PracticeHub] attach_session_to_link failed:', linkErr);
          const expired = !!linkErr?.expired;
          setLinkAttachError({
            sessionId: result.id,
            code: sessionConfig.link_code,
            message: linkErr?.message ?? 'Unknown error',
            expired,
          });
          toast({
            title: expired ? 'Link expired before save' : 'Couldn\u2019t link sessions',
            description: expired
              ? 'Your practice was saved. Generate a new code from your next session to link again.'
              : 'Your practice was saved. Tap Retry on the summary to try again.',
            variant: 'destructive',
          });
        }
      }

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
        {prescribedBanner && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">{prescribedBanner}</span>
            {prescribedConstraints && <span className="text-xs text-muted-foreground ml-2">({prescribedConstraints})</span>}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Practice Intelligence</h1>
            <p className="text-muted-foreground">Log your practice here — pick a module below to get started</p>
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
                    {/* Base Stealing quick-link — baseball only */}
                    {mod.id === 'baserunning' && sportKey === 'baseball' && (
                      <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/base-stealing')}>
                        <CardContent className="py-4 flex items-center gap-3">
                          <Zap className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-semibold text-sm">Base Stealing Trainer</p>
                            <p className="text-xs text-muted-foreground">Reaction timing & explosive acceleration drills</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {/* Softball Stealing quick-link — softball only */}
                    {mod.id === 'baserunning' && sportKey === 'softball' && (
                      <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/softball-stealing')}>
                        <CardContent className="py-4 flex items-center gap-3">
                          <Zap className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-semibold text-sm">Softball Stealing Trainer</p>
                            <p className="text-xs text-muted-foreground">Manual stopwatch steal training with signal reactions</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                   
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
                      onRepsChange={handleRepsChange}
                      sessionConfig={sessionConfig}
                    />
                  ) : (
                    <RepScorer
                      module={activeModule}
                      reps={reps}
                      onRepsChange={handleRepsChange}
                      sessionConfig={sessionConfig}
                    />
                  )}

                  {/* Partner live reps feed — only shown for linked sessions */}
                  {sessionConfig.link_code && (
                    <PartnerRepsFeed reps={partnerReps} />
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
                <>
                  {linkAttachError && linkAttachError.expired && (
                    <div className="mb-3 p-3 rounded-lg border border-destructive/40 bg-destructive/5 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-destructive">Link expired before save</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Your practice was saved. Link{' '}
                          <span className="font-mono">{linkAttachError.code}</span> expired before both
                          partners could finalize. Generate a new code from your next session to link with
                          this partner again.
                        </p>
                      </div>
                    </div>
                  )}
                  {linkAttachError && !linkAttachError.expired && (
                    <div className="mb-3 p-3 rounded-lg border border-destructive/40 bg-destructive/5 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-destructive">Session not linked</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          We saved your practice but couldn&rsquo;t attach it to link{' '}
                          <span className="font-mono">{linkAttachError.code}</span>.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRetryAttach}
                        disabled={retryingLink}
                      >
                        {retryingLink ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Retry Link
                      </Button>
                    </div>
                  )}
                  {!linkAttachError && linkAttachConfirmed && (
                    <div className="mb-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-emerald-600" />
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Session linked to <span className="font-mono">{linkAttachConfirmed.code}</span>
                      </p>
                    </div>
                  )}
                  <PostSessionSummaryV2
                    sessionId={savedSessionId}
                    module={activeModule}
                    sessionType={sessionType}
                    onDone={handleSummaryDone}
                  />
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
