import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { WorkoutProgressCard } from '@/components/workout-modules/WorkoutProgressCard';
import { EquipmentList } from '@/components/workout-modules/EquipmentList';
import { WeekGateModal } from '@/components/workout-modules/WeekGateModal';
import { ExperienceLevelSelector } from '@/components/workout-modules/ExperienceLevelSelector';
import { DayWorkoutDetailDialog } from '@/components/workout-modules/DayWorkoutDetailDialog';
import { useSubModuleProgress } from '@/hooks/useSubModuleProgress';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Dumbbell, ChevronDown, ChevronUp, Check, Lock, AlertTriangle } from 'lucide-react';
import { WorkoutStreakCard } from '@/components/workout-modules/WorkoutStreakCard';
import { CountdownTimer } from '@/components/workout-modules/CountdownTimer';
import { NotificationPermissionCard } from '@/components/workout-modules/NotificationPermissionCard';
import { useWorkoutNotifications } from '@/hooks/useWorkoutNotifications';
import { PageLoadingSkeleton } from '@/components/skeletons/PageLoadingSkeleton';
import { Exercise, DayData, WeekData } from '@/types/workout';
import { 
  PITCHING_CYCLES, 
  PITCHING_EQUIPMENT,
  ARM_CARE_EXERCISES,
  VELOCITY_EXERCISES,
  PITCH_DEV_EXERCISES,
  ARM_CARE_DAY,
  VELOCITY_DAY_1,
  VELOCITY_DAY_2,
  VELOCITY_DAY_3,
  PITCH_DEV_DAY_1,
  PITCH_DEV_DAY_2,
  PITCH_DEV_DAY_3,
  STRENGTH_DAY_ARM_CARE,
} from '@/data/heatFactoryProgram';

// Helper to get exercises as Exercise objects
const getThrowingExercises = (names: string[]): Exercise[] => {
  const allExercises = { ...ARM_CARE_EXERCISES, ...VELOCITY_EXERCISES, ...PITCH_DEV_EXERCISES };
  return names.map(name => allExercises[name] || { name, type: 'skill' as const, description: '' });
};

// Generate 6-week schedule for a cycle
const generateCycleWeeks = (cycleId: number): WeekData[] => {
  const cycle = PITCHING_CYCLES.find(c => c.id === cycleId) || PITCHING_CYCLES[0];
  const workoutKeys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  
  // Different throwing focus based on cycle
  const getThrowingDays = (cycleId: number, weekIndex: number) => {
    if (cycleId === 1) {
      // Foundation: Arm care focus
      return [ARM_CARE_DAY, VELOCITY_DAY_1];
    } else if (cycleId === 2) {
      // Velocity: Heavy velocity work
      const veloDays = [VELOCITY_DAY_1, VELOCITY_DAY_2, VELOCITY_DAY_3];
      return [veloDays[weekIndex % 3], veloDays[(weekIndex + 1) % 3]];
    } else if (cycleId === 3) {
      // Arsenal: Pitch development
      const pitchDays = [PITCH_DEV_DAY_1, PITCH_DEV_DAY_2, PITCH_DEV_DAY_3];
      return [pitchDays[weekIndex % 3], VELOCITY_DAY_1];
    } else {
      // Game readiness: Mixed
      const veloDays = [VELOCITY_DAY_1, VELOCITY_DAY_2];
      const pitchDays = [PITCH_DEV_DAY_1, PITCH_DEV_DAY_2];
      return weekIndex % 2 === 0 ? [veloDays[weekIndex % 2], pitchDays[weekIndex % 2]] : [pitchDays[weekIndex % 2], veloDays[weekIndex % 2]];
    }
  };
  
  const weeks: WeekData[] = [];
  
  for (let w = 0; w < 6; w++) {
    const workoutIndex1 = (w * 2) % 4;
    const workoutIndex2 = (w * 2 + 1) % 4;
    const [throwingDay1, throwingDay2] = getThrowingDays(cycleId, w);
    
    const days: DayData[] = [
      {
        day: 'day1',
        titleKey: 'day1StrengthArmCare',
        titleParams: { workout: workoutKeys[workoutIndex1] },
        title: `Day 1: Strength ${workoutKeys[workoutIndex1]} + Arm Care`,
        exercises: [
          ...cycle.workouts[workoutKeys[workoutIndex1]],
          ...getThrowingExercises(STRENGTH_DAY_ARM_CARE),
        ],
      },
      {
        day: 'day2',
        titleKey: 'day2RestRecovery',
        title: 'Day 2: Rest & Recovery',
        exercises: [{ name: 'Active Recovery', type: 'skill' as const, description: 'Light stretching, foam rolling, or complete rest. Allow muscles and arm to recover. Light J-band work optional.' }],
      },
      {
        day: 'day3',
        titleKey: cycleId === 2 ? 'day3VelocityDev' : cycleId === 3 ? 'day3PitchDev' : 'day3ThrowingDev',
        title: cycleId === 2 ? 'Day 3: Velocity Development' : cycleId === 3 ? 'Day 3: Pitch Development' : 'Day 3: Throwing Development',
        exercises: getThrowingExercises(throwingDay1),
      },
      {
        day: 'day4',
        titleKey: 'day4RestRecovery',
        title: 'Day 4: Rest & Recovery',
        exercises: [{ name: 'Active Recovery', type: 'skill' as const, description: 'Light stretching, foam rolling, or complete rest. Prepare for next strength session. J-band arm care encouraged.' }],
      },
      {
        day: 'day5',
        titleKey: 'day5StrengthCommand',
        titleParams: { workout: workoutKeys[workoutIndex2] },
        title: `Day 5: Strength ${workoutKeys[workoutIndex2]} + Command Work`,
        exercises: [
          ...cycle.workouts[workoutKeys[workoutIndex2]],
          ...getThrowingExercises(throwingDay2.slice(0, 3)),
        ],
      },
    ];
    
    weeks.push({
      week: w + 1,
      title: `Week ${w + 1}`,
      focus: cycle.focus,
      days,
    });
  }
  
  return weeks;
};

