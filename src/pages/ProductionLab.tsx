import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { WorkoutProgressCard } from '@/components/workout-modules/WorkoutProgressCard';
import { WeeklyWorkoutPlan } from '@/components/workout-modules/WeeklyWorkoutPlan';
import { EquipmentList } from '@/components/workout-modules/EquipmentList';
import { WeekGateModal } from '@/components/workout-modules/WeekGateModal';
import { ExperienceLevelSelector } from '@/components/workout-modules/ExperienceLevelSelector';
import { useSubModuleProgress } from '@/hooks/useSubModuleProgress';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Dumbbell } from 'lucide-react';
import { PageLoadingSkeleton } from '@/components/skeletons/PageLoadingSkeleton';
import { WeekData, Exercise } from '@/types/workout';

// Strength Workout A: Lower Body Power
const STRENGTH_A: Exercise[] = [
  { name: 'Trap Bar Deadlift', type: 'strength', sets: 4, reps: 4, percentOf1RM: 80, trackWeight: true, notes: 'Concentric focus, controlled lower' },
  { name: 'Barbell Back Squat', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true, notes: 'Full depth, explosive up' },
  { name: 'Bulgarian Split Squat', type: 'strength', sets: 3, reps: 5, percentOf1RM: 70, trackWeight: true, notes: 'Each leg, rear foot elevated' },
  { name: 'Isometric Wall Sit', type: 'isometric', sets: 4, holdTime: 8, notes: 'Thighs parallel, max tension' },
  { name: 'Single-Leg Glute Bridge Hold', type: 'isometric', sets: 3, holdTime: 10, notes: 'Each leg, hip locked at top' },
];

// Strength Workout B: Upper Body Push/Pull
const STRENGTH_B: Exercise[] = [
  { name: 'Bench Press', type: 'strength', sets: 4, reps: 4, percentOf1RM: 80, trackWeight: true, notes: 'Pause at chest, explosive press' },
  { name: 'Barbell Row', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true, notes: 'Strict form, squeeze at top' },
  { name: 'Incline Dumbbell Press', type: 'strength', sets: 3, reps: 5, percentOf1RM: 70, trackWeight: true, notes: '30° incline' },
  { name: 'Weighted Pull-Up', type: 'strength', sets: 3, reps: 5, percentOf1RM: 75, trackWeight: true, notes: 'Full ROM, add weight as needed' },
  { name: 'Isometric Push-Up Hold', type: 'isometric', sets: 4, holdTime: 8, notes: 'Mid-position, chest tight' },
  { name: 'Isometric Inverted Row Hold', type: 'isometric', sets: 3, holdTime: 10, notes: 'Chest to bar position' },
];

// Strength Workout C: Rotational Power
const STRENGTH_C: Exercise[] = [
  { name: 'Landmine Rotational Press', type: 'strength', sets: 4, reps: 4, percentOf1RM: 75, trackWeight: true, notes: 'Each side, full hip rotation' },
  { name: 'Cable Woodchop', type: 'strength', sets: 4, reps: 5, percentOf1RM: 70, trackWeight: true, notes: 'High to low, explosive' },
  { name: 'Single-Arm Dumbbell Row', type: 'strength', sets: 3, reps: 5, percentOf1RM: 75, trackWeight: true, notes: 'Each side, anti-rotation focus' },
  { name: 'Pallof Press', type: 'strength', sets: 3, reps: 5, percentOf1RM: 65, trackWeight: true, notes: '3s hold at extension' },
  { name: 'Isometric Anti-Rotation Hold', type: 'isometric', sets: 4, holdTime: 8, notes: 'Each side, cable/band at chest' },
  { name: 'Isometric Side Plank', type: 'isometric', sets: 3, holdTime: 10, notes: 'Each side, hip high, stack feet' },
];

