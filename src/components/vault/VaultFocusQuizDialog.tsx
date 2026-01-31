import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getBodyAreaLabel } from './quiz/body-maps/bodyAreaDefinitions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Brain, Heart, Zap, Moon, Sun, Dumbbell, Sparkles, ChevronDown, Smartphone, Flame, Target, Sword, Smile, AlertTriangle, Clock, BedDouble, Scale, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateSleepDuration, getSleepAnalysis, formatSleepDuration } from '@/utils/sleepUtils';

// Import new quiz sub-components
import { TenPointScale } from './quiz/TenPointScale';
import { QuickReactionTest } from './quiz/QuickReactionTest';
import { BalanceTest } from './quiz/BalanceTest';
import { BodyAreaSelector } from './quiz/BodyAreaSelector';
import { TrainingIntentSelector } from './quiz/TrainingIntentSelector';
import { MentalEnergyRating } from './quiz/MentalEnergyRating';
import { WeightTrendMini } from './quiz/WeightTrendMini';

interface VaultFocusQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizType: 'pre_lift' | 'night' | 'morning';
  onSubmit: (data: {
    mental_readiness: number;
    emotional_state: number;
    physical_readiness: number;
    reflection_did_well?: string;
    reflection_improve?: string;
    reflection_learned?: string;
    reflection_motivation?: string;
    hours_slept?: number;
    sleep_quality?: number;
    daily_motivation?: string;
    daily_intentions?: string;
    discipline_level?: number;
    mood_level?: number;
    stress_level?: number;
    bedtime_actual?: string;
    wake_time_actual?: string;
    bedtime_goal?: string;
    wake_time_goal?: string;
    // New morning check-in fields
    weight_lbs?: number;
    perceived_recovery?: number;
    // New pre-workout CNS fields
    reaction_time_ms?: number;
    reaction_time_score?: number;
    balance_left_seconds?: number;
    balance_right_seconds?: number;
    // New pre-workout pain fields
    pain_location?: string[];
    pain_scale?: number;
    pain_increases_with_movement?: boolean;
    // New pre-workout intent fields
    training_intent?: string[];
    mental_energy?: number;
  }) => Promise<{ success: boolean; error?: string }>;
}

// Reusable Rating Button Group Component
interface RatingButtonGroupProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  icon: React.ReactNode;
  getLevelLabel: (value: number) => string;
}

function RatingButtonGroup({ value, onChange, label, icon, getLevelLabel }: RatingButtonGroupProps) {
  const getButtonStyles = (num: number, isSelected: boolean) => {
    const baseStyles = "flex-1 min-h-[48px] rounded-xl font-bold text-lg transition-all duration-200 border-2";
    
    const colorStyles = {
      1: isSelected 
        ? "bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/30" 
        : "bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30",
      2: isSelected 
        ? "bg-orange-500 text-white border-orange-600 shadow-lg shadow-orange-500/30" 
        : "bg-orange-500/20 text-orange-500 border-orange-500/30 hover:bg-orange-500/30",
      3: isSelected 
        ? "bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/30" 
        : "bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500/30",
      4: isSelected 
        ? "bg-lime-500 text-white border-lime-600 shadow-lg shadow-lime-500/30" 
        : "bg-lime-500/20 text-lime-600 border-lime-500/30 hover:bg-lime-500/30",
      5: isSelected 
        ? "bg-green-500 text-white border-green-600 shadow-lg shadow-green-500/30" 
        : "bg-green-500/20 text-green-600 border-green-500/30 hover:bg-green-500/30",
    };
    
    const scaleStyle = isSelected ? "scale-105" : "scale-100 opacity-70";
    
    return cn(baseStyles, colorStyles[num as keyof typeof colorStyles], scaleStyle);
  };

  const handleClick = (num: number) => {
    if (navigator.vibrate) navigator.vibrate(10);
    onChange(num);
  };

  const getLevelColor = (val: number) => {
    if (val <= 2) return 'text-red-500';
    if (val === 3) return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-4 p-4 bg-card/50 rounded-2xl border border-border/50">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-semibold">
          {icon}
          {label}
        </Label>
        <span className={cn("text-sm font-bold px-3 py-1 rounded-full bg-background", getLevelColor(value))}>
          {getLevelLabel(value)}
        </span>
      </div>
      
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleClick(num)}
            className={getButtonStyles(num, value === num)}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}

// Discipline Rating Component - Elite 0.01% Approach
interface DisciplineRatingProps {
  value: number;
  onChange: (value: number) => void;
  t: (key: string) => string;
}

