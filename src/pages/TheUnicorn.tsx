import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { WorkoutProgressStreakCard } from '@/components/workout-modules/WorkoutProgressStreakCard';
import { WeekGateModal } from '@/components/workout-modules/WeekGateModal';
import { ExperienceLevelSelector } from '@/components/workout-modules/ExperienceLevelSelector';
import { DayWorkoutDetailDialog } from '@/components/workout-modules/DayWorkoutDetailDialog';
import { FullScreenWorkoutMode } from '@/components/workout-modules/FullScreenWorkoutMode';
import { useSubModuleProgress } from '@/hooks/useSubModuleProgress';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Sparkles, Dumbbell, Zap, Target, Heart, ChevronDown, ChevronUp, Check, Lock, AlertTriangle } from 'lucide-react';
import { CountdownTimer } from '@/components/workout-modules/CountdownTimer';
import { PageLoadingSkeleton } from '@/components/skeletons/PageLoadingSkeleton';
import { hasUnicornAccess } from '@/utils/tierAccess';
import { Exercise, DayData, WeekData } from '@/types/workout';
import {
  UNICORN_CYCLES,
  UNICORN_WEEKLY_CNS_TARGET,
  UNICORN_RULES,
  isUnicornDeloadWeek,
  UNICORN_DELOAD_MODIFIER,
} from '@/data/unicornProgram';

// Generate 6-week schedule for a Unicorn cycle
const generateCycleWeeks = (cycleId: number): WeekData[] => {
  const cycle = UNICORN_CYCLES.find(c => c.id === cycleId) || UNICORN_CYCLES[0];
  const weeks: WeekData[] = [];

  for (let w = 0; w < 6; w++) {
    const globalWeek = (cycleId - 1) * 6 + w + 1;
    const isDeload = isUnicornDeloadWeek(globalWeek);

    const days: DayData[] = cycle.days.map((dayTemplate, idx) => {
      if (dayTemplate.isRest) {
        return {
          day: `day${idx + 1}`,
          title: `Day ${dayTemplate.dayNumber || idx + 1}: REST`,
          exercises: [{ name: 'Active Recovery', type: 'skill' as const, description: 'Light stretching, foam rolling, or complete rest.' }],
        };
      }

      const allExercises: Exercise[] = [
        ...dayTemplate.armCare,
        ...dayTemplate.primaryExercises,
        ...dayTemplate.secondaryExercises,
      ].map(e => {
        if (isDeload && e.sets) {
          return { ...e, sets: Math.max(1, Math.round(e.sets * UNICORN_DELOAD_MODIFIER)) };
        }
        return e;
      });

      return {
        day: `day${idx + 1}`,
        title: `Day ${dayTemplate.dayNumber || idx + 1}: ${dayTemplate.title}${isDeload ? ' (DELOAD)' : ''}`,
        exercises: allExercises,
      };
    });

    weeks.push({
      week: w + 1,
      title: `Week ${w + 1}${isDeload ? ' — DELOAD' : ''}`,
      focus: cycle.description,
      days,
    });
  }

  return weeks;
};