export default function ProductionStudio() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [selectedSport, setSelectedSport] = useState<'baseball' | 'softball'>('baseball');
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [targetWeek, setTargetWeek] = useState(1);
  const [equipmentChecked, setEquipmentChecked] = useState<string[]>([]);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ week: number; day: DayData; dayIndex: number } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { modules, loading: subLoading } = useSubscription();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const {
    progress,
    loading: progressLoading,
    initializeProgress,
    updateDayProgress,
    updateExerciseProgress,
    getExerciseProgress,
    updateWeightLog,
    getWeightLog,
    updateExperienceLevel,
    getWeekCompletionPercent,
    canUnlockWeek,
    isDayAccessible,
    getTimeUntilUnlock,
  } = useSubModuleProgress(selectedSport, 'pitching', 'production_studio');

  const { 
    requestPermission, 
    scheduleNotification, 
    permission: notificationPermission,
    isSupported: notificationsSupported,
  } = useWorkoutNotifications();

  useEffect(() => {
    const saved = localStorage.getItem('selectedSport') as 'baseball' | 'softball';
    if (saved) setSelectedSport(saved);
  }, []);

  useEffect(() => {
    if (!authLoading && !subLoading && user && !progressLoading && !progress) {
      initializeProgress();
    }
  }, [authLoading, subLoading, user, progressLoading, progress, initializeProgress]);

  useEffect(() => {
    if (notificationsSupported && notificationPermission === 'default') {
      requestPermission();
    }
  }, [notificationsSupported, notificationPermission, requestPermission]);

  const isOwnerOrAdmin = isOwner || isAdmin;
  const hasAccess = isOwnerOrAdmin || modules.some((m) => m.startsWith(`${selectedSport}_pitching`));
  
  const currentCycle = progress?.current_cycle || 1;
  const currentCycleData = PITCHING_CYCLES.find(c => c.id === currentCycle) || PITCHING_CYCLES[0];
  const weeks = generateCycleWeeks(currentCycle);

  if (authLoading || subLoading || progressLoading || ownerLoading || adminLoading) {
    return <PageLoadingSkeleton />;
  }

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 text-center">
          <h1 className="text-xl font-bold mb-4">{t('workoutModules.accessRequired')}</h1>
          <p className="text-muted-foreground mb-4">{t('workoutModules.subscribeToPitching')}</p>
          <Button onClick={() => navigate('/pricing')}>{t('workoutModules.viewPlans')}</Button>
        </div>
      </DashboardLayout>
    );
  }

  const currentWeek = progress?.current_week || 1;
  const weekProgress = progress?.week_progress || {};
  const weekPercent = getWeekCompletionPercent(currentWeek);
  const overallPercent = Math.round(
    (Object.keys(weekProgress).reduce((sum, week) => sum + getWeekCompletionPercent(parseInt(week)), 0) / 6) * 100 / 100
  );

  const handleDayComplete = async (week: number, day: string, completed: boolean) => {
    await updateDayProgress(week, day, completed);
    
    if (completed) {
      const unlockTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      scheduleNotification(unlockTime);
    }
  };

  const handleExerciseComplete = (week: number, day: string, exerciseIndex: number, completed: boolean, totalExercises: number) => {
    updateExerciseProgress(week, day, exerciseIndex, completed, totalExercises);
  };

  const handleWeightUpdate = (week: number, day: string, exerciseIndex: number, setIndex: number, weight: number) => {
    updateWeightLog(week, day, exerciseIndex, setIndex, weight);
  };

  const isDayCompleted = (week: number, day: string) => {
    return weekProgress[week]?.[day] === true;
  };

  const isWeekUnlocked = (week: number) => canUnlockWeek(week);

  const toggleEquipment = (itemId: string) => {
    setEquipmentChecked((prev) => prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]);
  };

  const getDayIndex = (day: string): number => {
    return parseInt(day.replace('day', '')) - 1;
  };

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t('workoutModules.productionStudio.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('workoutModules.productionStudio.subtitle')}</p>
          </div>
        </div>

        {/* Progress Card */}
        <WorkoutProgressCard
          currentWeek={currentWeek}
          weekCompletionPercent={weekPercent}
          overallPercent={overallPercent}
          lastActivity={progress?.last_activity}
        />

        {/* Workout Streak Card */}
        <WorkoutStreakCard
          currentStreak={progress?.workout_streak_current || 0}
          longestStreak={progress?.workout_streak_longest || 0}
          totalWorkouts={progress?.total_workouts_completed || 0}
        />

        {/* Experience Level */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-orange-500" />
              {t('workoutModules.strengthSettings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExperienceLevelSelector
              value={progress?.experience_level || 'intermediate'}
              onChange={updateExperienceLevel}
            />
          </CardContent>
        </Card>

        {/* Notification Permission */}
        <NotificationPermissionCard
          permission={notificationPermission}
          isSupported={notificationsSupported}
          onRequestPermission={requestPermission}
        />

        {/* Weekly Plan */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-lg font-semibold">{t('workoutModules.sixWeekPlan')}</h2>
            
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
                        {isUnlocked ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <CardTitle className="text-sm">{week.title}</CardTitle>
                        {week.week === currentWeek && (
                          <Badge variant="secondary" className="text-xs">{t('workoutModules.current')}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{weekCompletionPct}%</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && isUnlocked && (
                    <CardContent className="pt-0 space-y-2">
                      {week.days.map((day) => {
                        const dayIndex = getDayIndex(day.day);
                        const isAccessible = isDayAccessible(week.week, dayIndex);
                        const timeRemaining = getTimeUntilUnlock(week.week, dayIndex);
                        const isComplete = isDayCompleted(week.week, day.day);

                        return (
                          <div
                            key={day.day}
                            className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                              isAccessible 
                                ? 'hover:bg-muted/50' 
                                : 'opacity-60 cursor-not-allowed'
                            }`}
                            onClick={() => {
                              if (isAccessible) {
                                setSelectedDay({ week: week.week, day, dayIndex });
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {isComplete ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : isAccessible ? (
                                <div className="h-4 w-4 rounded-full border-2" />
                              ) : (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className={`text-sm ${!isAccessible ? 'text-muted-foreground' : ''}`}>
                                {day.titleKey ? t(`workoutContent.dayTitles.${day.titleKey}`, day.titleParams || {}) : day.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {!isAccessible && timeRemaining && timeRemaining.unlockTime && (
                                <CountdownTimer 
                                  unlockTime={timeRemaining.unlockTime}
                                  onComplete={() => setRefreshKey(k => k + 1)}
                                />
                              )}
                              {day.exercises.some(e => typeof e === 'object' && e.type === 'strength') && isAccessible && (
                                <Badge variant="outline" className="text-xs">{t('workoutModules.strengthWorkout')}</Badge>
                              )}
                              {day.exercises.some(e => typeof e === 'object' && e.type === 'isometric') && isAccessible && (
                                <Badge variant="outline" className="text-xs">{t('workoutModules.isometricWorkout')}</Badge>
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

          <div>
            <EquipmentList equipment={PITCHING_EQUIPMENT} checkedItems={equipmentChecked} onToggleItem={toggleEquipment} />
          </div>
        </div>

        {/* Disclaimer */}
        <Alert variant="destructive" className="border-orange-500/50 bg-orange-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('workoutModules.disclaimer.title')}</AlertTitle>
          <AlertDescription className="text-xs">
            {t('workoutModules.disclaimer.pitchingText')}
          </AlertDescription>
        </Alert>

        {/* Modals */}
        <WeekGateModal
          open={gateModalOpen}
          onOpenChange={setGateModalOpen}
          targetWeek={targetWeek}
          currentWeek={currentWeek}
          currentWeekPercent={weekPercent}
        />

        {selectedDay && (() => {
          const weekData = weeks.find(w => w.week === selectedDay.week);
          return (
            <DayWorkoutDetailDialog
              open={!!selectedDay}
              onOpenChange={(open) => !open && setSelectedDay(null)}
              dayData={selectedDay.day}
              weekNumber={selectedDay.week}
              weekTitle={weekData?.title || ''}
              weekFocus={weekData?.focus || ''}
              isCompleted={isDayCompleted(selectedDay.week, selectedDay.day.day)}
              onToggleComplete={() => handleDayComplete(selectedDay.week, selectedDay.day.day, !isDayCompleted(selectedDay.week, selectedDay.day.day))}
              exerciseProgress={getExerciseProgress(selectedDay.week, selectedDay.day.day, selectedDay.day.exercises.length)}
              onExerciseToggle={(index, completed) => handleExerciseComplete(selectedDay.week, selectedDay.day.day, index, completed, selectedDay.day.exercises.length)}
              weightLog={getWeightLog(selectedDay.week, selectedDay.day.day)}
              onWeightUpdate={(exerciseIndex, setIndex, weight) => handleWeightUpdate(selectedDay.week, selectedDay.day.day, exerciseIndex, setIndex, weight)}
              experienceLevel={progress?.experience_level || 'intermediate'}
            />
          );
        })()}
      </div>
    </DashboardLayout>
  );
}
