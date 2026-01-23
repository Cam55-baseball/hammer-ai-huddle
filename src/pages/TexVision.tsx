import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useTexVisionAccess } from '@/hooks/useTexVisionAccess';
import { useTexVisionProgress } from '@/hooks/useTexVisionProgress';
import { useTexVisionSession, DrillResult } from '@/hooks/useTexVisionSession';
import { DashboardLayout } from '@/components/DashboardLayout';
import TexVisionStreakCard from '@/components/tex-vision/TexVisionStreakCard';
import TexVisionDailyChecklist from '@/components/tex-vision/TexVisionDailyChecklist';
import TexVisionDrillLibrary from '@/components/tex-vision/TexVisionDrillLibrary';
import TexVisionProgressMetrics from '@/components/tex-vision/TexVisionProgressMetrics';
import TexVisionDisclaimer from '@/components/tex-vision/TexVisionDisclaimer';
import ActiveDrillView from '@/components/tex-vision/ActiveDrillView';
import { S2CognitionDiagnostics, S2DiagnosticResult } from '@/components/tex-vision/S2CognitionDiagnostics';
import S2PreviousResults from '@/components/tex-vision/S2PreviousResults';
import { Eye, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, addDays } from 'date-fns';
import { toast } from 'sonner';

interface ActiveDrill {
  id: string;
  tier: string;
}

