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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Dumbbell, Zap, ChevronDown, ChevronUp, Check, Lock, AlertTriangle } from 'lucide-react';
import { PageLoadingSkeleton } from '@/components/skeletons/PageLoadingSkeleton';
import { Exercise, DayData, WeekData, ExperienceLevel } from '@/types/workout';
import { CYCLES, BAT_SPEED_EXERCISES, BAT_SPEED_DAY_1, BAT_SPEED_DAY_2, BAT_SPEED_DAY_3, BAT_SPEED_DAY_4, STRENGTH_DAY_BAT_SPEED, HITTING_EQUIPMENT } from '@/data/ironBambinoProgram';

// Helper to get bat speed exercises as Exercise objects
const getBatSpeedExercises = (names: string[]): Exercise[] => {
  return names.map(name => BAT_SPEED_EXERCISES[name] || { name, type: 'skill' as const, description: '' });
};

// Generate 6-week schedule for a cycle
// Pattern: Day 1 = Strength A + Bat Speed, Day 4 = Bat Speed Only, Day 8 = Strength B + Bat Speed, etc.
const generateCycleWeeks = (cycleId: number): WeekData[] => {
  const cycle = CYCLES.find(c => c.id === cycleId) || CYCLES[0];
  const workoutKeys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  
  // In 6 weeks (42 days), with strength every 4 days, we get ~10 strength sessions
  // We'll distribute 4 unique workouts (A, B, C, D) and repeat them
  const weeks: WeekData[] = [];
  
  // Simplified schedule: 2 strength days + 2 bat speed days per week
  // Week pattern: Day 1 = Strength + Bat Speed, Day 3 = Bat Speed Only, Day 5 = Strength + Bat Speed, Day 7 = Rest
  
  for (let w = 0; w < 6; w++) {
    const workoutIndex1 = (w * 2) % 4;
    const workoutIndex2 = (w * 2 + 1) % 4;
    const batSpeedDays = [BAT_SPEED_DAY_1, BAT_SPEED_DAY_2, BAT_SPEED_DAY_3, BAT_SPEED_DAY_4];
    
    const days: DayData[] = [
      {
        day: 'day1',
        title: `Day 1: Full Body Strength ${workoutKeys[workoutIndex1]} + Bat Speed`,
        exercises: [
          ...cycle.workouts[workoutKeys[workoutIndex1]],
          ...getBatSpeedExercises(STRENGTH_DAY_BAT_SPEED),
        ],
      },
      {
        day: 'day2',
        title: 'Day 2: Rest',
        exercises: [{ name: 'Active Recovery', type: 'skill' as const, description: 'Light stretching, foam rolling, or complete rest. Allow muscles to recover from strength training.' }],
      },
      {
        day: 'day3',
        title: 'Day 3: Bat Speed Development',
        exercises: getBatSpeedExercises(batSpeedDays[w % 4]),
      },
      {
        day: 'day4',
        title: 'Day 4: Rest',
        exercises: [{ name: 'Active Recovery', type: 'skill' as const, description: 'Light stretching, foam rolling, or complete rest. Prepare for next strength session.' }],
      },
      {
        day: 'day5',
        title: `Day 5: Full Body Strength ${workoutKeys[workoutIndex2]} + Bat Speed`,
        exercises: [
          ...cycle.workouts[workoutKeys[workoutIndex2]],
          ...getBatSpeedExercises(STRENGTH_DAY_BAT_SPEED),
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

export default function ProductionLab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [selectedSport, setSelectedSport] = useState<'baseball' | 'softball'>('baseball');
  const [selectedCycle, setSelectedCycle] = useState(1);
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [targetWeek, setTargetWeek] = useState(1);
  const [equipmentChecked, setEquipmentChecked] = useState<string[]>([]);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ week: number; day: DayData } | null>(null);

  const { modules, loading: subLoading } = useSubscription();
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
    advanceWeek,
    getWeekCompletionPercent,
    canUnlockWeek,
  } = useSubModuleProgress(selectedSport, 'hitting', 'production_lab');

  useEffect(() => {
    const saved = localStorage.getItem('selectedSport') as 'baseball' | 'softball';
    if (saved) setSelectedSport(saved);
  }, []);

  useEffect(() => {
    if (!authLoading && !subLoading && user && !progressLoading && !progress) {
      initializeProgress();
    }
  }, [authLoading, subLoading, user, progressLoading, progress, initializeProgress]);

  const hasAccess = modules.some((m) => m.startsWith(`${selectedSport}_hitting`));
  const weeks = generateCycleWeeks(selectedCycle);
  const currentCycle = CYCLES.find(c => c.id === selectedCycle) || CYCLES[0];

  if (authLoading || subLoading || progressLoading) {
    return <PageLoadingSkeleton />;
  }

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 text-center">
          <h1 className="text-xl font-bold mb-4">{t('workoutModules.accessRequired')}</h1>
          <p className="text-muted-foreground mb-4">{t('workoutModules.subscribeToHitting')}</p>
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

  const handleDayComplete = (week: number, day: string, completed: boolean) => {
    updateDayProgress(week, day, completed);
    if (completed && week === currentWeek) {
      const newPercent = getWeekCompletionPercent(week);
      if (newPercent >= 70 && week < 6) {
        advanceWeek(week + 1);
      }
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

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t('workoutModules.productionLab.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('workoutModules.productionLab.subtitle')}</p>
          </div>
        </div>

        {/* Progress Card */}
        <WorkoutProgressCard
          currentWeek={currentWeek}
          weekCompletionPercent={weekPercent}
          overallPercent={overallPercent}
          lastActivity={progress?.last_activity}
        />

        {/* Cycle Selector */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              {t('workoutModules.cycleSelector', 'Training Cycle')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('workoutModules.cycleDescription', '24-week periodized program - 4 cycles of 6 weeks each')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCycle.toString()} onValueChange={(v) => setSelectedCycle(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CYCLES.map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id.toString()}>
                    Cycle {cycle.id}: {cycle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{currentCycle.description}</p>
          </CardContent>
        </Card>

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
                      {week.days.map((day) => (
                        <div
                          key={day.day}
                          className="flex items-center justify-between p-2 rounded-lg border cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedDay({ week: week.week, day })}
                        >
                          <div className="flex items-center gap-2">
                            {isDayCompleted(week.week, day.day) ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2" />
                            )}
                            <span className="text-sm">{day.title}</span>
                          </div>
                          <div className="flex gap-1">
                            {day.exercises.some(e => typeof e === 'object' && e.type === 'strength') && (
                              <Badge variant="outline" className="text-xs">{t('workoutModules.strengthWorkout')}</Badge>
                            )}
                            {day.exercises.some(e => typeof e === 'object' && e.type === 'isometric') && (
                              <Badge variant="outline" className="text-xs">{t('workoutModules.isometricWorkout')}</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          <div>
            <EquipmentList equipment={HITTING_EQUIPMENT} checkedItems={equipmentChecked} onToggleItem={toggleEquipment} />
          </div>
        </div>

        {/* Disclaimer */}
        <Alert variant="destructive" className="border-orange-500/50 bg-orange-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('workoutModules.disclaimer.title', 'Disclaimer')}</AlertTitle>
          <AlertDescription className="text-xs">
            {t('workoutModules.disclaimer.text', "Hammer's Modality is not responsible for any injury that may occur during exercises. There are no guarantees in results. Always consult with a qualified healthcare professional before beginning any exercise program. Listen to your body and stop immediately if you experience pain.")}
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
              onExerciseToggle={(index, completed) => 
                handleExerciseComplete(selectedDay.week, selectedDay.day.day, index, completed, selectedDay.day.exercises.length)
              }
              weightLog={getWeightLog(selectedDay.week, selectedDay.day.day)}
              onWeightUpdate={(exerciseIndex, setIndex, weight) => 
                handleWeightUpdate(selectedDay.week, selectedDay.day.day, exerciseIndex, setIndex, weight)
              }
              experienceLevel={(progress?.experience_level as ExperienceLevel) || 'intermediate'}
            />
          );
        })()}
      </div>
    </DashboardLayout>
  );
}
