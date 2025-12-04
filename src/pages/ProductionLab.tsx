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
  { name: 'Trap Bar Deadlift', type: 'strength', sets: 4, reps: 4, percentOf1RM: 80, trackWeight: true, description: 'Stand inside hex bar, grip handles, drive through heels to stand tall. Hips and knees extend together.', notes: 'Concentric focus, controlled lower' },
  { name: 'Barbell Back Squat', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true, description: 'Bar on upper traps, feet shoulder-width. Descend until thighs parallel, then drive up explosively.', notes: 'Full depth, explosive up' },
  { name: 'Bulgarian Split Squat', type: 'strength', sets: 3, reps: 5, percentOf1RM: 70, trackWeight: true, description: 'Rear foot elevated on bench behind you. Lower until front thigh is parallel, then push through front heel.', notes: 'Each leg, rear foot elevated' },
  { name: 'Isometric Wall Sit', type: 'isometric', sets: 4, holdTime: 8, description: 'Back flat against wall, slide down until thighs parallel to floor. Hold position without moving.', notes: 'Thighs parallel, max tension' },
  { name: 'Single-Leg Glute Bridge Hold', type: 'isometric', sets: 3, holdTime: 10, description: 'Lie on back, one foot planted. Drive hip up, hold at top with straight line from knee to shoulder.', notes: 'Each leg, hip locked at top' },
];

// Strength Workout B: Upper Body Push/Pull
const STRENGTH_B: Exercise[] = [
  { name: 'Bench Press', type: 'strength', sets: 4, reps: 4, percentOf1RM: 80, trackWeight: true, description: 'Lie on bench, grip bar slightly wider than shoulders. Lower to chest with control, press up explosively.', notes: 'Pause at chest, explosive press' },
  { name: 'Barbell Row', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true, description: 'Hinge at hips, back flat. Pull bar to lower chest, squeeze shoulder blades, lower with control.', notes: 'Strict form, squeeze at top' },
  { name: 'Incline Dumbbell Press', type: 'strength', sets: 3, reps: 5, percentOf1RM: 70, trackWeight: true, description: 'On incline bench (30°), press dumbbells from shoulder level to full extension overhead.', notes: '30° incline' },
  { name: 'Weighted Pull-Up', type: 'strength', sets: 3, reps: 5, percentOf1RM: 75, trackWeight: true, description: 'Hang from bar with added weight via belt or vest. Pull until chin clears bar, lower with control.', notes: 'Full ROM, add weight as needed' },
  { name: 'Isometric Push-Up Hold', type: 'isometric', sets: 4, holdTime: 8, description: 'Lower to mid-position of push-up (elbows at 90°). Hold steady without sinking or rising.', notes: 'Mid-position, chest tight' },
  { name: 'Isometric Inverted Row Hold', type: 'isometric', sets: 3, holdTime: 10, description: 'Under bar at chest height, pull up and hold with chest near bar, body in straight line.', notes: 'Chest to bar position' },
];

// Strength Workout C: Rotational Power
const STRENGTH_C: Exercise[] = [
  { name: 'Landmine Rotational Press', type: 'strength', sets: 4, reps: 4, percentOf1RM: 75, trackWeight: true, description: 'Bar anchored in corner or landmine. Start at shoulder, rotate hips and press diagonally across body.', notes: 'Each side, full hip rotation' },
  { name: 'Cable Woodchop', type: 'strength', sets: 4, reps: 5, percentOf1RM: 70, trackWeight: true, description: 'High cable attachment. Pull diagonally down across body with rotation, keeping arms extended.', notes: 'High to low, explosive' },
  { name: 'Single-Arm Dumbbell Row', type: 'strength', sets: 3, reps: 5, percentOf1RM: 75, trackWeight: true, description: 'One hand and knee on bench. Row dumbbell to hip while resisting torso rotation.', notes: 'Each side, anti-rotation focus' },
  { name: 'Pallof Press', type: 'strength', sets: 3, reps: 5, percentOf1RM: 65, trackWeight: true, description: 'Cable at chest height. Press hands forward away from body, resisting rotation from cable tension.', notes: '3s hold at extension' },
  { name: 'Isometric Anti-Rotation Hold', type: 'isometric', sets: 4, holdTime: 8, description: 'Cable/band at chest height. Arms extended forward, resist pull trying to rotate your torso.', notes: 'Each side, cable/band at chest' },
  { name: 'Isometric Side Plank', type: 'isometric', sets: 3, holdTime: 10, description: 'On elbow and side of foot. Hold body in straight line with hips elevated off ground.', notes: 'Each side, hip high, stack feet' },
];