export default function TheUnicorn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [selectedSport] = useState<'baseball' | 'softball'>(() => {
    return (localStorage.getItem('selectedSport') as 'baseball' | 'softball') || 'baseball';
  });
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [targetWeek, setTargetWeek] = useState(1);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ week: number; day: DayData; dayIndex: number } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reachedMilestone, setReachedMilestone] = useState<number | null>(null);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [fullScreenData, setFullScreenData] = useState<{ week: number; day: DayData; dayIndex: number } | null>(null);

  const { modules, loading: subLoading } = useSubscription();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const {
    progress, loading: progressLoading, initializeProgress, updateDayProgress,
    updateExerciseProgress, getExerciseProgress, updateWeightLog, getWeightLog,
    updateExperienceLevel, getWeekCompletionPercent, canUnlockWeek, isDayAccessible,
    getTimeUntilUnlock,
  } = useSubModuleProgress(selectedSport, 'hitting', 'the-unicorn');

  const isOwnerOrAdmin = isOwner || isAdmin;
  const hasAccess = isOwnerOrAdmin || hasUnicornAccess(modules);
  const loading = authLoading || subLoading || progressLoading || ownerLoading || adminLoading;

  useEffect(() => {
    if (!authLoading && !subLoading && user && !progressLoading && !progress) {
      initializeProgress();
    }
  }, [authLoading, subLoading, user, progressLoading, progress, initializeProgress]);

  if (loading) return <PageLoadingSkeleton />;

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center space-y-6 py-12">
          <Sparkles className="h-16 w-16 text-primary mx-auto" />
          <h1 className="text-3xl font-bold">{t('unicornProgram.title')}</h1>
          <p className="text-muted-foreground">
            {t('unicornProgram.accessDescription')}
          </p>
          <Button onClick={() => navigate('/pricing')}>{t('unicornProgram.upgradeToGolden')}</Button>
        </div>
      </DashboardLayout>
    );
  }

  const currentCycle = progress?.current_cycle || 1;
  const currentCycleData = UNICORN_CYCLES.find(c => c.id === currentCycle) || UNICORN_CYCLES[0];
  const weeks = generateCycleWeeks(currentCycle);
  const currentWeek = progress?.current_week || 1;
  const weekProgress = progress?.week_progress || {};
  const weekPercent = getWeekCompletionPercent(currentWeek);
  const overallPercent = Math.round(
    (Object.keys(weekProgress).reduce((sum, week) => sum + getWeekCompletionPercent(parseInt(week)), 0) / 6) * 100 / 100
  );

  // Calculate weekly CNS
  const globalWeek = (currentCycle - 1) * 6 + currentWeek;
  const isDeload = isUnicornDeloadWeek(globalWeek);
  const dayCNSValues = currentCycleData.days.filter(d => !d.isRest).map(d => isDeload ? Math.round(d.cns * UNICORN_DELOAD_MODIFIER) : d.cns);
  const weeklyCNS = dayCNSValues.reduce((s, v) => s + v, 0);

  const handleDayComplete = async (week: number, day: string, completed: boolean) => {
    const result = await updateDayProgress(week, day, completed);
    if (result && 'reachedMilestone' in result && result.reachedMilestone) {
      setReachedMilestone(result.reachedMilestone);
      setTimeout(() => setReachedMilestone(null), 6000);
    }
  };

  const isDayCompleted = (week: number, day: string) => weekProgress[week]?.[day] === true;
  const isWeekUnlocked = (week: number) => canUnlockWeek(week);
  const getDayIndex = (day: string): number => parseInt(day.replace('day', '')) - 1;

  const dayIcons = [Dumbbell, Zap, Target, Heart, Dumbbell, Zap, Heart];

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/golden-2way')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" /> {t('unicornProgram.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              Cycle {currentCycle}: {currentCycleData.name} ({currentCycleData.intensityRange})
              {(progress?.loops_completed || 0) > 0 && (
                <span className="ml-2 text-primary font-medium">🔄 Loop {(progress?.loops_completed || 0) + 1}</span>
              )}
            </p>
          </div>
        </div>

        {/* Progress & Streak */}
        <WorkoutProgressStreakCard
          currentWeek={currentWeek}
          weekCompletionPercent={weekPercent}
          overallPercent={overallPercent}
          lastActivity={progress?.last_activity}
          currentStreak={progress?.workout_streak_current || 0}
          longestStreak={progress?.workout_streak_longest || 0}
          totalWorkouts={progress?.total_workouts_completed || 0}
          reachedMilestone={reachedMilestone}
        />

        {/* CNS Budget Indicator */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              {t('unicornProgram.weeklyCNSLoad')}
              {isDeload && <Badge variant="secondary" className="text-xs">{t('unicornProgram.deloadWeek')}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{weeklyCNS} / {UNICORN_WEEKLY_CNS_TARGET}</span>
              <span className="text-muted-foreground">{Math.round((weeklyCNS / UNICORN_WEEKLY_CNS_TARGET) * 100)}%</span>
            </div>
            <Progress
              value={Math.min(100, (weeklyCNS / UNICORN_WEEKLY_CNS_TARGET) * 100)}
              className="h-3"
              indicatorClassName={weeklyCNS > UNICORN_WEEKLY_CNS_TARGET ? 'bg-destructive' : 'bg-primary'}
            />
            {isDeload && (
              <p className="text-xs text-muted-foreground">{t('unicornProgram.deloadVolumeReduced')}</p>
            )}
          </CardContent>
        </Card>

        {/* Experience Level */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-orange-500" />
              {t('unicornProgram.strengthSettings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExperienceLevelSelector
              value={progress?.experience_level || 'intermediate'}
              onChange={updateExperienceLevel}
            />
          </CardContent>
        </Card>

        {/* Weekly Plan */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t('unicornProgram.sixWeekPlan')}</h2>

          {weeks.map((week) => {
            const isUnlocked = isWeekUnlocked(week.week);
            const isExpanded = expandedWeek === week.week;
            const weekCompletionPct = getWeekCompletionPercent(week.week);

            return (
              <Card key={week.week} className={!isUnlocked ? 'opacity-60' : ''}>
                <CardHeader
                  className="pb-2 cursor-pointer"
                  onClick={() => isUnlocked ? setExpandedWeek(isExpanded ? null : week.week) : setGateModalOpen(true)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isUnlocked ? <Check className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                      <CardTitle className="text-sm">{week.title}</CardTitle>
                      {week.week === currentWeek && <Badge variant="secondary" className="text-xs">{t('unicornProgram.current')}</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{weekCompletionPct}%</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && isUnlocked && (
                  <CardContent className="pt-0 space-y-2">
                    {week.days.map((day, dayIdx) => {
                      const dayIndex = getDayIndex(day.day);
                      const isAccessible = isDayAccessible(week.week, dayIndex);
                      const timeRemaining = getTimeUntilUnlock(week.week, dayIndex);
                      const isComplete = isDayCompleted(week.week, day.day);
                      const Icon = dayIcons[dayIdx] || Dumbbell;
                      const isRestDay = day.title.includes('REST');

                      return (
                        <div
                          key={day.day}
                          className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                            isAccessible ? 'hover:bg-muted/50' : 'opacity-60 cursor-not-allowed'
                          }`}
                          onClick={() => { if (isAccessible) setSelectedDay({ week: week.week, day, dayIndex }); }}
                        >
                          <div className="flex items-center gap-2">
                            {isComplete ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : isAccessible ? (
                              <Icon className={`h-4 w-4 ${isRestDay ? 'text-muted-foreground' : 'text-primary'}`} />
                            ) : (
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className={`text-sm ${!isAccessible ? 'text-muted-foreground' : ''}`}>{day.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isAccessible && timeRemaining?.unlockTime && (
                              <CountdownTimer unlockTime={timeRemaining.unlockTime} onComplete={() => setRefreshKey(k => k + 1)} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Key Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('unicornProgram.keyRules')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs">
              {UNICORN_RULES.map((rule, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Alert variant="destructive" className="border-orange-500/50 bg-orange-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Disclaimer</AlertTitle>
          <AlertDescription className="text-xs">
            {t('unicornProgram.disclaimer')}
          </AlertDescription>
        </Alert>

        {/* Modals */}
        <WeekGateModal open={gateModalOpen} onOpenChange={setGateModalOpen} targetWeek={targetWeek} currentWeek={currentWeek} currentWeekPercent={weekPercent} />

        {selectedDay && (() => {
          const isComplete = isDayCompleted(selectedDay.week, selectedDay.day.day);
          const exerciseProg = (progress?.exercise_progress?.[selectedDay.week]?.[selectedDay.day.day] || []) as boolean[];
          const wLog = (progress?.weight_log?.[selectedDay.week]?.[selectedDay.day.day] || {}) as { [exerciseIndex: number]: number[] };
          return createPortal(
            <DayWorkoutDetailDialog
              open={!!selectedDay}
              onOpenChange={(open) => { if (!open) setSelectedDay(null); }}
              dayData={selectedDay.day}
              weekNumber={selectedDay.week}
              weekTitle={`Week ${selectedDay.week}`}
              weekFocus={currentCycleData.description}
              isCompleted={isComplete}
              onToggleComplete={() => handleDayComplete(selectedDay.week, selectedDay.day.day, !isComplete)}
              exerciseProgress={exerciseProg}
              onExerciseToggle={(exerciseIndex, completed) =>
                updateExerciseProgress(selectedDay.week, selectedDay.day.day, exerciseIndex, completed, selectedDay.day.exercises.length)
              }
              weightLog={wLog}
              onWeightUpdate={(exerciseIndex, setIndex, weight) =>
                updateWeightLog(selectedDay.week, selectedDay.day.day, exerciseIndex, setIndex, weight)
              }
              experienceLevel={progress?.experience_level || 'intermediate'}
              onEnterFullScreen={() => {
                setFullScreenData(selectedDay);
                setShowFullScreen(true);
                setSelectedDay(null);
              }}
            />,
            document.body
          );
        })()}

        {showFullScreen && fullScreenData && (() => {
          const exerciseProg = (progress?.exercise_progress?.[fullScreenData.week]?.[fullScreenData.day.day] || []) as boolean[];
          const wLog = (progress?.weight_log?.[fullScreenData.week]?.[fullScreenData.day.day] || {}) as { [exerciseIndex: number]: number[] };
          return createPortal(
            <FullScreenWorkoutMode
              exercises={fullScreenData.day.exercises}
              experienceLevel={progress?.experience_level || 'intermediate'}
              exerciseProgress={exerciseProg}
              weightLog={wLog}
              onExerciseToggle={(exerciseIndex, completed) =>
                updateExerciseProgress(fullScreenData.week, fullScreenData.day.day, exerciseIndex, completed, fullScreenData.day.exercises.length)
              }
              onWeightUpdate={(exerciseIndex, setIndex, weight) =>
                updateWeightLog(fullScreenData.week, fullScreenData.day.day, exerciseIndex, setIndex, weight)
              }
              onComplete={() => handleDayComplete(fullScreenData.week, fullScreenData.day.day, true)}
              onExit={() => {
                setShowFullScreen(false);
                setFullScreenData(null);
              }}
            />,
            document.body
          );
        })()}
      </div>
    </DashboardLayout>
  );
}
