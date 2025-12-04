import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { WorkoutProgressCard } from '@/components/workout-modules/WorkoutProgressCard';
import { WeeklyWorkoutPlan } from '@/components/workout-modules/WeeklyWorkoutPlan';
import { EquipmentList } from '@/components/workout-modules/EquipmentList';
import { WeekGateModal } from '@/components/workout-modules/WeekGateModal';
import { useSubModuleProgress } from '@/hooks/useSubModuleProgress';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PageLoadingSkeleton } from '@/components/skeletons/PageLoadingSkeleton';

const PITCHING_WEEKS = [
  {
    week: 1,
    title: 'Arm Care Foundation',
    focus: 'Building arm health and mobility base',
    days: [
      { day: 'day1', title: 'Day 1: Mobility Assessment', exercises: ['Shoulder ROM test', 'Hip mobility check', 'Baseline measurements'] },
      { day: 'day2', title: 'Day 2: Band Work', exercises: ['J-band shoulder series', 'Internal/external rotation', 'Scap stability'] },
      { day: 'day3', title: 'Day 3: Long Toss Intro', exercises: ['Catch play - 60ft', 'Easy arc throws', 'Arm care focus'] },
      { day: 'day4', title: 'Day 4: Core Foundation', exercises: ['Plank variations', 'Dead bugs', 'Pallof press'] },
      { day: 'day5', title: 'Day 5: Recovery Protocol', exercises: ['Foam rolling', 'Stretching routine', 'Cold/heat therapy'] },
    ],
  },
  {
    week: 2,
    title: 'Mechanics Base',
    focus: 'Balance, leg drive, and arm slot fundamentals',
    days: [
      { day: 'day1', title: 'Day 1: Balance Point', exercises: ['Balance holds', 'Leg lift drill', 'Posture check'] },
      { day: 'day2', title: 'Day 2: Leg Drive', exercises: ['Hip hinge drill', 'Drive off rubber', 'Power position'] },
      { day: 'day3', title: 'Day 3: Arm Path', exercises: ['Arm circle drill', 'Slot consistency', 'Mirror work'] },
      { day: 'day4', title: 'Day 4: Full Motion', exercises: ['Towel drill', 'Shadow pitching', 'Video analysis'] },
      { day: 'day5', title: 'Day 5: Bullpen #1', exercises: ['15 fastballs', 'Mechanics focus', 'Self-evaluation'] },
    ],
  },
  {
    week: 3,
    title: 'Command Development',
    focus: 'Zone work and pitch location consistency',
    days: [
      { day: 'day1', title: 'Day 1: Target Work', exercises: ['Bucket drill', 'Quadrant targeting', 'Visual focus'] },
      { day: 'day2', title: 'Day 2: Inside/Outside', exercises: ['Glove side command', 'Arm side command', 'Spot work'] },
      { day: 'day3', title: 'Day 3: Up/Down', exercises: ['Elevated fastball', 'Low zone work', 'Vertical command'] },
      { day: 'day4', title: 'Day 4: Sequence Work', exercises: ['2-pitch sequences', 'Location patterns', 'Pitch calling'] },
      { day: 'day5', title: 'Day 5: Bullpen #2', exercises: ['25 pitches', 'All quadrants', 'Command scoring'] },
    ],
  },
  {
    week: 4,
    title: 'Pitch Development',
    focus: 'Breaking ball mechanics and changeup introduction',
    days: [
      { day: 'day1', title: 'Day 1: Curveball Basics', exercises: ['Grip work', 'Spin axis drill', 'Short distance curves'] },
      { day: 'day2', title: 'Day 2: Curveball Extension', exercises: ['Full distance curves', 'Shape consistency', 'Tunnel work'] },
      { day: 'day3', title: 'Day 3: Changeup Intro', exercises: ['Circle change grip', 'Arm speed matching', 'Feel development'] },
      { day: 'day4', title: 'Day 4: Pitch Mix', exercises: ['FB/CB sequences', 'FB/CH sequences', 'Deception focus'] },
      { day: 'day5', title: 'Day 5: Bullpen #3', exercises: ['35 pitches', 'All pitch types', 'Movement quality'] },
    ],
  },
  {
    week: 5,
    title: 'Velocity Building',
    focus: 'Intent throwing and power development',
    days: [
      { day: 'day1', title: 'Day 1: Long Toss Max', exercises: ['Progressive distance', 'Max effort throws', 'Pull-down phase'] },
      { day: 'day2', title: 'Day 2: Weighted Balls', exercises: ['Underload throws', 'Overload throws', 'Transfer sets'] },
      { day: 'day3', title: 'Day 3: Velo Day', exercises: ['Max intent bullpen', 'Gun readings', 'Rest period'] },
      { day: 'day4', title: 'Day 4: Recovery', exercises: ['Light toss only', 'Mobility work', 'Arm care'] },
      { day: 'day5', title: 'Day 5: Velo Test', exercises: ['Peak velocity test', 'Compare to baseline', 'Assessment'] },
    ],
  },
  {
    week: 6,
    title: 'Game Preparation',
    focus: 'Simulated innings and pitch sequencing mastery',
    days: [
      { day: 'day1', title: 'Day 1: Sim Inning 1', exercises: ['3-batter simulation', 'Pitch count focus', 'Recovery between'] },
      { day: 'day2', title: 'Day 2: Situational Work', exercises: ['Runners on base', 'Stretch mechanics', 'Quick slide step'] },
      { day: 'day3', title: 'Day 3: Sim Inning 2', exercises: ['4-batter simulation', 'Pressure situations', 'Mental approach'] },
      { day: 'day4', title: 'Day 4: Game Planning', exercises: ['Opponent scouting', 'Pitch sequence planning', 'Mental prep'] },
      { day: 'day5', title: 'Day 5: Final Assessment', exercises: ['Full video review', '6-week comparison', 'Next phase planning'] },
    ],
  },
];