// Skill exercise definitions
const SKILL_EXERCISES: { [key: string]: Exercise } = {
  // Week 1 - Foundation
  'Athletic stance drill': { name: 'Athletic stance drill', type: 'skill', description: 'Feet shoulder-width apart, knees slightly bent, weight balanced on balls of feet, hands relaxed in front.' },
  'Balance check': { name: 'Balance check', type: 'skill', description: 'Single-leg balance holds for 10-15 seconds each leg to develop stability through the swing.' },
  'Grip pressure test': { name: 'Grip pressure test', type: 'skill', description: 'Practice light-to-firm grip pressure (scale 1-10), finding optimal tension without over-gripping.' },
  'Weight shift drill': { name: 'Weight shift drill', type: 'skill', description: 'Rock weight from back foot to front foot slowly, feeling the transfer of energy through your core.' },
  'Hip hinge practice': { name: 'Hip hinge practice', type: 'skill', description: 'Hinge at hips while keeping back flat, loading the posterior chain for power generation.' },
  'Center tee - 25 swings': { name: 'Center tee - 25 swings', type: 'skill', description: 'Position ball in center of strike zone at waist height. Focus on solid contact and level swing path.' },
  'Inside tee - 15 swings': { name: 'Inside tee - 15 swings', type: 'skill', description: 'Tee positioned inside half of plate. Get hands through quickly, pull ball with authority.' },
  'Outside tee - 15 swings': { name: 'Outside tee - 15 swings', type: 'skill', description: 'Tee positioned outside half of plate. Let ball travel deeper, drive to opposite field.' },
  'Front toss - 30 reps': { name: 'Front toss - 30 reps', type: 'skill', description: 'Partner tosses from 15-20 feet in front. Focus on timing and clean contact through the zone.' },
  'Side toss - 20 reps': { name: 'Side toss - 20 reps', type: 'skill', description: 'Partner tosses from side at 45° angle. Emphasize seeing ball early and staying balanced.' },
  'Focus on contact point': { name: 'Focus on contact point', type: 'skill', description: 'Mental focus drill - visualize exact contact point out front of plate for each pitch location.' },
  'Full swing session': { name: 'Full swing session', type: 'skill', description: 'Put it all together - 25-30 quality swings incorporating all fundamentals learned.' },
  'Record for analysis': { name: 'Record for analysis', type: 'skill', description: 'Video record your swings from side angle for review and AI analysis.' },
  // Week 2 - Load & Timing
  'Negative move drill': { name: 'Negative move drill', type: 'skill', description: 'Small weight shift backward before forward movement. Creates rhythm and stores energy.' },
  'Stride timing': { name: 'Stride timing', type: 'skill', description: 'Practice stride foot landing as pitcher releases. Foot down, hands back, ready to fire.' },
  'Weight back drill': { name: 'Weight back drill', type: 'skill', description: 'Load weight onto back hip/leg during negative move. Feel 60-70% of weight loaded back.' },
  'Early load drill': { name: 'Early load drill', type: 'skill', description: 'Begin load movement earlier in pitcher wind-up. Creates more time and reduces rush.' },
  'Rhythm work': { name: 'Rhythm work', type: 'skill', description: 'Small movement patterns to stay loose and ready. Never start from dead stop position.' },
  'Hip-shoulder separation': { name: 'Hip-shoulder separation', type: 'skill', description: 'Hips begin rotation while shoulders stay closed. Creates torque and bat whip.' },
  'Rubber band drill': { name: 'Rubber band drill', type: 'skill', description: 'Visualize rubber band stretching between hips and shoulders during load. Release creates power.' },
  'Torque creation': { name: 'Torque creation', type: 'skill', description: 'Practice feeling the stretch between lower and upper body at foot plant position.' },
  'Front toss timing': { name: 'Front toss timing', type: 'skill', description: 'Front toss with focus on timing trigger to load. Sync movements with tosser rhythm.' },
  'Machine work': { name: 'Machine work', type: 'skill', description: 'Pitching machine at moderate speed. Work on timing recognition and load sequence.' },
  'Variable speeds': { name: 'Variable speeds', type: 'skill', description: 'Alternate between different pitch speeds to develop timing adjustability.' },
  'Full sequence reps': { name: 'Full sequence reps', type: 'skill', description: 'Complete swing sequence from stance to follow-through. Chain all movements together.' },
  'Video review': { name: 'Video review', type: 'skill', description: 'Review recorded swings. Compare to proper mechanics, identify areas to improve.' },
  // Week 3 - Hip Rotation
  'Hip rotation isolation': { name: 'Hip rotation isolation', type: 'skill', description: 'Rotate hips without upper body. Feel hip muscles fire and lead the swing.' },
  'Ground force drill': { name: 'Ground force drill', type: 'skill', description: 'Push into ground with back foot to initiate rotation. Ground reaction creates power.' },
  'Core activation': { name: 'Core activation', type: 'skill', description: 'Engage core muscles during rotation. Core connects lower body power to upper body.' },
  'Quick hip fire': { name: 'Quick hip fire', type: 'skill', description: 'Rapid hip rotation from loaded position. Speed of hip turn determines bat speed.' },
  'Resistance band work': { name: 'Resistance band work', type: 'skill', description: 'Band around waist, partner holds. Rotate against resistance to build hip strength.' },
  'Hip-hand connection': { name: 'Hip-hand connection', type: 'skill', description: 'Hands stay connected to hip rotation. Hips pull hands through zone.' },
  'Barrel lag drill': { name: 'Barrel lag drill', type: 'skill', description: 'Feel barrel lag behind hands during swing. Creates whip effect at contact.' },
  'Sequence work': { name: 'Sequence work', type: 'skill', description: 'Practice correct firing sequence: hips, core, shoulders, arms, hands, barrel.' },
  'Weighted bat swings': { name: 'Weighted bat swings', type: 'skill', description: 'Overload training with heavy bat. Builds strength in swing pattern muscles.' },
  'Underload swings': { name: 'Underload swings', type: 'skill', description: 'Speed training with light bat. Develops fast-twitch muscles for bat speed.' },
  'Feel the difference': { name: 'Feel the difference', type: 'skill', description: 'Alternate weighted/regular bat. Notice how game bat feels lighter and faster.' },
  'Live reps': { name: 'Live reps', type: 'skill', description: 'Live pitching or high-speed machine. Apply drill work to real pitch recognition.' },
  'Situational hitting': { name: 'Situational hitting', type: 'skill', description: 'Practice specific game situations: runner on 3rd, 2-strike approach, etc.' },
  // Week 4 - Bat Path
  'Bat path visualization': { name: 'Bat path visualization', type: 'skill', description: 'Visualize bat traveling on slight upward plane through hitting zone. Match pitch plane.' },
  'Swing plane drill': { name: 'Swing plane drill', type: 'skill', description: 'Practice swing on plane that matches typical pitch trajectory (slight downward).' },
  'Level through zone': { name: 'Level through zone', type: 'skill', description: 'Stay level through hitting zone for maximum contact window. Not upper-cutting.' },
  'Inside pitch contact': { name: 'Inside pitch contact', type: 'skill', description: 'Contact point out front for inside pitch. Hands lead barrel to pull side.' },
  'Outside contact': { name: 'Outside contact', type: 'skill', description: 'Let outside pitch travel deeper. Contact point even with plate or slightly back.' },
  'Extension through ball': { name: 'Extension through ball', type: 'skill', description: 'Full arm extension through contact. Drive through ball, not around it.' },
  'Follow through work': { name: 'Follow through work', type: 'skill', description: 'Complete follow-through over front shoulder. Ensures full acceleration through zone.' },
  'Finish position': { name: 'Finish position', type: 'skill', description: 'Balanced finish position facing pitcher. Weight transferred, bat wrapped around.' },
  'High pitch adjustment': { name: 'High pitch adjustment', type: 'skill', description: 'Tee at top of zone. Stay on top of ball, shorter swing path.' },
  'Low pitch adjustment': { name: 'Low pitch adjustment', type: 'skill', description: 'Tee at bottom of zone. Get on plane early, drive through ball.' },
  'In-zone coverage': { name: 'In-zone coverage', type: 'skill', description: 'Random tee locations within strike zone. Adjust approach for each location.' },
  'Random pitch locations': { name: 'Random pitch locations', type: 'skill', description: 'Front toss to random locations. Quick recognition and adjustment required.' },
  'Video analysis': { name: 'Video analysis', type: 'skill', description: 'Detailed video review of bat path. Check for casting, dipping, or swing flaws.' },
  // Week 5 - Power Development
  'Overload/underload protocol': { name: 'Overload/underload protocol', type: 'skill', description: 'Alternate heavy bat (3-5 swings), game bat (3-5), light bat (3-5). Builds power and speed.' },
  'Speed chains': { name: 'Speed chains', type: 'skill', description: 'Consecutive max-intent swings focusing purely on bat speed. Quality over quantity.' },
  'Intent swings': { name: 'Intent swings', type: 'skill', description: 'Every swing at 100% intent. No casual swings - compete with yourself.' },
  'Exit velo baseline': { name: 'Exit velo baseline', type: 'skill', description: 'Measure current exit velocity for baseline. Track progress throughout training.' },
  'Launch angle work': { name: 'Launch angle work', type: 'skill', description: 'Adjust swing to optimize launch angle (10-25° typically optimal for line drives).' },
  'Med ball rotations': { name: 'Med ball rotations', type: 'skill', description: 'Rotational med ball throws against wall. Builds explosive rotational power.' },
  'Power position holds': { name: 'Power position holds', type: 'skill', description: 'Hold loaded position for 3-5 seconds, then fire. Builds strength at key positions.' },
  'Explosive movements': { name: 'Explosive movements', type: 'skill', description: 'Box jumps, broad jumps, rotational jumps. Develop total body explosiveness.' },
  'Situational power': { name: 'Situational power', type: 'skill', description: 'Practice driving ball with runner on third. Sacrifice fly situations.' },
  'Driving the ball': { name: 'Driving the ball', type: 'skill', description: 'Focus on hard line drives and elevated drives. No weak ground balls.' },
  'Hard contact focus': { name: 'Hard contact focus', type: 'skill', description: 'Every swing aims for barrel contact. Quality of contact over quantity.' },
  'Max effort session': { name: 'Max effort session', type: 'skill', description: '15-20 swings at absolute maximum intent. Full recovery between swings.' },
  'Record metrics': { name: 'Record metrics', type: 'skill', description: 'Measure and record exit velo, launch angle, and other available metrics.' },
  // Week 6 - Game Integration
  'Count-based approach': { name: 'Count-based approach', type: 'skill', description: 'Different mental approach for different counts. Aggressive 2-0, patient 0-2, etc.' },
  'Pitch selection': { name: 'Pitch selection', type: 'skill', description: 'Practice identifying and hunting specific pitch types in certain counts.' },
  'Zone discipline': { name: 'Zone discipline', type: 'skill', description: 'Only swing at strikes. Recognize balls early and take them.' },
  'Runner on 3rd drill': { name: 'Runner on 3rd drill', type: 'skill', description: 'Practice productive at-bats with runner on 3rd, less than 2 outs.' },
  'Two-strike approach': { name: 'Two-strike approach', type: 'skill', description: 'Choke up, shorten swing, expand zone slightly. Battle and put ball in play.' },
  'High velocity machine': { name: 'High velocity machine', type: 'skill', description: 'Face fastest available pitching. Builds quick-twitch timing and decision speed.' },
  'Reaction time': { name: 'Reaction time', type: 'skill', description: 'Quick-response drills - see ball, react immediately. No thought, just reaction.' },
  'Quick decisions': { name: 'Quick decisions', type: 'skill', description: 'Swing/no-swing decisions in split second. Trust your training and eyes.' },
  'Simulated game ABs': { name: 'Simulated game ABs', type: 'skill', description: 'Full at-bat sequences with counts. Treat every pitch like game situation.' },
  'Pressure situations': { name: 'Pressure situations', type: 'skill', description: 'Create pressure - consequences for poor ABs, rewards for productive ones.' },
  'Compete mode': { name: 'Compete mode', type: 'skill', description: 'Full competition mindset. You vs. pitcher, every pitch matters.' },
  'Complete video review': { name: 'Complete video review', type: 'skill', description: 'Full review of all recorded sessions. Document improvements and remaining work.' },
  'Next phase planning': { name: 'Next phase planning', type: 'skill', description: 'Plan next 6-week cycle based on progress and identified areas to improve.' },
};