function DisciplineRating({ value, onChange, t }: DisciplineRatingProps) {
  const levels = [
    { level: 1, color: 'red', gradient: 'from-red-500 to-red-600' },
    { level: 2, color: 'orange', gradient: 'from-orange-500 to-orange-600' },
    { level: 3, color: 'amber', gradient: 'from-amber-500 to-amber-600' },
    { level: 4, color: 'lime', gradient: 'from-lime-500 to-lime-600' },
    { level: 5, color: 'emerald', gradient: 'from-emerald-500 to-emerald-600' },
  ];

  const getDisciplineLabel = (level: number) => {
    return t(`vault.quiz.morning.disciplineLevel${level}`);
  };

  const getDisciplineDesc = (level: number) => {
    return t(`vault.quiz.morning.disciplineDesc${level}`);
  };

  const handleClick = (level: number) => {
    if (navigator.vibrate) navigator.vibrate(level === 5 ? [20, 50, 20] : 10);
    onChange(level);
  };

  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-2xl border border-amber-500/30">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-500/20">
          <Sword className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <Label className="text-base font-bold text-foreground">
            {t('vault.quiz.morning.disciplineTitle')}
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('vault.quiz.morning.disciplinePrompt')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {levels.map(({ level, gradient }) => {
          const isSelected = value === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => handleClick(level)}
              className={cn(
                "relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border-2",
                isSelected 
                  ? `bg-gradient-to-br ${gradient} text-white border-transparent shadow-lg scale-105` 
                  : "bg-background/50 text-muted-foreground border-border/50 hover:border-border opacity-60 hover:opacity-80"
              )}
            >
              <span className="text-xl font-black">{level}</span>
              {isSelected && level === 5 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {value > 0 && (
        <div className={cn(
          "text-center p-3 rounded-xl transition-all duration-300",
          value === 5 ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-background/50"
        )}>
          <p className={cn(
            "font-bold text-sm",
            value <= 2 ? "text-red-500" : value === 3 ? "text-amber-500" : value === 4 ? "text-lime-500" : "text-emerald-500"
          )}>
            {getDisciplineLabel(value)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {getDisciplineDesc(value)}
          </p>
        </div>
      )}
    </div>
  );
}

export function VaultFocusQuizDialog({
  open,
  onOpenChange,
  quizType,
  onSubmit,
}: VaultFocusQuizDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  const [mentalReadiness, setMentalReadiness] = useState(3);
  const [emotionalState, setEmotionalState] = useState(3);
  const [physicalReadiness, setPhysicalReadiness] = useState(3);
  
  // Night quiz reflections
  const [didWell, setDidWell] = useState('');
  const [couldImprove, setCouldImprove] = useState('');
  const [learned, setLearned] = useState('');
  const [motivation, setMotivation] = useState('');
  
  // Night quiz mood and stress
  const [nightMoodLevel, setNightMoodLevel] = useState(3);
  const [nightStressLevel, setNightStressLevel] = useState(3);
  
  // Morning quiz sleep tracking - now with bedtime/wake time
  const [bedtimeActual, setBedtimeActual] = useState('');
  const [wakeTimeActual, setWakeTimeActual] = useState('');
  const [sleepQuality, setSleepQuality] = useState(3);

  // Night quiz sleep goals
  const [bedtimeGoal, setBedtimeGoal] = useState('');
  const [wakeTimeGoal, setWakeTimeGoal] = useState('');

  // Elite morning check-in fields
  const [dailyMotivation, setDailyMotivation] = useState('');
  const [dailyIntentions, setDailyIntentions] = useState('');
  const [disciplineLevel, setDisciplineLevel] = useState(3);
  const [moodLevel, setMoodLevel] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);

  // NEW: Morning check-in additions
  const [weightLbs, setWeightLbs] = useState<string>('');
  const [perceivedRecovery, setPerceivedRecovery] = useState(5);

  // NEW: Pre-workout weight check-in
  const [preLiftWeightLbs, setPreLiftWeightLbs] = useState<string>('');

  // NEW: Night weight check-in
  const [nightWeightLbs, setNightWeightLbs] = useState<string>('');

  // NEW: Pre-workout CNS section
  const [reactionTimeMs, setReactionTimeMs] = useState<number | null>(null);
  const [reactionTimeScore, setReactionTimeScore] = useState<number | null>(null);
  const [balanceLeftSeconds, setBalanceLeftSeconds] = useState<number | null>(null);
  const [balanceRightSeconds, setBalanceRightSeconds] = useState<number | null>(null);

  // NEW: Pre-workout Pain section - now with per-area pain scales
  const [painLocations, setPainLocations] = useState<string[]>([]);
  const [painScales, setPainScales] = useState<Record<string, number>>({});
  const [painIncreasesWithMovement, setPainIncreasesWithMovement] = useState<boolean | null>(null);

  // Handler to update pain scale for a specific area
  const handlePainScaleChange = (areaId: string, value: number) => {
    setPainScales(prev => ({
      ...prev,
      [areaId]: value
    }));
  };

  // Handler for pain location changes - cleans up scales for deselected areas
  const handlePainLocationsChange = (areas: string[]) => {
    setPainLocations(areas);
    // Remove scales for deselected areas, keep scales for still-selected areas
    setPainScales(prev => {
      const newScales: Record<string, number> = {};
      areas.forEach(area => {
        if (prev[area] !== undefined) {
          newScales[area] = prev[area];
        }
      });
      return newScales;
    });
  };

  // NEW: Pre-workout Intent & Focus section
  const [trainingIntents, setTrainingIntents] = useState<string[]>([]);
  const [mentalEnergy, setMentalEnergy] = useState(3);

  // Calculate sleep duration and analysis for morning quiz
  const calculatedSleep = useMemo(() => {
    if (bedtimeActual && wakeTimeActual) {
      return calculateSleepDuration(bedtimeActual, wakeTimeActual);
    }
    return null;
  }, [bedtimeActual, wakeTimeActual]);

  const sleepAnalysis = useMemo(() => {
    if (calculatedSleep !== null) {
      return getSleepAnalysis(calculatedSleep);
    }
    return null;
  }, [calculatedSleep]);

  // Calculate goal sleep duration for night quiz
  const goalSleepDuration = useMemo(() => {
    if (bedtimeGoal && wakeTimeGoal) {
      return calculateSleepDuration(bedtimeGoal, wakeTimeGoal);
    }
    return null;
  }, [bedtimeGoal, wakeTimeGoal]);

  const getQuizIcon = () => {
    switch (quizType) {
      case 'pre_lift': return <Dumbbell className="h-6 w-6 text-orange-500" />;
      case 'night': return <Moon className="h-6 w-6 text-indigo-500" />;
      case 'morning': return <Sun className="h-6 w-6 text-amber-500" />;
    }
  };

  const getQuizTitle = () => {
    switch (quizType) {
      case 'pre_lift': return t('vault.quiz.preLiftTitle');
      case 'night': return t('vault.quiz.nightTitle');
      case 'morning': return t('vault.quiz.morningTitle');
    }
  };

  const getLevelLabel = (value: number) => {
    const labels = [
      t('vault.quiz.level1'),
      t('vault.quiz.level2'),
      t('vault.quiz.level3'),
      t('vault.quiz.level4'),
      t('vault.quiz.level5'),
    ];
    return labels[value - 1] || '';
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    const data: any = {
      mental_readiness: mentalReadiness,
      emotional_state: emotionalState,
      physical_readiness: physicalReadiness,
    };

    if (quizType === 'night') {
      data.reflection_did_well = didWell || undefined;
      data.reflection_improve = couldImprove || undefined;
      data.reflection_learned = learned || undefined;
      data.reflection_motivation = motivation || undefined;
      data.mood_level = nightMoodLevel;
      data.stress_level = nightStressLevel;
    }

    if (quizType === 'morning') {
      data.hours_slept = calculatedSleep || undefined;
      data.sleep_quality = sleepQuality;
      data.bedtime_actual = bedtimeActual || undefined;
      data.wake_time_actual = wakeTimeActual || undefined;
      // Elite morning check-in fields
      data.daily_motivation = dailyMotivation || undefined;
      data.daily_intentions = dailyIntentions || undefined;
      data.discipline_level = disciplineLevel;
      data.mood_level = moodLevel;
      data.stress_level = stressLevel;
      // NEW: Morning additions
      data.weight_lbs = weightLbs ? parseFloat(weightLbs) : undefined;
      data.perceived_recovery = perceivedRecovery;
    }

    if (quizType === 'pre_lift') {
      // NEW: Pre-workout weight
      data.weight_lbs = preLiftWeightLbs ? parseFloat(preLiftWeightLbs) : undefined;
      // NEW: CNS section
      data.reaction_time_ms = reactionTimeMs || undefined;
      data.reaction_time_score = reactionTimeScore || undefined;
      data.balance_left_seconds = balanceLeftSeconds || undefined;
      data.balance_right_seconds = balanceRightSeconds || undefined;
      // NEW: Pain section - per-area pain scales
      data.pain_location = painLocations.length > 0 ? painLocations : undefined;
      data.pain_scales = Object.keys(painScales).length > 0 ? painScales : undefined;
      // Keep legacy pain_scale as max value for backward compatibility
      data.pain_scale = Object.values(painScales).length > 0 
        ? Math.max(...Object.values(painScales)) 
        : undefined;
      data.pain_increases_with_movement = painLocations.length > 0 ? painIncreasesWithMovement : undefined;
      // NEW: Intent & Focus section
      data.training_intent = trainingIntents.length > 0 ? trainingIntents : undefined;
      data.mental_energy = mentalEnergy;
    }

    if (quizType === 'night') {
      // NEW: Night weight
      data.weight_lbs = nightWeightLbs ? parseFloat(nightWeightLbs) : undefined;
    }

    if (quizType === 'night') {
      data.bedtime_goal = bedtimeGoal || undefined;
      data.wake_time_goal = wakeTimeGoal || undefined;
    }

    const result = await onSubmit(data);
    setLoading(false);
    
    if (result.success) {
      // Reset form
      setMentalReadiness(3);
      setEmotionalState(3);
      setPhysicalReadiness(3);
      setDidWell('');
      setCouldImprove('');
      setLearned('');
      setMotivation('');
      setNightMoodLevel(3);
      setNightStressLevel(3);
      setBedtimeActual('');
      setWakeTimeActual('');
      setSleepQuality(3);
      setBedtimeGoal('');
      setWakeTimeGoal('');
      setDailyMotivation('');
      setDailyIntentions('');
      setDisciplineLevel(3);
      setMoodLevel(3);
      setStressLevel(3);
      // NEW: Reset new fields
      setWeightLbs('');
      setPerceivedRecovery(5);
      setPreLiftWeightLbs('');
      setNightWeightLbs('');
      setReactionTimeMs(null);
      setReactionTimeScore(null);
      setBalanceLeftSeconds(null);
      setBalanceRightSeconds(null);
      setPainLocations([]);
      setPainScales({});
      setPainIncreasesWithMovement(null);
      setTrainingIntents([]);
      setMentalEnergy(3);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-lg p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader className="space-y-3 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              {getQuizIcon()}
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold">{getQuizTitle()}</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {quizType === 'morning' 
                  ? t('vault.quiz.morning.subtitle')
                  : t('vault.quiz.description')
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tips Section - NOW AT TOP */}
        <div className="space-y-3 mt-4">
          {/* Morning Quiz Tip */}
          {quizType === 'morning' && (
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <Sun className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                {t('vault.quiz.morningTip')}
              </AlertDescription>
            </Alert>
          )}

          {/* Morning Quiz - Sleep Tracking Section */}
          {quizType === 'morning' && (
            <div className="space-y-4 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Moon className="h-4 w-4 text-indigo-500" />
                {t('vault.quiz.sleepData')}
              </h4>
              
              {/* Bedtime Input */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-indigo-400" />
                  {t('vault.quiz.bedtimeActual')}
                </Label>
                <Input
                  type="time"
                  value={bedtimeActual}
                  onChange={(e) => setBedtimeActual(e.target.value)}
                  className="max-w-[160px]"
                />
              </div>

              {/* Wake Time Input */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-400" />
                  {t('vault.quiz.wakeTimeActual')}
                </Label>
                <Input
                  type="time"
                  value={wakeTimeActual}
                  onChange={(e) => setWakeTimeActual(e.target.value)}
                  className="max-w-[160px]"
                />
              </div>

              {/* Sleep Duration & Analysis */}
              {calculatedSleep !== null && sleepAnalysis && (
                <div className={cn(
                  "p-4 rounded-xl border transition-all duration-300",
                  sleepAnalysis.bgColor,
                  sleepAnalysis.borderColor
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      💤 {t('vault.quiz.sleepDuration', { hours: formatSleepDuration(calculatedSleep) })}
                    </span>
                    <span className={cn("text-sm font-bold", sleepAnalysis.color)}>
                      {sleepAnalysis.emoji} {t(`vault.quiz.sleepAnalysis.${sleepAnalysis.level}.title`)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(`vault.quiz.sleepAnalysis.${sleepAnalysis.level}.message`)}
                  </p>
                </div>
              )}
              
              {/* Sleep Quality Rating */}
              <RatingButtonGroup
                value={sleepQuality}
                onChange={setSleepQuality}
                label={t('vault.quiz.sleepQuality')}
                icon={<Moon className="h-5 w-5 text-indigo-500" />}
                getLevelLabel={getLevelLabel}
              />
            </div>
          )}

          {/* NEW: Morning Quiz - Weight & Recovery Section */}
          {quizType === 'morning' && (
            <div className="space-y-4 p-4 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-xl border border-teal-500/20">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Scale className="h-4 w-4 text-teal-500" />
                {t('vault.quiz.morning.bodyStatus', 'Body Status')}
              </h4>

              {/* Weight Trend Display */}
              <WeightTrendMini />
              
              {/* Weight Input */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-400" />
                  {t('vault.quiz.morning.weightLabel', 'Weight Check-in (lbs)')}
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                  placeholder={t('vault.quiz.morning.weightPlaceholder', 'e.g. 175.5')}
                  className="max-w-[160px]"
                />
                <p className="text-xs text-muted-foreground">
                  {t('vault.quiz.morning.weightHint', 'Track daily for trends')}
                </p>
              </div>

              {/* Perceived Recovery 1-10 */}
              <TenPointScale
                value={perceivedRecovery}
                onChange={setPerceivedRecovery}
                label={t('vault.quiz.morning.recoveryLabel', 'Perceived Recovery')}
                icon={<Heart className="h-5 w-5 text-teal-500" />}
                getLevelLabel={(val) => {
                  if (val <= 2) return t('vault.quiz.morning.recoveryLevel1', 'Very Poor');
                  if (val <= 4) return t('vault.quiz.morning.recoveryLevel2', 'Below Average');
                  if (val <= 6) return t('vault.quiz.morning.recoveryLevel3', 'Moderate');
                  if (val <= 8) return t('vault.quiz.morning.recoveryLevel4', 'Good');
                  return t('vault.quiz.morning.recoveryLevel5', 'Excellent');
                }}
                inverted={false}
              />
            </div>
          )}

          {/* Morning Quiz - Elite Check-in Section */}
          {quizType === 'morning' && (
            <div className="space-y-4 pt-2">
              {/* Daily Motivation */}
              <div className="space-y-3 p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <Label className="text-base font-bold">{t('vault.quiz.morning.motivationTitle')}</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('vault.quiz.morning.motivationPrompt')}
                </p>
                <Textarea
                  value={dailyMotivation}
                  onChange={(e) => setDailyMotivation(e.target.value)}
                  placeholder={t('vault.quiz.morning.motivationPlaceholder')}
                  className="min-h-[80px] resize-none bg-background/50"
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {dailyMotivation.length}/500
                </div>
              </div>

              {/* Mental Wellness Check (renamed from Daily Intentions) */}
              <div className="space-y-3 p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-emerald-500" />
                  <Label className="text-base font-bold">{t('vault.quiz.morning.wellnessTitle')}</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('vault.quiz.morning.wellnessPrompt')}
                </p>
                <Textarea
                  value={dailyIntentions}
                  onChange={(e) => setDailyIntentions(e.target.value)}
                  placeholder={t('vault.quiz.morning.wellnessPlaceholder')}
                  className="min-h-[100px] resize-none bg-background/50"
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {dailyIntentions.length}/500
                </div>
              </div>

              {/* Mood Rating */}
              <div className="space-y-4 p-4 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-xl border border-yellow-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-yellow-500/20">
                    <Smile className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <Label className="text-base font-bold text-foreground">
                      {t('vault.quiz.morning.moodTitle')}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('vault.quiz.morning.moodPrompt')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const isSelected = moodLevel === level;
                    const emojis = ['😔', '😕', '😐', '🙂', '😄'];
                    const colors = [
                      'from-red-500 to-red-600',
                      'from-orange-500 to-orange-600',
                      'from-amber-500 to-amber-600',
                      'from-lime-500 to-lime-600',
                      'from-green-500 to-green-600',
                    ];
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate(10);
                          setMoodLevel(level);
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border-2",
                          isSelected 
                            ? `bg-gradient-to-br ${colors[level - 1]} text-white border-transparent shadow-lg scale-105` 
                            : "bg-background/50 text-muted-foreground border-border/50 hover:border-border opacity-60 hover:opacity-80"
                        )}
                      >
                        <span className="text-xl">{emojis[level - 1]}</span>
                        <span className="text-xs font-bold mt-1">{level}</span>
                      </button>
                    );
                  })}
                </div>

                {moodLevel > 0 && (
                  <div className="text-center p-2 rounded-lg bg-background/50">
                    <p className={cn(
                      "font-bold text-sm",
                      moodLevel <= 2 ? "text-red-500" : moodLevel === 3 ? "text-amber-500" : "text-green-500"
                    )}>
                      {t(`vault.quiz.morning.moodLevel${moodLevel}`)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t(`vault.quiz.morning.moodDesc${moodLevel}`)}
                    </p>
                  </div>
                )}
              </div>

              {/* Stress Rating */}
              <div className="space-y-4 p-4 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-xl border border-purple-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/20">
                    <AlertTriangle className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <Label className="text-base font-bold text-foreground">
                      {t('vault.quiz.morning.stressTitle')}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('vault.quiz.morning.stressPrompt')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const isSelected = stressLevel === level;
                    // Stress colors are inverted (green is low stress = good)
                    const colors = [
                      'from-green-500 to-green-600',
                      'from-lime-500 to-lime-600',
                      'from-amber-500 to-amber-600',
                      'from-orange-500 to-orange-600',
                      'from-red-500 to-red-600',
                    ];
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate(10);
                          setStressLevel(level);
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border-2",
                          isSelected 
                            ? `bg-gradient-to-br ${colors[level - 1]} text-white border-transparent shadow-lg scale-105` 
                            : "bg-background/50 text-muted-foreground border-border/50 hover:border-border opacity-60 hover:opacity-80"
                        )}
                      >
                        <span className="text-xl font-black">{level}</span>
                      </button>
                    );
                  })}
                </div>

                {stressLevel > 0 && (
                  <div className="text-center p-2 rounded-lg bg-background/50">
                    <p className={cn(
                      "font-bold text-sm",
                      stressLevel <= 2 ? "text-green-500" : stressLevel === 3 ? "text-amber-500" : "text-red-500"
                    )}>
                      {t(`vault.quiz.morning.stressLevel${stressLevel}`)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t(`vault.quiz.morning.stressDesc${stressLevel}`)}
                    </p>
                  </div>
                )}
              </div>

              {/* Draw to Discipline */}
              <DisciplineRating
                value={disciplineLevel}
                onChange={setDisciplineLevel}
                t={t}
              />
            </div>
          )}

          {/* Pre-Lift Quiz Tip */}
          {quizType === 'pre_lift' && (
            <Alert className="bg-orange-500/10 border-orange-500/30">
              <Dumbbell className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-sm">
                {t('vault.quiz.preLiftTip')}
              </AlertDescription>
            </Alert>
          )}

          {/* NEW: Pre-Lift Section 1 - Body Status */}
          {quizType === 'pre_lift' && (
            <div className="space-y-4 p-4 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-xl border border-teal-500/20">
              <div className="flex items-center gap-2">
                <div className="px-2 py-1 rounded-md bg-teal-500/20 text-teal-500 text-xs font-bold">
                  {t('vault.quiz.bodyStatus.section', 'Section 1')}
                </div>
                <h4 className="text-sm font-bold">{t('vault.quiz.bodyStatus.title', 'Body Status')}</h4>
              </div>

              {/* Weight Trend Display */}
              <WeightTrendMini />

              {/* Weight Input */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Scale className="h-4 w-4 text-teal-400" />
                  {t('vault.quiz.bodyStatus.weightLabel', 'Pre-Workout Weight (lbs)')}
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={preLiftWeightLbs}
                  onChange={(e) => setPreLiftWeightLbs(e.target.value)}
                  placeholder={t('vault.quiz.bodyStatus.weightPlaceholder', 'e.g. 175.5')}
                  className="max-w-[160px]"
                />
                <p className="text-xs text-muted-foreground">
                  {t('vault.quiz.bodyStatus.preLiftTip', 'Tracking before training helps identify hydration needs')}
                </p>
              </div>
            </div>
          )}

          {/* NEW: Pre-Lift Section 2 - CNS Readiness */}
          {quizType === 'pre_lift' && (
            <div className="space-y-4 p-4 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-xl border border-cyan-500/20">
              <div className="flex items-center gap-2">
                <div className="px-2 py-1 rounded-md bg-cyan-500/20 text-cyan-500 text-xs font-bold">
                  {t('vault.quiz.cns.section', 'Section 2')}
                </div>
                <h4 className="text-sm font-bold">{t('vault.quiz.cns.title', 'CNS Readiness')}</h4>
              </div>

              {/* Reaction Time Test */}
              <QuickReactionTest
                onComplete={(avgTime, score) => {
                  setReactionTimeMs(avgTime);
                  setReactionTimeScore(score);
                }}
                disabled={false}
              />

              {/* Balance Test - Dual Leg, Eyes Closed */}
              <BalanceTest
                onComplete={(leftSeconds, rightSeconds) => {
                  setBalanceLeftSeconds(leftSeconds);
                  setBalanceRightSeconds(rightSeconds);
                }}
                disabled={false}
              />
            </div>
          )}

          {/* NEW: Pre-Lift Section 3 - Pain or Limitation Check */}
          {quizType === 'pre_lift' && (
            <div className="space-y-4 p-4 bg-gradient-to-br from-red-500/5 to-orange-500/5 rounded-xl border border-red-500/20">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="px-2 py-1 rounded-md bg-red-500/20 text-red-500 text-xs font-bold">
                    {t('vault.quiz.pain.section', 'Section 3')}
                  </div>
                  <h4 className="text-sm font-bold">{t('vault.quiz.pain.title', 'Pain or Limitation Check')}</h4>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  {t('vault.quiz.pain.subtitle', 'High Performers avoid accumulating micro-injury')}
                </p>
              </div>

              {/* Body Area Selector */}
              <BodyAreaSelector
                selectedAreas={painLocations}
                onChange={handlePainLocationsChange}
              />

              {/* Individual Pain Scales - one per selected area */}
              {painLocations.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    {t('vault.quiz.pain.perAreaTitle', 'Rate Pain by Area')}
                  </Label>
                  {painLocations.map((areaId) => (
                    <TenPointScale
                      key={areaId}
                      value={painScales[areaId] || 0}
                      onChange={(value) => handlePainScaleChange(areaId, value)}
                      label={getBodyAreaLabel(areaId)}
                      icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
                      getLevelLabel={(val) => {
                        if (val <= 2) return t('vault.quiz.pain.level1', 'Minimal');
                        if (val <= 4) return t('vault.quiz.pain.level2', 'Mild');
                        if (val <= 6) return t('vault.quiz.pain.level3', 'Moderate');
                        if (val <= 8) return t('vault.quiz.pain.level4', 'Significant');
                        return t('vault.quiz.pain.level5', 'Severe');
                      }}
                      inverted={true}
                      compact={true}
                    />
                  ))}
                </div>
              )}

              {/* Pain increases with movement */}
              {painLocations.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('vault.quiz.pain.movementQuestion', 'Does pain increase with movement?')}
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={painIncreasesWithMovement === true ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(10);
                        setPainIncreasesWithMovement(true);
                      }}
                      className={cn(
                        painIncreasesWithMovement === true && "bg-amber-500 hover:bg-amber-600"
                      )}
                    >
                      {t('common.yes', 'Yes')}
                    </Button>
                    <Button
                      type="button"
                      variant={painIncreasesWithMovement === false ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(10);
                        setPainIncreasesWithMovement(false);
                      }}
                      className={cn(
                        painIncreasesWithMovement === false && "bg-green-500 hover:bg-green-600"
                      )}
                    >
                      {t('common.no', 'No')}
                    </Button>
                  </div>
                  {painIncreasesWithMovement === true && (
                    <p className="text-xs text-amber-500 font-medium">
                      ⚠️ {t('vault.quiz.pain.movementWarning', 'Monitor closely during training')}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground italic pt-1">
                {t('vault.quiz.pain.footer', 'Spot motion-limiting issues early!')}
              </p>
            </div>
          )}

          {/* NEW: Pre-Lift Section 4 - Intent & Focus */}
          {quizType === 'pre_lift' && (
            <div className="space-y-4 p-4 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 rounded-xl border border-purple-500/20">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="px-2 py-1 rounded-md bg-purple-500/20 text-purple-500 text-xs font-bold">
                    {t('vault.quiz.intent.section', 'Section 4')}
                  </div>
                  <h4 className="text-sm font-bold">{t('vault.quiz.intent.title', 'Intent & Focus')}</h4>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  {t('vault.quiz.intent.subtitle', 'Awareness of readiness sets context')}
                </p>
              </div>

              {/* Training Intent Selector */}
              <TrainingIntentSelector
                selectedIntents={trainingIntents}
                onChange={setTrainingIntents}
              />

              {/* Mental Energy - Separate rating */}
              <MentalEnergyRating
                value={mentalEnergy}
                onChange={setMentalEnergy}
              />
            </div>
          )}

          {/* Night Quiz - Body Status Section */}
          {quizType === 'night' && (
            <div className="space-y-4 p-4 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-xl border border-teal-500/20">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Scale className="h-4 w-4 text-teal-500" />
                {t('vault.quiz.night.bodyCheck', 'Evening Body Check')}
              </h4>

              {/* Weight Trend Display */}
              <WeightTrendMini />

              {/* Weight Input */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-400" />
                  {t('vault.quiz.night.weightLabel', 'Evening Weight (lbs)')}
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={nightWeightLbs}
                  onChange={(e) => setNightWeightLbs(e.target.value)}
                  placeholder={t('vault.quiz.night.weightPlaceholder', 'e.g. 177')}
                  className="max-w-[160px]"
                />
                <p className="text-xs text-muted-foreground">
                  {t('vault.quiz.night.weightTip', 'Evening weight is typically 2-4 lbs higher than morning')}
                </p>
              </div>
            </div>
          )}

          {/* Night Quiz Tips */}
          {quizType === 'night' && (
            <div className="space-y-3">
              {/* Sleep tip */}
              <Alert className="bg-indigo-500/10 border-indigo-500/30">
                <Moon className="h-4 w-4 text-indigo-500" />
                <AlertDescription className="text-sm">
                  {t('vault.quiz.sleepTip')}
                </AlertDescription>
              </Alert>

              {/* Morning reminder */}
              <Alert className="bg-amber-500/10 border-amber-500/30">
                <Sun className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-sm font-medium">
                  {t('vault.quiz.morningReminderFromNight')}
                </AlertDescription>
              </Alert>

              {/* Phone-free educational content */}
              <Collapsible className="bg-card/50 rounded-xl border border-border/50 p-3">
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    {t('vault.quiz.phoneFree.title')}
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span>🔵</span>
                      <span>{t('vault.quiz.phoneFree.blueLight')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>💤</span>
                      <span>{t('vault.quiz.phoneFree.melatonin')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>🧠</span>
                      <span>{t('vault.quiz.phoneFree.rem')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>💪</span>
                      <span>{t('vault.quiz.phoneFree.recovery')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>😌</span>
                      <span>{t('vault.quiz.phoneFree.cortisol')}</span>
                    </li>
                  </ul>
                </CollapsibleContent>
              </Collapsible>

              {/* Sleep Goals Section */}
              <div className="space-y-4 p-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/20">
                    <Target className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div>
                    <Label className="text-base font-bold text-foreground">
                      {t('vault.quiz.sleepGoals.title')}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('vault.quiz.sleepGoals.subtitle')}
                    </p>
                  </div>
                </div>

                {/* Bedtime Goal */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <BedDouble className="h-4 w-4 text-indigo-400" />
                    {t('vault.quiz.sleepGoals.bedtimeGoal')}
                  </Label>
                  <Input
                    type="time"
                    value={bedtimeGoal}
                    onChange={(e) => setBedtimeGoal(e.target.value)}
                    className="max-w-[160px]"
                  />
                </div>

                {/* Wake Time Goal */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    {t('vault.quiz.sleepGoals.wakeTimeGoal')}
                  </Label>
                  <Input
                    type="time"
                    value={wakeTimeGoal}
                    onChange={(e) => setWakeTimeGoal(e.target.value)}
                    className="max-w-[160px]"
                  />
                </div>

                {/* Goal Duration Display */}
                {goalSleepDuration !== null && (
                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <p className="text-sm font-medium text-indigo-400 flex items-center gap-2">
                      💡 {t('vault.quiz.sleepGoals.goalDuration', { hours: formatSleepDuration(goalSleepDuration) })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4">
          {/* Mental Readiness */}
          <RatingButtonGroup
            value={mentalReadiness}
            onChange={setMentalReadiness}
            label={t('vault.quiz.mentalReadiness')}
            icon={<Brain className="h-5 w-5 text-purple-500" />}
            getLevelLabel={getLevelLabel}
          />

          {/* Emotional State */}
          <RatingButtonGroup
            value={emotionalState}
            onChange={setEmotionalState}
            label={t('vault.quiz.emotionalState')}
            icon={<Heart className="h-5 w-5 text-pink-500" />}
            getLevelLabel={getLevelLabel}
          />

          {/* Physical Readiness */}
          <RatingButtonGroup
            value={physicalReadiness}
            onChange={setPhysicalReadiness}
            label={t('vault.quiz.physicalReadiness')}
            icon={<Zap className="h-5 w-5 text-yellow-500" />}
            getLevelLabel={getLevelLabel}
          />

          {/* Night Quiz Mood & Stress + Reflections */}
          {quizType === 'night' && (
            <div className="space-y-4 pt-6 mt-6 border-t border-border">
              {/* Night Mood Rating */}
              <div className="space-y-4 p-4 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-xl border border-yellow-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-yellow-500/20">
                    <Smile className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <Label className="text-base font-bold text-foreground">
                      {t('vault.quiz.nightReflection.moodTitle')}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('vault.quiz.nightReflection.moodPrompt')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const isSelected = nightMoodLevel === level;
                    const emojis = ['😔', '😕', '😐', '🙂', '😄'];
                    const colors = [
                      'from-red-500 to-red-600',
                      'from-orange-500 to-orange-600',
                      'from-amber-500 to-amber-600',
                      'from-lime-500 to-lime-600',
                      'from-green-500 to-green-600',
                    ];
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate(10);
                          setNightMoodLevel(level);
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border-2",
                          isSelected 
                            ? `bg-gradient-to-br ${colors[level - 1]} text-white border-transparent shadow-lg scale-105` 
                            : "bg-background/50 text-muted-foreground border-border/50 hover:border-border opacity-60 hover:opacity-80"
                        )}
                      >
                        <span className="text-xl">{emojis[level - 1]}</span>
                        <span className="text-xs font-bold mt-1">{level}</span>
                      </button>
                    );
                  })}
                </div>

                {nightMoodLevel > 0 && (
                  <div className="text-center p-2 rounded-lg bg-background/50">
                    <p className={cn(
                      "font-bold text-sm",
                      nightMoodLevel <= 2 ? "text-red-500" : nightMoodLevel === 3 ? "text-amber-500" : "text-green-500"
                    )}>
                      {t(`vault.quiz.nightReflection.moodLevel${nightMoodLevel}`)}
                    </p>
                  </div>
                )}
              </div>

              {/* Night Stress Rating */}
              <div className="space-y-4 p-4 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-xl border border-purple-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/20">
                    <AlertTriangle className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <Label className="text-base font-bold text-foreground">
                      {t('vault.quiz.nightReflection.stressTitle')}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('vault.quiz.nightReflection.stressPrompt')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const isSelected = nightStressLevel === level;
                    const colors = [
                      'from-green-500 to-green-600',
                      'from-lime-500 to-lime-600',
                      'from-amber-500 to-amber-600',
                      'from-orange-500 to-orange-600',
                      'from-red-500 to-red-600',
                    ];
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate(10);
                          setNightStressLevel(level);
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border-2",
                          isSelected 
                            ? `bg-gradient-to-br ${colors[level - 1]} text-white border-transparent shadow-lg scale-105` 
                            : "bg-background/50 text-muted-foreground border-border/50 hover:border-border opacity-60 hover:opacity-80"
                        )}
                      >
                        <span className="text-xl font-black">{level}</span>
                      </button>
                    );
                  })}
                </div>

                {nightStressLevel > 0 && (
                  <div className="text-center p-2 rounded-lg bg-background/50">
                    <p className={cn(
                      "font-bold text-sm",
                      nightStressLevel <= 2 ? "text-green-500" : nightStressLevel === 3 ? "text-amber-500" : "text-red-500"
                    )}>
                      {t(`vault.quiz.nightReflection.stressLevel${nightStressLevel}`)}
                    </p>
                  </div>
                )}
              </div>

              {/* Reflections Section */}
              <h4 className="text-base font-bold flex items-center gap-2 pt-4">
                <Sparkles className="h-5 w-5 text-primary" />
                {t('vault.quiz.reflectionTitle')}
              </h4>

              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('vault.quiz.didWell')}</Label>
                <Textarea
                  value={didWell}
                  onChange={(e) => setDidWell(e.target.value)}
                  placeholder={t('vault.quiz.didWellPlaceholder')}
                  className="min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('vault.quiz.couldImprove')}</Label>
                <Textarea
                  value={couldImprove}
                  onChange={(e) => setCouldImprove(e.target.value)}
                  placeholder={t('vault.quiz.couldImprovePlaceholder')}
                  className="min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('vault.quiz.learned')}</Label>
                <Textarea
                  value={learned}
                  onChange={(e) => setLearned(e.target.value)}
                  placeholder={t('vault.quiz.learnedPlaceholder')}
                  className="min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('vault.quiz.motivation')}</Label>
                <Textarea
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder={t('vault.quiz.motivationPlaceholder')}
                  className="min-h-[80px] resize-none"
                />
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-4 border-t border-border">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 h-12 text-base font-semibold"
            >
              {loading ? t('common.loading') : t('vault.quiz.submit')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="sm:w-auto h-12"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