const HITTING_WEEKS: WeekData[] = [
  {
    week: 1,
    title: 'Foundation',
    focus: 'Stance, grip, and balance fundamentals',
    days: [
      { day: 'day1', title: 'Day 1: Stance Setup', exercises: ['Athletic stance drill', 'Balance check', 'Grip pressure test'] },
      { day: 'day2', title: 'Day 2: Strength A - Lower Body Power', exercises: [...STRENGTH_A, 'Weight shift drill', 'Hip hinge practice'] },
      { day: 'day3', title: 'Day 3: Tee Work Basics', exercises: ['Center tee - 25 swings', 'Inside tee - 15 swings', 'Outside tee - 15 swings'] },
      { day: 'day4', title: 'Day 4: Soft Toss', exercises: ['Front toss - 30 reps', 'Side toss - 20 reps', 'Focus on contact point'] },
      { day: 'day5', title: 'Day 5: Strength B - Upper Body', exercises: [...STRENGTH_B, 'Full swing session', 'Record for analysis'] },
    ],
  },
  {
    week: 2,
    title: 'Load & Timing',
    focus: 'Weight transfer and timing mechanisms',
    days: [
      { day: 'day1', title: 'Day 1: Load Sequence', exercises: ['Negative move drill', 'Stride timing', 'Weight back drill'] },
      { day: 'day2', title: 'Day 2: Strength C - Rotational Power', exercises: [...STRENGTH_C, 'Early load drill', 'Rhythm work'] },
      { day: 'day3', title: 'Day 3: Separation', exercises: ['Hip-shoulder separation', 'Rubber band drill', 'Torque creation'] },
      { day: 'day4', title: 'Day 4: Live Timing', exercises: ['Front toss timing', 'Machine work', 'Variable speeds'] },
      { day: 'day5', title: 'Day 5: Strength A - Lower Body Power', exercises: [...STRENGTH_A, 'Full sequence reps', 'Video review'] },
    ],
  },
  {
    week: 3,
    title: 'Hip Rotation',
    focus: 'Hip fire and separation drills',
    days: [
      { day: 'day1', title: 'Day 1: Hip Mechanics', exercises: ['Hip rotation isolation', 'Ground force drill', 'Core activation'] },
      { day: 'day2', title: 'Day 2: Strength B - Upper Body', exercises: [...STRENGTH_B, 'Quick hip fire', 'Resistance band work'] },
      { day: 'day3', title: 'Day 3: Connection', exercises: ['Hip-hand connection', 'Barrel lag drill', 'Sequence work'] },
      { day: 'day4', title: 'Day 4: Power Application', exercises: ['Weighted bat swings', 'Underload swings', 'Feel the difference'] },
      { day: 'day5', title: 'Day 5: Strength C - Rotational Power', exercises: [...STRENGTH_C, 'Live reps', 'Situational hitting'] },
    ],
  },
  {
    week: 4,
    title: 'Bat Path',
    focus: 'Swing plane and contact point optimization',
    days: [
      { day: 'day1', title: 'Day 1: Plane Work', exercises: ['Bat path visualization', 'Swing plane drill', 'Level through zone'] },
      { day: 'day2', title: 'Day 2: Strength A - Lower Body Power', exercises: [...STRENGTH_A, 'Inside pitch contact', 'Outside contact'] },
      { day: 'day3', title: 'Day 3: Extension', exercises: ['Extension through ball', 'Follow through work', 'Finish position'] },
      { day: 'day4', title: 'Day 4: Adjustability', exercises: ['High pitch adjustment', 'Low pitch adjustment', 'In-zone coverage'] },
      { day: 'day5', title: 'Day 5: Strength B - Upper Body', exercises: [...STRENGTH_B, 'Random pitch locations', 'Video analysis'] },
    ],
  },
  {
    week: 5,
    title: 'Power Development',
    focus: 'Bat speed and exit velocity optimization',
    days: [
      { day: 'day1', title: 'Day 1: Bat Speed Drills', exercises: ['Overload/underload protocol', 'Speed chains', 'Intent swings'] },
      { day: 'day2', title: 'Day 2: Strength C - Rotational Power', exercises: [...STRENGTH_C, 'Exit velo baseline', 'Launch angle work'] },
      { day: 'day3', title: 'Day 3: Strength Transfer', exercises: ['Med ball rotations', 'Power position holds', 'Explosive movements'] },
      { day: 'day4', title: 'Day 4: Game Power', exercises: ['Situational power', 'Driving the ball', 'Hard contact focus'] },
      { day: 'day5', title: 'Day 5: Strength A - Lower Body Power', exercises: [...STRENGTH_A, 'Max effort session', 'Record metrics'] },
    ],
  },
  {
    week: 6,
    title: 'Game Integration',
    focus: 'Live at-bats and situational application',
    days: [
      { day: 'day1', title: 'Day 1: Approach Work', exercises: ['Count-based approach', 'Pitch selection', 'Zone discipline'] },
      { day: 'day2', title: 'Day 2: Strength B - Upper Body', exercises: [...STRENGTH_B, 'Runner on 3rd drill', 'Two-strike approach'] },
      { day: 'day3', title: 'Day 3: Velocity Training', exercises: ['High velocity machine', 'Reaction time', 'Quick decisions'] },
      { day: 'day4', title: 'Day 4: Live At-Bats', exercises: ['Simulated game ABs', 'Pressure situations', 'Compete mode'] },
      { day: 'day5', title: 'Day 5: Strength C - Rotational Power', exercises: [...STRENGTH_C, 'Complete video review', 'Next phase planning'] },
    ],
  },
];