const PITCHING_EQUIPMENT = [
  { id: 'glove', name: 'Pitching Glove', required: true, description: 'Game-ready glove' },
  { id: 'balls', name: 'Baseballs/Softballs', required: true, description: 'Minimum 12 balls' },
  { id: 'mound', name: 'Pitching Mound', required: true, description: 'Regulation or portable mound' },
  { id: 'bands', name: 'J-Bands/Resistance Bands', required: true, description: 'For arm care routine' },
  { id: 'target', name: 'Strike Zone Target', required: true, description: 'For command work' },
  { id: 'weighted_balls', name: 'Weighted Baseballs', required: false, description: 'Plyo balls (4oz-11oz)' },
  { id: 'foam_roller', name: 'Foam Roller', required: false, description: 'For recovery work' },
  { id: 'radar_gun', name: 'Radar Gun/Pocket Radar', required: false, description: 'For velocity tracking' },
];

export default function ProductionStudio() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [selectedSport, setSelectedSport] = useState<'baseball' | 'softball'>('baseball');
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [targetWeek, setTargetWeek] = useState(1);
  const [equipmentChecked, setEquipmentChecked] = useState<string[]>([]);

  const { modules, loading: subLoading } = useSubscription();
  const {
    progress,
    loading: progressLoading,
    initializeProgress,
    updateDayProgress,
    updateExerciseProgress,
    getExerciseProgress,
    advanceWeek,
    getWeekCompletionPercent,
    canUnlockWeek,
  } = useSubModuleProgress(selectedSport, 'pitching', 'production_studio');

  useEffect(() => {
    const saved = localStorage.getItem('selectedSport') as 'baseball' | 'softball';
    if (saved) setSelectedSport(saved);
  }, []);

  useEffect(() => {
    if (!authLoading && !subLoading && user && !progressLoading && !progress) {
      initializeProgress();
    }
  }, [authLoading, subLoading, user, progressLoading, progress, initializeProgress]);

  const hasAccess = modules.some(
    (m) => m.startsWith(`${selectedSport}_pitching`)
  );

  if (authLoading || subLoading || progressLoading) {
    return <PageLoadingSkeleton />;
  }

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 text-center">
          <h1 className="text-xl font-bold mb-4">{t('workoutModules.accessRequired')}</h1>
          <p className="text-muted-foreground mb-4">
            {t('workoutModules.subscribeToPitching')}
          </p>
          <Button onClick={() => navigate('/pricing')}>
            {t('workoutModules.viewPlans')}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const currentWeek = progress?.current_week || 1;
  const weekProgress = progress?.week_progress || {};
  const weekPercent = getWeekCompletionPercent(currentWeek);
  const overallPercent = Math.round(
    (Object.keys(weekProgress).reduce(
      (sum, week) => sum + getWeekCompletionPercent(parseInt(week)),
      0
    ) / 6) * 100 / 100
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

  const handleWeekSelect = (week: number) => {
    if (!canUnlockWeek(week)) {
      setTargetWeek(week);
      setGateModalOpen(true);
    }
  };

  const toggleEquipment = (itemId: string) => {
    setEquipmentChecked((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {t('workoutModules.productionStudio.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('workoutModules.productionStudio.subtitle')}
            </p>
          </div>
        </div>

        <WorkoutProgressCard
          currentWeek={currentWeek}
          weekCompletionPercent={weekPercent}
          overallPercent={overallPercent}
          lastActivity={progress?.last_activity}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-3">
              {t('workoutModules.sixWeekPlan')}
            </h2>
            <WeeklyWorkoutPlan
              weeks={PITCHING_WEEKS}
              currentWeek={currentWeek}
              weekProgress={weekProgress}
              onDayComplete={handleDayComplete}
              onWeekSelect={handleWeekSelect}
              canUnlockWeek={canUnlockWeek}
              getWeekCompletionPercent={getWeekCompletionPercent}
              getExerciseProgress={getExerciseProgress}
              onExerciseComplete={handleExerciseComplete}
              getWeightLog={() => ({})}
              onWeightUpdate={() => {}}
              experienceLevel="intermediate"
            />
          </div>

          <div>
            <EquipmentList
              equipment={PITCHING_EQUIPMENT}
              checkedItems={equipmentChecked}
              onToggleItem={toggleEquipment}
            />
          </div>
        </div>

        <WeekGateModal
          open={gateModalOpen}
          onOpenChange={setGateModalOpen}
          targetWeek={targetWeek}
          currentWeek={currentWeek}
          currentWeekPercent={weekPercent}
        />
      </div>
    </DashboardLayout>
  );
}