export default function TexVision() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, hasHittingAccess } = useTexVisionAccess();
  const [currentSport, setCurrentSport] = useState<string>('baseball');
  
  const {
    progress,
    dailyChecklist,
    metrics,
    loading: progressLoading,
    initializeProgress,
    updateChecklist,
    updateStreak,
    refetch,
    checkAndUpdateTierProgression,
    getTierProgressionStats,
  } = useTexVisionProgress(currentSport);

  const { getOrCreateTodaySession, saveDrillResult } = useTexVisionSession(currentSport);
  const [activeDrill, setActiveDrill] = useState<ActiveDrill | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // S2 Diagnostic state
  const [s2DiagnosticResult, setS2DiagnosticResult] = useState<S2DiagnosticResult | null>(null);
  const [s2Loading, setS2Loading] = useState(true);
  const [canTakeS2Test, setCanTakeS2Test] = useState(true);
  const [daysUntilNextS2, setDaysUntilNextS2] = useState(0);
  const [nextS2TestDate, setNextS2TestDate] = useState<Date | null>(null);
  const s2SectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const savedSport = localStorage.getItem('selectedSport');
    if (savedSport && ['baseball', 'softball'].includes(savedSport)) {
      setCurrentSport(savedSport);
    }
  }, []);

  // Fetch S2 diagnostic data
  const fetchS2Diagnostic = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tex_vision_s2_diagnostics')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', currentSport)
        .order('test_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const result = {
          ...data,
          comparison_vs_prior: data.comparison_vs_prior as S2DiagnosticResult['comparison_vs_prior'],
        } as S2DiagnosticResult;
        setS2DiagnosticResult(result);

        // Check if can take test (16 weeks lockout)
        if (data.next_test_date) {
          const nextDate = new Date(data.next_test_date);
          const today = new Date();
          const daysRemaining = differenceInDays(nextDate, today);
          setDaysUntilNextS2(Math.max(0, daysRemaining));
          setCanTakeS2Test(daysRemaining <= 0);
          setNextS2TestDate(nextDate);
        }
      } else {
        setS2DiagnosticResult(null);
        setCanTakeS2Test(true);
        setDaysUntilNextS2(0);
        setNextS2TestDate(null);
      }
    } catch (error) {
      console.error('Error fetching S2 diagnostic:', error);
    } finally {
      setS2Loading(false);
    }
  }, [user, currentSport]);

  useEffect(() => {
    if (hasAccess && user) {
      fetchS2Diagnostic();
    }
  }, [hasAccess, user, fetchS2Diagnostic]);

  const handleDrillStart = useCallback(async (drillId: string, tier: string) => {
    const session = await getOrCreateTodaySession();
    if (session) {
      setSessionId(session);
      setActiveDrill({ id: drillId, tier });
    }
  }, [getOrCreateTodaySession]);

  const handleDrillComplete = useCallback(async (result: DrillResult) => {
    if (sessionId) {
      await saveDrillResult(sessionId, result);
      await updateChecklist(result.drillType, true);
      await updateStreak();
      
      // Check for tier progression after drill completion
      const newTier = await checkAndUpdateTierProgression();
      if (newTier) {
        toast.success(`🎉 Tier Unlocked: ${newTier.charAt(0).toUpperCase() + newTier.slice(1)}!`, {
          description: `You've earned access to ${newTier} level drills. Keep training!`,
          duration: 5000,
        });
      }
      
      await refetch();
    }
    setActiveDrill(null);
  }, [sessionId, saveDrillResult, updateChecklist, updateStreak, checkAndUpdateTierProgression, refetch]);

  const handleDrillExit = useCallback(() => {
    setActiveDrill(null);
  }, []);

  // Scroll to S2 section and trigger assessment
  const handleStartS2Assessment = useCallback(() => {
    s2SectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Initialize progress if user has access but no progress record
  useEffect(() => {
    if (hasAccess && !progressLoading && !progress && user) {
      initializeProgress();
    }
  }, [hasAccess, progressLoading, progress, user, initializeProgress]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--tex-vision-primary))]" />
        </div>
      </DashboardLayout>
    );
  }

  // Access denied - show locked state
  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="space-y-6 sm:space-y-8 pb-8">
          {/* Locked Header */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(var(--tex-vision-primary))] via-[hsl(var(--tex-vision-primary-dark))] to-slate-900 p-6 sm:p-8 text-[hsl(var(--tex-vision-text))]">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-64 h-64 bg-[hsl(var(--tex-vision-success))] rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-[hsl(var(--tex-vision-feedback))] rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <Lock className="h-8 w-8 text-[hsl(var(--tex-vision-text-muted))]" />
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {t('texVision.title', 'Tex Vision')}
                </h1>
              </div>
              <p className="text-[hsl(var(--tex-vision-text-muted))] text-sm sm:text-base max-w-2xl">
                {t('texVision.subtitle', 'Neuro-Visual Performance Training')}
              </p>
            </div>
          </div>

          {/* Locked Content Card */}
          <Card className="bg-[hsl(var(--tex-vision-primary))]/50 border-[hsl(var(--tex-vision-primary-light))]/30">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-[hsl(var(--tex-vision-primary-light))]/30 flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-[hsl(var(--tex-vision-text-muted))]" />
              </div>
              <CardTitle className="text-[hsl(var(--tex-vision-text))]">
                {t('texVision.locked.title', 'Module Locked')}
              </CardTitle>
              <CardDescription className="text-[hsl(var(--tex-vision-text-muted))]">
                {t('texVision.locked.description', 'Tex Vision requires access to the Hitting Analysis module.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <p className="text-center text-sm text-[hsl(var(--tex-vision-text-muted))] max-w-md">
                {t('texVision.locked.explanation', 'Subscribe to Hitting Analysis to unlock Tex Vision and start training your visual processing, reaction time, and hand-eye coordination.')}
              </p>
              <Button 
                onClick={() => navigate('/pricing')}
                className="bg-[hsl(var(--tex-vision-success))] hover:bg-[hsl(var(--tex-vision-success))]/80 text-[hsl(var(--tex-vision-primary-dark))] font-semibold"
              >
                {t('texVision.locked.viewPricing', 'View Pricing')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Show active drill in fullscreen mode
  if (activeDrill && sessionId) {
    return (
      <ActiveDrillView
        drillId={activeDrill.id}
        tier={activeDrill.tier}
        sessionId={sessionId}
        onComplete={handleDrillComplete}
        onExit={handleDrillExit}
      />
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 pb-8">
        {/* Hero Header - Teal gradient matching Mind Fuel style */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(var(--tex-vision-primary))] via-[hsl(var(--tex-vision-primary-dark))] to-slate-900 p-6 sm:p-8 text-[hsl(var(--tex-vision-text))]">
          {/* Subtle background effects */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-64 h-64 bg-[hsl(var(--tex-vision-success))] rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-[hsl(var(--tex-vision-feedback))] rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2" />
          </div>
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <Eye className="h-8 w-8 text-[hsl(var(--tex-vision-feedback))]" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {t('texVision.title', 'Tex Vision')}
              </h1>
            </div>
            <p className="text-[hsl(var(--tex-vision-text-muted))] text-sm sm:text-base max-w-2xl">
              {t('texVision.subtitle', 'Neuro-Visual Performance Training')}
            </p>
            <p className="text-[hsl(var(--tex-vision-text-muted))]/70 text-xs sm:text-sm mt-2 max-w-xl">
              {t('texVision.description', 'Train your visual processing, reaction time, and hand-eye coordination through science-based drills.')}
            </p>
          </div>
        </div>

        {/* Streak Card */}
        <TexVisionStreakCard
          progress={progress}
          dailyChecklist={dailyChecklist}
          loading={progressLoading}
        />

        {/* Daily Checklist with S2 tracking */}
        <TexVisionDailyChecklist
          checklist={dailyChecklist}
          onUpdateChecklist={updateChecklist}
          onDrillStart={handleDrillStart}
          loading={progressLoading}
          currentTier={progress?.current_tier || 'beginner'}
          s2DiagnosticResult={s2DiagnosticResult}
          s2Loading={s2Loading}
          canTakeS2Test={canTakeS2Test}
          daysUntilNextS2={daysUntilNextS2}
          nextS2TestDate={nextS2TestDate}
          onStartS2Assessment={handleStartS2Assessment}
        />

        {/* Drill Library */}
        <TexVisionDrillLibrary
          currentTier={progress?.current_tier || 'beginner'}
          onDrillStart={handleDrillStart}
        />

        {/* Progress Metrics */}
        <TexVisionProgressMetrics
          metrics={metrics}
          progress={progress}
          loading={progressLoading}
          getTierProgressionStats={getTierProgressionStats}
        />

        {/* S2 Cognition Diagnostics */}
        <div ref={s2SectionRef}>
          <S2CognitionDiagnostics sport={currentSport} />
        </div>

        {/* Previous S2 Results */}
        <S2PreviousResults sport={currentSport} />

        {/* Disclaimer */}
        <TexVisionDisclaimer />
      </div>
    </DashboardLayout>
  );
}
