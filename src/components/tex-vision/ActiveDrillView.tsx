import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillResult } from '@/hooks/useTexVisionSession';
import { useAdaptiveDifficulty } from '@/hooks/useAdaptiveDifficulty';
import { usePersonalBests, PersonalBestResult } from '@/hooks/usePersonalBests';
import { FatigueIndicator } from './shared/FatigueIndicator';
import { CelebrationBadge, CelebrationType } from './shared/CelebrationBadge';
import DrillPreviewAnimation from './shared/DrillPreviewAnimation';
import { Button } from '@/components/ui/button';
import { Play, X, Coffee, Target, CheckCircle2, Trophy, SkipForward, Zap } from 'lucide-react';
import { SIMPLIFIED_INSTRUCTIONS, ACTION_ICONS, getSimplifiedInstructions } from './simplifiedInstructions';
import { DRILL_REFLECTIONS } from './drillReflections';
import { getDrillBenefit } from '@/constants/drillBenefits';
import { validateDrillCompletion } from '@/constants/drillCompletionRequirements';
import DrillReflectionPhase from './shared/DrillReflectionPhase';
import { triggerCelebration } from '@/lib/confetti';

// Import all drill components
import SoftFocusGame from './drills/SoftFocusGame';
import PatternSearchGame from './drills/PatternSearchGame';
import PeripheralVisionDrill from './drills/PeripheralVisionDrill';
import ConvergenceDivergenceGame from './drills/ConvergenceDivergenceGame';
import NearFarSightGame from './drills/NearFarSightGame';
import FollowTheTargetGame from './drills/FollowTheTargetGame';
import WhackAMoleGame from './drills/WhackAMoleGame';
import MeterTimingGame from './drills/MeterTimingGame';
import BrockStringExercise from './drills/BrockStringExercise';
import ColorFlashGame from './drills/ColorFlashGame';
import EyeRelaxationGame from './drills/EyeRelaxationGame';
import StroopChallengeGame from './drills/StroopChallengeGame';
import MultiTargetTrackGame from './drills/MultiTargetTrackGame';
import RapidSwitchGame from './drills/RapidSwitchGame';
import DualTaskVisionGame from './drills/DualTaskVisionGame';
import ChaosGridGame from './drills/ChaosGridGame';

interface ActiveDrillViewProps {
  drillId: string;
  tier: string;
  sessionId: string;
  onComplete: (result: DrillResult) => void;
  onExit: () => void;
  sport?: string;
}

export interface DrillComponentProps {
  tier: string;
  difficultyLevel?: number;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
}

const DRILL_COMPONENTS: Record<string, React.ComponentType<DrillComponentProps>> = {
  soft_focus: SoftFocusGame,
  pattern_search: PatternSearchGame,
  peripheral_vision: PeripheralVisionDrill,
  convergence: ConvergenceDivergenceGame,
  near_far: NearFarSightGame,
  smooth_pursuit: FollowTheTargetGame,
  whack_a_mole: WhackAMoleGame,
  meter_timing: MeterTimingGame,
  brock_string: BrockStringExercise,
  color_flash: ColorFlashGame,
  eye_relaxation: EyeRelaxationGame,
  stroop_challenge: StroopChallengeGame,
  multi_target_track: MultiTargetTrackGame,
  rapid_switch: RapidSwitchGame,
  dual_task_vision: DualTaskVisionGame,
  chaos_grid: ChaosGridGame,
};

const DRILL_NAMES: Record<string, string> = {
  soft_focus: 'Soft Focus',
  pattern_search: 'Pattern Search',
  peripheral_vision: 'Peripheral Vision',
  convergence: 'Convergence',
  near_far: 'Near-Far Sight',
  smooth_pursuit: 'Follow the Target',
  whack_a_mole: 'Whack-a-Mole',
  meter_timing: 'Meter Timing',
  brock_string: 'Brock String',
  color_flash: 'Color Flash',
  eye_relaxation: 'Eye Relaxation',
  stroop_challenge: 'Stroop Challenge',
  multi_target_track: 'Multi-Target Track',
  rapid_switch: 'Rapid Switch',
  dual_task_vision: 'Dual-Task Vision',
  chaos_grid: 'Chaos Grid',
};

// Fatigue calculation constants
const FATIGUE_INCREASE_PER_DRILL = 8; // Base fatigue increase per drill
const FATIGUE_INCREASE_ON_LOW_ACCURACY = 5; // Extra fatigue when accuracy < 60%
const FATIGUE_DECAY_PER_SECOND = 0.5; // Fatigue decay during breaks

