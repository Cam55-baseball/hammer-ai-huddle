import { useState, useEffect, useCallback } from 'react';
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
import { Eye, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  } = useTexVisionProgress(currentSport);

  const { getOrCreateTodaySession, saveDrillResult } = useTexVisionSession(currentSport);
  const [activeDrill, setActiveDrill] = useState<ActiveDrill | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

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
      await refetch();
    }
    setActiveDrill(null);
  }, [sessionId, saveDrillResult, updateChecklist, updateStreak, refetch]);

  const handleDrillExit = useCallback(() => {
    setActiveDrill(null);
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

        {/* Daily Checklist */}
        <TexVisionDailyChecklist
          checklist={dailyChecklist}
          onUpdateChecklist={updateChecklist}
          loading={progressLoading}
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
        />

        {/* Disclaimer */}
        <TexVisionDisclaimer />
      </div>
    </DashboardLayout>
  );
}