// Helper to convert exercise string/object to Exercise with description
const getExercise = (ex: string | Exercise): Exercise => {
  if (typeof ex === 'object') return ex;
  return SKILL_EXERCISES[ex] || { name: ex, type: 'skill' as const, description: '' };
};

const HITTING_WEEKS: WeekData[] = [
  {
    week: 1,
    title: 'Foundation',
    focus: 'Stance, grip, and balance fundamentals',
    days: [
      { day: 'day1', title: 'Day 1: Stance Setup', exercises: ['Athletic stance drill', 'Balance check', 'Grip pressure test'].map(getExercise) },
      { day: 'day2', title: 'Day 2: Strength A - Lower Body Power', exercises: [...STRENGTH_A, getExercise('Weight shift drill'), getExercise('Hip hinge practice')] },
      { day: 'day3', title: 'Day 3: Tee Work Basics', exercises: ['Center tee - 25 swings', 'Inside tee - 15 swings', 'Outside tee - 15 swings'].map(getExercise) },
      { day: 'day4', title: 'Day 4: Soft Toss', exercises: ['Front toss - 30 reps', 'Side toss - 20 reps', 'Focus on contact point'].map(getExercise) },
      { day: 'day5', title: 'Day 5: Strength B - Upper Body', exercises: [...STRENGTH_B, getExercise('Full swing session'), getExercise('Record for analysis')] },
    ],
  },
  {
    week: 2,
    title: 'Load & Timing',
    focus: 'Weight transfer and timing mechanisms',
    days: [
      { day: 'day1', title: 'Day 1: Load Sequence', exercises: ['Negative move drill', 'Stride timing', 'Weight back drill'].map(getExercise) },
      { day: 'day2', title: 'Day 2: Strength C - Rotational Power', exercises: [...STRENGTH_C, getExercise('Early load drill'), getExercise('Rhythm work')] },
      { day: 'day3', title: 'Day 3: Separation', exercises: ['Hip-shoulder separation', 'Rubber band drill', 'Torque creation'].map(getExercise) },
      { day: 'day4', title: 'Day 4: Live Timing', exercises: ['Front toss timing', 'Machine work', 'Variable speeds'].map(getExercise) },
      { day: 'day5', title: 'Day 5: Strength A - Lower Body Power', exercises: [...STRENGTH_A, getExercise('Full sequence reps'), getExercise('Video review')] },
    ],
  },
  {
    week: 3,
    title: 'Hip Rotation',
    focus: 'Hip fire and separation drills',
    days: [
      { day: 'day1', title: 'Day 1: Hip Mechanics', exercises: ['Hip rotation isolation', 'Ground force drill', 'Core activation'].map(getExercise) },
      { day: 'day2', title: 'Day 2: Strength B - Upper Body', exercises: [...STRENGTH_B, getExercise('Quick hip fire'), getExercise('Resistance band work')] },
      { day: 'day3', title: 'Day 3: Connection', exercises: ['Hip-hand connection', 'Barrel lag drill', 'Sequence work'].map(getExercise) },
      { day: 'day4', title: 'Day 4: Power Application', exercises: ['Weighted bat swings', 'Underload swings', 'Feel the difference'].map(getExercise) },
      { day: 'day5', title: 'Day 5: Strength C - Rotational Power', exercises: [...STRENGTH_C, getExercise('Live reps'), getExercise('Situational hitting')] },
    ],
  },
  {
    week: 4,
    title: 'Bat Path',
    focus: 'Swing plane and contact point optimization',
    days: [
      { day: 'day1', title: 'Day 1: Plane Work', exercises: ['Bat path visualization', 'Swing plane drill', 'Level through zone'].map(getExercise) },
      { day: 'day2', title: 'Day 2: Strength A - Lower Body Power', exercises: [...STRENGTH_A, getExercise('Inside pitch contact'), getExercise('Outside contact')] },
      { day: 'day3', title: 'Day 3: Extension', exercises: ['Extension through ball', 'Follow through work', 'Finish position'].map(getExercise) },
      { day: 'day4', title: 'Day 4: Adjustability', exercises: ['High pitch adjustment', 'Low pitch adjustment', 'In-zone coverage'].map(getExercise) },
      { day: 'day5', title: 'Day 5: Strength B - Upper Body', exercises: [...STRENGTH_B, getExercise('Random pitch locations'), getExercise('Video analysis')] },
    ],
  },
  {
    week: 5,
    title: 'Power Development',
    focus: 'Bat speed and exit velocity optimization',
    days: [
      { day: 'day1', title: 'Day 1: Bat Speed Drills', exercises: ['Overload/underload protocol', 'Speed chains', 'Intent swings'].map(getExercise) },
      { day: 'day2', title: 'Day 2: Strength C - Rotational Power', exercises: [...STRENGTH_C, getExercise('Exit velo baseline'), getExercise('Launch angle work')] },
      { day: 'day3', title: 'Day 3: Strength Transfer', exercises: ['Med ball rotations', 'Power position holds', 'Explosive movements'].map(getExercise) },
      { day: 'day4', title: 'Day 4: Game Power', exercises: ['Situational power', 'Driving the ball', 'Hard contact focus'].map(getExercise) },
      { day: 'day5', title: 'Day 5: Strength A - Lower Body Power', exercises: [...STRENGTH_A, getExercise('Max effort session'), getExercise('Record metrics')] },
    ],
  },
  {
    week: 6,
    title: 'Game Integration',
    focus: 'Live at-bats and situational application',
    days: [
      { day: 'day1', title: 'Day 1: Approach Work', exercises: ['Count-based approach', 'Pitch selection', 'Zone discipline'].map(getExercise) },
      { day: 'day2', title: 'Day 2: Strength B - Upper Body', exercises: [...STRENGTH_B, getExercise('Runner on 3rd drill'), getExercise('Two-strike approach')] },
      { day: 'day3', title: 'Day 3: Velocity Training', exercises: ['High velocity machine', 'Reaction time', 'Quick decisions'].map(getExercise) },
      { day: 'day4', title: 'Day 4: Live At-Bats', exercises: ['Simulated game ABs', 'Pressure situations', 'Compete mode'].map(getExercise) },
      { day: 'day5', title: 'Day 5: Strength C - Rotational Power', exercises: [...STRENGTH_C, getExercise('Complete video review'), getExercise('Next phase planning')] },
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