const HITTING_EQUIPMENT = [
  { id: 'bat', name: 'Game Bat', required: true, description: 'Your primary game bat' },
  { id: 'tee', name: 'Batting Tee', required: true, description: 'Adjustable height preferred' },
  { id: 'balls', name: 'Baseballs/Softballs', required: true, description: 'Minimum 12 balls' },
  { id: 'net', name: 'Hitting Net', required: true, description: 'For indoor/outdoor practice' },
  { id: 'barbell', name: 'Barbell & Plates', required: true, description: 'For compound lifts' },
  { id: 'dumbbells', name: 'Dumbbells', required: true, description: 'Various weights 10-60+ lbs' },
  { id: 'trap_bar', name: 'Trap/Hex Bar', required: false, description: 'For deadlifts' },
  { id: 'cable_machine', name: 'Cable Machine', required: false, description: 'For woodchops & pallof press' },
  { id: 'pullup_bar', name: 'Pull-Up Bar', required: true, description: 'For pull-ups & inverted rows' },
  { id: 'bench', name: 'Adjustable Bench', required: true, description: 'Flat & incline positions' },
  { id: 'weighted_bat', name: 'Weighted Training Bat', required: false, description: 'For overload training' },
  { id: 'speed_bat', name: 'Speed Training Bat', required: false, description: 'For underload training' },
  { id: 'resistance_bands', name: 'Resistance Bands', required: true, description: 'For hip, core & rotational work' },
  { id: 'med_ball', name: 'Medicine Ball', required: true, description: '6-10 lb for rotational power' },
];

export default function ProductionLab() {
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

  const hasAccess = modules.some(
    (m) => m.startsWith(`${selectedSport}_hitting`)
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
            {t('workoutModules.subscribeToHitting')}
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

  const handleWeightUpdate = (week: number, day: string, exerciseIndex: number, setIndex: number, weight: number) => {
    updateWeightLog(week, day, exerciseIndex, setIndex, weight);
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
              {t('workoutModules.productionLab.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('workoutModules.productionLab.subtitle')}
            </p>
          </div>
        </div>

        <WorkoutProgressCard
          currentWeek={currentWeek}
          weekCompletionPercent={weekPercent}
          overallPercent={overallPercent}
          lastActivity={progress?.last_activity}
        />

        {/* Experience Level Selector */}
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

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-3">
              {t('workoutModules.sixWeekPlan')}
            </h2>
            <WeeklyWorkoutPlan
              weeks={HITTING_WEEKS}
              currentWeek={currentWeek}
              weekProgress={weekProgress}
              onDayComplete={handleDayComplete}
              onWeekSelect={handleWeekSelect}
              canUnlockWeek={canUnlockWeek}
              getWeekCompletionPercent={getWeekCompletionPercent}
              getExerciseProgress={getExerciseProgress}
              onExerciseComplete={handleExerciseComplete}
              getWeightLog={getWeightLog}
              onWeightUpdate={handleWeightUpdate}
              experienceLevel={progress?.experience_level || 'intermediate'}
            />
          </div>

          <div>
            <EquipmentList
              equipment={HITTING_EQUIPMENT}
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
