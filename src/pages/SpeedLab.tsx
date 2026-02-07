import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useSpeedProgress } from '@/hooks/useSpeedProgress';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Zap, Lock, Play, Timer, Flame, Trophy, Calendar } from 'lucide-react';
import { PageLoadingSkeleton } from '@/components/skeletons/PageLoadingSkeleton';
import { SpeedTrackCard } from '@/components/speed-lab/SpeedTrackCard';
import { SpeedSessionFlow } from '@/components/speed-lab/SpeedSessionFlow';
import { SpeedSessionHistory } from '@/components/speed-lab/SpeedSessionHistory';
import { SpeedGoalAdjustmentCard } from '@/components/speed-lab/SpeedGoalAdjustmentCard';
import { SportType, FOCUS_MESSAGE_FALLBACKS } from '@/data/speedLabProgram';
import { CountdownTimer } from '@/components/workout-modules/CountdownTimer';

export default function SpeedLab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { modules, loading: subLoading } = useSubscription();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [selectedSport, setSelectedSport] = useState<SportType>('baseball');
  const [inSession, setInSession] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('selectedSport') as SportType;
    if (saved) setSelectedSport(saved);
  }, []);

  const {
    loading: speedLoading,
    initialized,
    sessions,
    goals,
    lastSession,
    personalBests,
    nextSessionNumber,
    isLocked,
    unlockTime,
    isBreakDay,
    currentTrack,
    distances,
    sessionFocus,
    sessionDrills,
    isPlateaued,
    streakData,
    initializeJourney,
    saveSession,
    savePartnerTiming,
    fetchData,
    getTrend,
  } = useSpeedProgress(selectedSport);

  const isOwnerOrAdmin = isOwner || isAdmin;
  const hasAccess = isOwnerOrAdmin || modules.some((m) => m.startsWith(`${selectedSport}_throwing`));

  const isLoading = authLoading || subLoading || speedLoading || ownerLoading || adminLoading;

  if (isLoading) return <PageLoadingSkeleton />;

  // ─── No Access ────────────────────────────────────────────────────

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 text-center max-w-md mx-auto mt-12">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">{t('speedLab.access.title', 'Speed Lab')}</h1>
          <p className="text-muted-foreground mb-4">
            {t('speedLab.access.message', 'Speed Lab unlocks with the Throwing module. Subscribe to start your speed journey.')}
          </p>
          <Button onClick={() => navigate('/pricing')}>
            {t('speedLab.access.viewPlans', 'View Plans')}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Session Flow (Full Screen) ───────────────────────────────────

  if (inSession) {
    return (
      <SpeedSessionFlow
        sessionNumber={nextSessionNumber}
        sessionFocus={sessionFocus}
        sessionDrills={sessionDrills}
        distances={distances}
        isBreakDay={isBreakDay}
        personalBests={personalBests}
        sport={selectedSport}
        onComplete={async (data) => {
          const session = await saveSession(data);
          // Persist partner timing metadata
          if (session && data.timingMethods) {
            for (const [distance, method] of Object.entries(data.timingMethods)) {
              const times = data.distances[distance];
              if (times && times.length > 0) {
                const validTimes = times.filter(t => t > 0);
                if (validTimes.length > 0) {
                  const bestTime = Math.min(...validTimes);
                  await savePartnerTiming(session.id, distance, bestTime, method);
                }
              }
            }
          }
          setInSession(false);
          fetchData();
        }}
        onExit={() => setInSession(false)}
      />
    );
  }

  // ─── Start Journey (First-Time) ──────────────────────────────────

  if (!initialized) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
          <Card className="w-full max-w-sm border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6">
              <div className="bg-primary/10 rounded-full p-5">
                <Zap className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">
                  {t('speedLab.onboarding.title', 'Speed Lab')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('speedLab.onboarding.subtitle', 'Build elite speed with structured training, recovery science, and professional drills.')}
                </p>
              </div>
              <Button
                onClick={initializeJourney}
                className="w-full h-14 text-lg font-bold gap-2"
                size="lg"
              >
                <Zap className="h-5 w-5" />
                {t('speedLab.onboarding.start', 'Start My Speed Journey')}
              </Button>
              <p className="text-xs text-muted-foreground italic text-center">
                {t('speedLab.onboarding.fasciaNote', 'Fast bodies are springy bodies.')}
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Main View ────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              {t('speedLab.title', 'Speed Lab')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('speedLab.subtitle', 'Build elite speed, protect your body')}
            </p>
          </div>
        </div>

        {/* Speed Track Card */}
        <SpeedTrackCard
          currentTrack={currentTrack}
          personalBests={personalBests}
          distances={distances}
          getTrend={getTrend}
          isPlateaued={isPlateaued}
        />

        {/* Goal Adjustment Card */}
        <SpeedGoalAdjustmentCard visible={isPlateaued} />

        {/* Streak & Stats */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                </div>
                <p className="text-xl font-bold">{streakData.current}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{t('speedLab.stats.streak', 'Streak')}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-xl font-bold">{streakData.longest}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{t('speedLab.stats.longest', 'Best')}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xl font-bold">{streakData.total}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{t('speedLab.stats.total', 'Total')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Session Card */}
        <Card className={isLocked ? 'border-muted' : 'border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10'}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {isLocked ? <Timer className="h-4 w-4 text-muted-foreground" /> : <Play className="h-4 w-4 text-primary" />}
                {t('speedLab.nextSession.title', 'Next Session')}
              </span>
              <Badge variant="secondary">#{nextSessionNumber}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLocked && unlockTime ? (
              <div className="text-center py-4">
              <CountdownTimer
                  unlockTime={unlockTime}
                  onComplete={() => fetchData()}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t('speedLab.nextSession.locked', 'Recovery builds speed.')}
                </p>
              </div>
            ) : isBreakDay ? (
              <div className="text-center py-4">
                <p className="text-sm font-medium mb-2">
                  {t('speedLab.nextSession.breakDay', 'Today we protect speed.')}
                </p>
                <Button
                  onClick={() => setInSession(true)}
                  className="h-14 px-8 text-lg font-bold gap-2"
                  size="lg"
                >
                  {t('speedLab.nextSession.startRecovery', 'Start Recovery Session')}
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-1">
                  {sessionFocus.icon} {t(`speedLab.focusMessages.${sessionFocus.messageKey}`, FOCUS_MESSAGE_FALLBACKS[sessionFocus.messageKey] || '')}
                </p>
                <Button
                  onClick={() => setInSession(true)}
                  className="h-14 px-8 text-lg font-bold gap-2 mt-3"
                  size="lg"
                >
                  <Zap className="h-5 w-5" />
                  {t('speedLab.nextSession.start', 'Start Session')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session History */}
        <SpeedSessionHistory sessions={sessions} distances={distances} />

        {/* Disclaimer */}
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-[10px] text-muted-foreground">
            {t('speedLab.disclaimer', "Always consult with a qualified healthcare professional before beginning any exercise program. Listen to your body and stop immediately if you experience pain.")}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
