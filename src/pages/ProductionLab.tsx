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
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PageLoadingSkeleton } from '@/components/skeletons/PageLoadingSkeleton';

const HITTING_WEEKS = [
  {
    week: 1,
    title: 'Foundation',
    focus: 'Stance, grip, and balance fundamentals',
    days: [
      { day: 'day1', title: 'Day 1: Stance Setup', exercises: ['Athletic stance drill', 'Balance check', 'Grip pressure test'] },
      { day: 'day2', title: 'Day 2: Load Mechanics', exercises: ['Weight shift drill', 'Hip hinge practice', 'Mirror work'] },
      { day: 'day3', title: 'Day 3: Tee Work Basics', exercises: ['Center tee - 25 swings', 'Inside tee - 15 swings', 'Outside tee - 15 swings'] },
      { day: 'day4', title: 'Day 4: Soft Toss', exercises: ['Front toss - 30 reps', 'Side toss - 20 reps', 'Focus on contact point'] },
      { day: 'day5', title: 'Day 5: Review & Record', exercises: ['Full swing session', 'Record for analysis', 'Self-assessment'] },
    ],
  },
  {
    week: 2,
    title: 'Load & Timing',
    focus: 'Weight transfer and timing mechanisms',
    days: [
      { day: 'day1', title: 'Day 1: Load Sequence', exercises: ['Negative move drill', 'Stride timing', 'Weight back drill'] },
      { day: 'day2', title: 'Day 2: Trigger Timing', exercises: ['Early load drill', 'Rhythm work', 'Timing cues'] },
      { day: 'day3', title: 'Day 3: Separation', exercises: ['Hip-shoulder separation', 'Rubber band drill', 'Torque creation'] },
      { day: 'day4', title: 'Day 4: Live Timing', exercises: ['Front toss timing', 'Machine work', 'Variable speeds'] },
      { day: 'day5', title: 'Day 5: Integration', exercises: ['Full sequence reps', 'Video review', 'Progress check'] },
    ],
  },
  {
    week: 3,
    title: 'Hip Rotation',
    focus: 'Hip fire and separation drills',
    days: [
      { day: 'day1', title: 'Day 1: Hip Mechanics', exercises: ['Hip rotation isolation', 'Ground force drill', 'Core activation'] },
      { day: 'day2', title: 'Day 2: Fire Drills', exercises: ['Quick hip fire', 'Resistance band work', 'Power position'] },
      { day: 'day3', title: 'Day 3: Connection', exercises: ['Hip-hand connection', 'Barrel lag drill', 'Sequence work'] },
      { day: 'day4', title: 'Day 4: Power Application', exercises: ['Weighted bat swings', 'Underload swings', 'Feel the difference'] },
      { day: 'day5', title: 'Day 5: Game Simulation', exercises: ['Live reps', 'Situational hitting', 'Mental approach'] },
    ],
  },
  {
    week: 4,
    title: 'Bat Path',
    focus: 'Swing plane and contact point optimization',
    days: [
      { day: 'day1', title: 'Day 1: Plane Work', exercises: ['Bat path visualization', 'Swing plane drill', 'Level through zone'] },
      { day: 'day2', title: 'Day 2: Contact Points', exercises: ['Inside pitch contact', 'Middle contact', 'Outside contact'] },
      { day: 'day3', title: 'Day 3: Extension', exercises: ['Extension through ball', 'Follow through work', 'Finish position'] },
      { day: 'day4', title: 'Day 4: Adjustability', exercises: ['High pitch adjustment', 'Low pitch adjustment', 'In-zone coverage'] },
      { day: 'day5', title: 'Day 5: Full Integration', exercises: ['Random pitch locations', 'Video analysis', 'Refinement'] },
    ],
  },
  {
    week: 5,
    title: 'Power Development',
    focus: 'Bat speed and exit velocity optimization',
    days: [
      { day: 'day1', title: 'Day 1: Bat Speed Drills', exercises: ['Overload/underload protocol', 'Speed chains', 'Intent swings'] },
      { day: 'day2', title: 'Day 2: Power Metrics', exercises: ['Exit velo baseline', 'Launch angle work', 'Quality at-bats'] },
      { day: 'day3', title: 'Day 3: Strength Transfer', exercises: ['Med ball rotations', 'Power position holds', 'Explosive movements'] },
      { day: 'day4', title: 'Day 4: Game Power', exercises: ['Situational power', 'Driving the ball', 'Hard contact focus'] },
      { day: 'day5', title: 'Day 5: Peak Performance', exercises: ['Max effort session', 'Record metrics', 'Compare to baseline'] },
    ],
  },
  {
    week: 6,
    title: 'Game Integration',
    focus: 'Live at-bats and situational application',
    days: [
      { day: 'day1', title: 'Day 1: Approach Work', exercises: ['Count-based approach', 'Pitch selection', 'Zone discipline'] },
      { day: 'day2', title: 'Day 2: Situational Hitting', exercises: ['Runner on 3rd drill', 'Two-strike approach', 'Productive outs'] },
      { day: 'day3', title: 'Day 3: Velocity Training', exercises: ['High velocity machine', 'Reaction time', 'Quick decisions'] },
      { day: 'day4', title: 'Day 4: Live At-Bats', exercises: ['Simulated game ABs', 'Pressure situations', 'Compete mode'] },
      { day: 'day5', title: 'Day 5: Final Assessment', exercises: ['Complete video review', 'Progress comparison', 'Next phase planning'] },
    ],
  },
];

const HITTING_EQUIPMENT = [
  { id: 'bat', name: 'Game Bat', required: true, description: 'Your primary game bat' },
  { id: 'tee', name: 'Batting Tee', required: true, description: 'Adjustable height preferred' },
  { id: 'balls', name: 'Baseballs/Softballs', required: true, description: 'Minimum 12 balls' },
  { id: 'net', name: 'Hitting Net', required: true, description: 'For indoor/outdoor practice' },
  { id: 'weighted_bat', name: 'Weighted Training Bat', required: false, description: 'For overload training' },
  { id: 'speed_bat', name: 'Speed Training Bat', required: false, description: 'For underload training' },
  { id: 'resistance_bands', name: 'Resistance Bands', required: false, description: 'For hip and core work' },
  { id: 'med_ball', name: 'Medicine Ball', required: false, description: '6-10 lb for rotational power' },
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
    
    // Check if we should unlock next week
    if (completed && week === currentWeek) {
      const newPercent = getWeekCompletionPercent(week);
      if (newPercent >= 70 && week < 6) {
        advanceWeek(week + 1);
      }
    }
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