export default function ActiveDrillView({
  drillId,
  tier,
  sessionId,
  onComplete,
  onExit,
  sport = 'baseball',
}: ActiveDrillViewProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'instructions' | 'countdown' | 'playing' | 'reflection' | 'break' | 'conclusion'>('instructions');
  const [countdown, setCountdown] = useState(3);
  const [fatigueLevel, setFatigueLevel] = useState(0);
  const [drillsCompletedThisSession, setDrillsCompletedThisSession] = useState(0);
  const [breakTimer, setBreakTimer] = useState(0);
  const [completedResult, setCompletedResult] = useState<DrillResult | null>(null);
  const [reflectionResponses, setReflectionResponses] = useState<Record<string, string | number>>({});
  const [pbResult, setPbResult] = useState<PersonalBestResult | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<CelebrationType>('perfect');
  
  // Skip tutorial tracking
  const [hasSeenDrill, setHasSeenDrill] = useState<Set<string>>(new Set());
  const drillStartTime = useRef<number>(0);
  const interactionCount = useRef<number>(0);

  // Adaptive difficulty hook
  const { 
    getCurrentDifficulty, 
    updateDifficulty,
    getRecommendedAdjustment 
  } = useAdaptiveDifficulty(sport);

  // Personal bests hook
  const { getPersonalBest, checkAndUpdatePersonalBest } = usePersonalBests();

  const currentDifficultyLevel = getCurrentDifficulty(drillId);
  const recommendedAdjustment = getRecommendedAdjustment(drillId);
  
  // Load seen drills from localStorage
  useEffect(() => {
    const seen = localStorage.getItem('tex_vision_seen_drills');
    if (seen) {
      try {
        setHasSeenDrill(new Set(JSON.parse(seen)));
      } catch (e) {
        console.error('Failed to load seen drills:', e);
      }
    }
  }, []);
  
  // Mark drill as seen after completion
  const markDrillAsSeen = useCallback((id: string) => {
    const updated = new Set(hasSeenDrill).add(id);
    localStorage.setItem('tex_vision_seen_drills', JSON.stringify([...updated]));
    setHasSeenDrill(updated);
  }, [hasSeenDrill]);
  
  // Start drill (with or without skip)
  const handleStartDrill = useCallback(() => {
    drillStartTime.current = Date.now();
    interactionCount.current = 0;
    setCountdown(3);
    setPhase('countdown');
  }, []);

  // Countdown effect
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && countdown === 0) {
      setPhase('playing');
    }
  }, [phase, countdown]);

  // Break timer - fatigue decays during breaks
  useEffect(() => {
    if (phase === 'break' && breakTimer > 0) {
      const timer = setInterval(() => {
        setBreakTimer(prev => prev - 1);
        setFatigueLevel(prev => Math.max(0, prev - FATIGUE_DECAY_PER_SECOND));
      }, 1000);
      return () => clearInterval(timer);
    } else if (phase === 'break' && breakTimer <= 0) {
      // Reset countdown and go back to playing
      setCountdown(3);
      setPhase('countdown');
    }
  }, [phase, breakTimer]);

  // Handle drill completion with fatigue tracking, validation, and personal bests
  const handleDrillComplete = useCallback(async (partialResult: Omit<DrillResult, 'drillType' | 'tier'>) => {
    // Calculate drill duration
    const durationSeconds = drillStartTime.current > 0 
      ? Math.floor((Date.now() - drillStartTime.current) / 1000) 
      : 60; // Default if timer wasn't set
    
    // Validate completion requirements
    const hasResult = partialResult.accuracyPercent !== undefined;
    const validation = validateDrillCompletion(
      drillId,
      interactionCount.current,
      durationSeconds,
      hasResult
    );
    
    // Log validation for debugging (can be removed in production)
    console.log('Drill completion validation:', {
      drillId,
      interactions: interactionCount.current,
      duration: durationSeconds,
      hasResult,
      isValid: validation.isValid,
      reason: validation.reason
    });
    
    // Mark drill as seen for skip tutorial feature
    markDrillAsSeen(drillId);
    
    // Update fatigue based on performance
    let fatigueIncrease = FATIGUE_INCREASE_PER_DRILL;
    if (partialResult.accuracyPercent !== undefined && partialResult.accuracyPercent < 60) {
      fatigueIncrease += FATIGUE_INCREASE_ON_LOW_ACCURACY;
    }
    
    // Higher drills completed = more fatigue accumulation
    fatigueIncrease += Math.floor(drillsCompletedThisSession / 3) * 2;
    
    const newFatigue = Math.min(100, fatigueLevel + fatigueIncrease);
    setFatigueLevel(newFatigue);
    setDrillsCompletedThisSession(prev => prev + 1);

    // Update adaptive difficulty based on this drill's results
    if (partialResult.accuracyPercent !== undefined) {
      await updateDifficulty(
        drillId,
        partialResult.accuracyPercent,
        partialResult.reactionTimeMs
      );
    }

    // Build full result with fatigue score and validation status
    const fullResult: DrillResult = {
      ...partialResult,
      drillType: drillId,
      tier,
      fatigueScore: newFatigue,
      drillMetrics: {
        ...(partialResult.drillMetrics as Record<string, unknown> || {}),
        completionValid: validation.isValid,
        durationSeconds,
        interactionCount: interactionCount.current,
      },
    };

    // Check for personal best (only if validation passed)
    const pbCheckResult = await checkAndUpdatePersonalBest(drillId, tier, {
      accuracyPercent: partialResult.accuracyPercent,
      reactionTimeMs: partialResult.reactionTimeMs,
      streak: (partialResult.drillMetrics as Record<string, number>)?.bestStreak || 
              (partialResult.drillMetrics as Record<string, number>)?.correctHits,
    });
    setPbResult(pbCheckResult);

    // Determine celebration type
    if (partialResult.accuracyPercent === 100) {
      setCelebrationType('perfect');
      setShowCelebration(true);
      triggerCelebration();
    } else if (pbCheckResult.isNewAccuracyRecord || pbCheckResult.isNewReactionRecord) {
      setCelebrationType('newPB');
      setShowCelebration(true);
      triggerCelebration();
    } else if (partialResult.accuracyPercent !== undefined && partialResult.accuracyPercent >= 90) {
      setCelebrationType('excellent');
      setShowCelebration(true);
    }

    // Store result and check if drill has reflection questions
    setCompletedResult(fullResult);
    
    // Check if this drill has reflection questions
    const hasReflection = DRILL_REFLECTIONS[drillId]?.length > 0;
    if (hasReflection) {
      setPhase('reflection');
    } else {
      setPhase('conclusion');
    }
  }, [drillId, tier, fatigueLevel, drillsCompletedThisSession, updateDifficulty, checkAndUpdatePersonalBest, markDrillAsSeen]);

  // Handle reflection completion
  const handleReflectionComplete = useCallback((responses: Record<string, string | number>) => {
    setReflectionResponses(responses);
    setPhase('conclusion');
  }, []);

  // Handle reflection skip
  const handleReflectionSkip = useCallback(() => {
    setPhase('conclusion');
  }, []);

  // Handle taking a break
  const handleTakeBreak = useCallback(() => {
    setPhase('break');
    setBreakTimer(30); // 30 second break
  }, []);

  // Handle ending session due to critical fatigue
  const handleEndSessionFatigue = useCallback(() => {
    onExit();
  }, [onExit]);

  const DrillComponent = DRILL_COMPONENTS[drillId];

  if (!DrillComponent) {
    return (
      <div className="fixed inset-0 z-50 bg-[hsl(var(--tex-vision-primary-dark))] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[hsl(var(--tex-vision-text))] mb-4">
            {t('texVision.drills.notFound', 'Drill not found')}
          </p>
          <Button onClick={onExit} variant="outline">
            {t('common.goBack', 'Go Back')}
          </Button>
        </div>
      </div>
    );
  }

  // Helper function for performance feedback
  const getPerformanceFeedback = (accuracy?: number): string => {
    if (accuracy === undefined) return t('texVision.feedback.complete', 'Great job completing the drill!');
    if (accuracy >= 90) return t('texVision.feedback.excellent', 'Excellent! Outstanding performance!');
    if (accuracy >= 75) return t('texVision.feedback.great', 'Great work! Keep it up!');
    if (accuracy >= 60) return t('texVision.feedback.good', 'Good effort! Room to improve.');
    return t('texVision.feedback.keepPracticing', "Keep practicing! You'll improve.");
  };

  // Reflection phase - show after playing phase for drills with reflection questions
  if (phase === 'reflection') {
    return (
      <DrillReflectionPhase
        drillId={drillId}
        onComplete={handleReflectionComplete}
        onSkip={handleReflectionSkip}
      />
    );
  }

  // Conclusion phase - show after drill completes
  if (phase === 'conclusion' && completedResult) {
    const isNewPB = pbResult?.isNewAccuracyRecord || pbResult?.isNewReactionRecord || pbResult?.isNewStreakRecord;
    const previousBest = pbResult?.previousBest;

    return (
      <div className="fixed inset-0 z-50 bg-[hsl(var(--tex-vision-primary-dark))] flex flex-col items-center justify-center p-6">
        {/* Celebration Badge Overlay */}
        <CelebrationBadge
          type={celebrationType}
          value={celebrationType === 'newPB' && completedResult.accuracyPercent !== undefined 
            ? `${completedResult.accuracyPercent}% Accuracy` 
            : undefined}
          show={showCelebration}
          onAnimationComplete={() => setShowCelebration(false)}
        />

        {/* Success icon - use trophy for PB */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
          isNewPB 
            ? 'bg-gradient-to-br from-amber-400/30 to-yellow-300/30' 
            : 'bg-[hsl(var(--tex-vision-success))]/20'
        }`}>
          {isNewPB ? (
            <Trophy className="h-12 w-12 text-amber-400" />
          ) : (
            <CheckCircle2 className="h-12 w-12 text-[hsl(var(--tex-vision-success))]" />
          )}
        </div>
        
        {/* Drill name and completion message */}
        <h2 className="text-2xl font-bold text-[hsl(var(--tex-vision-text))] mb-2">
          {DRILL_NAMES[drillId] || drillId}
        </h2>
        
        {/* New PB or Drill Complete message */}
        {isNewPB ? (
          <p className="text-lg text-amber-400 font-bold mb-8">
            🏆 {t('texVision.drills.newPersonalBest', 'New Personal Best!')}
          </p>
        ) : (
          <p className="text-lg text-[hsl(var(--tex-vision-success))] mb-8">
            {t('texVision.drills.drillComplete', 'Drill Complete!')}
          </p>
        )}
        
        {/* Results summary */}
        <div className="bg-[hsl(var(--tex-vision-primary))]/30 rounded-xl p-6 w-full max-w-sm mb-8">
          <h3 className="text-sm font-semibold text-[hsl(var(--tex-vision-text-muted))] mb-4 text-center">
            {t('texVision.drills.yourResults', 'Your Results')}
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Accuracy */}
            {completedResult.accuracyPercent !== undefined && (
              <div className="text-center">
                <div className={`text-3xl font-bold ${
                  pbResult?.isNewAccuracyRecord ? 'text-[hsl(var(--tex-vision-warning))]' : 'text-[hsl(var(--tex-vision-feedback))]'
                }`}>
                  {completedResult.accuracyPercent}%
                  {pbResult?.isNewAccuracyRecord && <span className="text-sm ml-1">🔥</span>}
                </div>
                <div className="text-xs text-[hsl(var(--tex-vision-text-muted))]">
                  {t('texVision.drills.accuracy', 'Accuracy')}
                </div>
                {previousBest?.best_accuracy_percent && (
                  <div className="text-[10px] text-[hsl(var(--tex-vision-text-muted))] mt-1">
                    PB: {previousBest.best_accuracy_percent}%
                  </div>
                )}
              </div>
            )}
            
            {/* Reaction Time */}
            {completedResult.reactionTimeMs !== undefined && completedResult.reactionTimeMs > 0 && (
              <div className="text-center">
                <div className={`text-3xl font-bold ${
                  pbResult?.isNewReactionRecord ? 'text-[hsl(var(--tex-vision-warning))]' : 'text-[hsl(var(--tex-vision-timing))]'
                }`}>
                  {completedResult.reactionTimeMs}
                  {pbResult?.isNewReactionRecord && <span className="text-sm ml-1">⚡</span>}
                </div>
                <div className="text-xs text-[hsl(var(--tex-vision-text-muted))]">
                  {t('texVision.drills.reactionMs', 'Avg ms')}
                </div>
                {previousBest?.best_reaction_time_ms && (
                  <div className="text-[10px] text-[hsl(var(--tex-vision-text-muted))] mt-1">
                    PB: {previousBest.best_reaction_time_ms}ms
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Performance feedback based on accuracy */}
          <div className="mt-4 pt-4 border-t border-[hsl(var(--tex-vision-primary-light))]/20 text-center">
            <p className="text-sm text-[hsl(var(--tex-vision-text))]">
              {getPerformanceFeedback(completedResult.accuracyPercent)}
            </p>
          </div>
        </div>
        
        {/* Fatigue indicator (if elevated) */}
        {fatigueLevel >= 40 && (
          <div className="mb-6 w-full max-w-sm">
            <FatigueIndicator level={fatigueLevel} showRecoverySuggestion />
          </div>
        )}
        
        {/* Done button */}
        <Button
          onClick={() => onComplete(completedResult)}
          className="bg-[hsl(var(--tex-vision-feedback))] hover:bg-[hsl(var(--tex-vision-feedback))]/80 text-[hsl(var(--tex-vision-primary-dark))]"
          size="lg"
        >
          {t('texVision.drills.done', 'Done')}
        </Button>
      </div>
    );
  }

  // Break phase
  if (phase === 'break') {
    return (
      <div className="fixed inset-0 z-50 bg-[hsl(var(--tex-vision-primary-dark))] flex flex-col items-center justify-center">
        <button
          onClick={onExit}
          className="absolute top-4 right-4 p-2 rounded-full bg-[hsl(var(--tex-vision-primary))]/50 text-[hsl(var(--tex-vision-text-muted))] hover:bg-[hsl(var(--tex-vision-primary))]/70 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <Coffee className="h-16 w-16 text-[hsl(var(--tex-vision-timing))] mb-6" />
        
        <h2 className="text-2xl font-bold text-[hsl(var(--tex-vision-text))] mb-2">
          {t('texVision.fatigue.breakTime', 'Take a Break')}
        </h2>
        
        <p className="text-[hsl(var(--tex-vision-text-muted))] mb-6">
          {t('texVision.fatigue.breakMessage', 'Rest your eyes for a moment')}
        </p>

        <div className="text-4xl font-mono text-[hsl(var(--tex-vision-feedback))] mb-8">
          {breakTimer}s
        </div>

        <FatigueIndicator 
          level={fatigueLevel} 
          className="w-64"
          showRecoverySuggestion={false}
        />

        <Button 
          onClick={() => {
            setCountdown(3);
            setPhase('countdown');
          }}
          variant="outline"
          className="mt-6"
        >
          {t('texVision.fatigue.skipBreak', 'Skip Break')}
        </Button>
      </div>
    );
  }

  // Instructions phase - NEW kid-friendly visual design
  if (phase === 'instructions') {
    const instructions = getSimplifiedInstructions(drillId);
    const benefit = getDrillBenefit(drillId);
    const userHasSeenDrill = hasSeenDrill.has(drillId);
    
    return (
      <div className="fixed inset-0 z-50 bg-[hsl(var(--tex-vision-primary-dark))] flex flex-col items-center overflow-y-auto p-4 py-6">
        {/* Top bar: Exit + Skip */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <button
            onClick={onExit}
            className="p-2 rounded-full bg-[hsl(var(--tex-vision-primary))]/50 text-[hsl(var(--tex-vision-text-muted))] hover:bg-[hsl(var(--tex-vision-primary))]/70 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          {userHasSeenDrill && (
            <button
              onClick={handleStartDrill}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[hsl(var(--tex-vision-primary))]/50 text-[hsl(var(--tex-vision-text-muted))] hover:bg-[hsl(var(--tex-vision-primary))]/70 transition-colors text-sm"
            >
              <SkipForward className="h-4 w-4" />
              {t('texVision.drills.skipTutorial', 'Skip')}
            </button>
          )}
        </div>

        {/* Content wrapper */}
        <div className="flex flex-col items-center w-full max-w-sm mt-16 mb-auto space-y-5">
          {/* Animated Preview */}
          <div className="w-full h-40 rounded-xl overflow-hidden">
            <DrillPreviewAnimation drillId={drillId} />
          </div>

          {/* Drill name + goal */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-[hsl(var(--tex-vision-text))]">
              {DRILL_NAMES[drillId] || drillId}
            </h2>
            {instructions && (
              <p className="text-lg text-[hsl(var(--tex-vision-feedback))] font-medium">
                {instructions.goalSentence}
              </p>
            )}
          </div>

          {/* Sport benefit badge */}
          {benefit && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--tex-vision-success))]/15 border border-[hsl(var(--tex-vision-success))]/30">
              <span className="text-lg">{benefit.icon}</span>
              <span className="text-sm text-[hsl(var(--tex-vision-success))]">
                {benefit.sportImpact}
              </span>
            </div>
          )}

          {/* Quick steps - icon based */}
          {instructions && (
            <div className="w-full space-y-3 mt-4">
              {instructions.quickSteps.map((step, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-4 p-3 rounded-xl bg-[hsl(var(--tex-vision-primary))]/30"
                >
                  <span className="text-2xl">{ACTION_ICONS[step.icon]}</span>
                  <span className="text-base text-[hsl(var(--tex-vision-text))] font-medium">
                    {step.action}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Level indicator */}
          <div className="text-xs text-[hsl(var(--tex-vision-text-muted))]">
            {t('texVision.difficulty.level', 'Level')} {currentDifficultyLevel}/10 • {tier}
          </div>

          {/* Start button */}
          <Button 
            onClick={handleStartDrill}
            className="w-full mt-4 bg-[hsl(var(--tex-vision-feedback))] hover:bg-[hsl(var(--tex-vision-feedback))]/80 text-[hsl(var(--tex-vision-primary-dark))] h-14 text-lg font-bold"
            size="lg"
          >
            <Zap className="h-5 w-5 mr-2" />
            {t('texVision.drills.imReady', "I'm Ready!")}
          </Button>
        </div>
      </div>
    );
  }

  // Countdown phase
  if (phase === 'countdown') {
    return (
      <div className="fixed inset-0 z-50 bg-[hsl(var(--tex-vision-primary-dark))] flex flex-col items-center justify-center">
        {/* Exit button */}
        <button
          onClick={onExit}
          className="absolute top-4 right-4 p-2 rounded-full bg-[hsl(var(--tex-vision-primary))]/50 text-[hsl(var(--tex-vision-text-muted))] hover:bg-[hsl(var(--tex-vision-primary))]/70 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Fatigue indicator (if visible) */}
        {fatigueLevel >= 20 && (
          <div className="absolute top-4 left-4 w-64">
            <FatigueIndicator 
              level={fatigueLevel}
              onTakeBreak={handleTakeBreak}
              onEndSession={handleEndSessionFatigue}
            />
          </div>
        )}

        {/* Difficulty adjustment indicator */}
        {recommendedAdjustment !== 'stable' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              recommendedAdjustment === 'increase' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              {recommendedAdjustment === 'increase' 
                ? t('texVision.difficulty.increasing', 'Difficulty ↑')
                : t('texVision.difficulty.decreasing', 'Difficulty ↓')
              }
            </div>
          </div>
        )}

        {/* Drill name */}
        <h2 className="text-xl font-semibold text-[hsl(var(--tex-vision-text))] mb-2">
          {DRILL_NAMES[drillId] || drillId}
        </h2>

        {/* Difficulty level badge */}
        <div className="text-sm text-[hsl(var(--tex-vision-text-muted))] mb-8">
          {t('texVision.difficulty.level', 'Level')} {currentDifficultyLevel}/10
        </div>

        {/* Countdown circle */}
        <div className="relative w-32 h-32 mb-8">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              className="stroke-[hsl(var(--tex-vision-primary))]"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              className="stroke-[hsl(var(--tex-vision-feedback))]"
              strokeWidth="6"
              strokeDasharray={`${(countdown / 3) * 283} 283`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.2s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-bold text-[hsl(var(--tex-vision-text))]">
              {countdown}
            </span>
          </div>
        </div>

        <p className="text-[hsl(var(--tex-vision-text-muted))]">
          {t('texVision.drills.getReady', 'Get ready...')}
        </p>
      </div>
    );
  }

  // Playing phase - render the actual drill with difficulty level
  return (
    <div className="fixed inset-0 z-50 bg-[hsl(var(--tex-vision-primary-dark))] overflow-auto">
      {/* Fatigue indicator overlay */}
      {fatigueLevel >= 60 && (
        <div className="absolute top-4 left-4 z-10 w-64">
          <FatigueIndicator 
            level={fatigueLevel}
            onTakeBreak={handleTakeBreak}
            onEndSession={handleEndSessionFatigue}
          />
        </div>
      )}
      
      <DrillComponent
        tier={tier}
        difficultyLevel={currentDifficultyLevel}
        onComplete={handleDrillComplete}
        onExit={onExit}
      />
    </div>
  );
}
