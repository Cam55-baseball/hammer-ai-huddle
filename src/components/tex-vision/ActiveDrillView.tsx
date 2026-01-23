import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillResult } from '@/hooks/useTexVisionSession';
import { useAdaptiveDifficulty } from '@/hooks/useAdaptiveDifficulty';
import { FatigueIndicator } from './shared/FatigueIndicator';
import { Button } from '@/components/ui/button';
import { Play, X, Coffee, AlertTriangle, Target, Info, CheckCircle2 } from 'lucide-react';
import { DRILL_INSTRUCTIONS } from './drillInstructions';
import { DRILL_REFLECTIONS } from './drillReflections';
import DrillReflectionPhase from './shared/DrillReflectionPhase';

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

  // Adaptive difficulty hook
  const { 
    getCurrentDifficulty, 
    updateDifficulty,
    getRecommendedAdjustment 
  } = useAdaptiveDifficulty(sport);

  const currentDifficultyLevel = getCurrentDifficulty(drillId);
  const recommendedAdjustment = getRecommendedAdjustment(drillId);

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

  // Handle drill completion with fatigue tracking
  const handleDrillComplete = useCallback(async (partialResult: Omit<DrillResult, 'drillType' | 'tier'>) => {
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

    // Build full result with fatigue score
    const fullResult: DrillResult = {
      ...partialResult,
      drillType: drillId,
      tier,
      fatigueScore: newFatigue,
    };

    // Store result and check if drill has reflection questions
    setCompletedResult(fullResult);
    
    // Check if this drill has reflection questions
    const hasReflection = DRILL_REFLECTIONS[drillId]?.length > 0;
    if (hasReflection) {
      setPhase('reflection');
    } else {
      setPhase('conclusion');
    }
  }, [drillId, tier, fatigueLevel, drillsCompletedThisSession, updateDifficulty]);

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
    return (
      <div className="fixed inset-0 z-50 bg-[hsl(var(--tex-vision-primary-dark))] flex flex-col items-center justify-center p-6">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-[hsl(var(--tex-vision-success))]/20 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-12 w-12 text-[hsl(var(--tex-vision-success))]" />
        </div>
        
        {/* Drill name and completion message */}
        <h2 className="text-2xl font-bold text-[hsl(var(--tex-vision-text))] mb-2">
          {DRILL_NAMES[drillId] || drillId}
        </h2>
        <p className="text-lg text-[hsl(var(--tex-vision-success))] mb-8">
          {t('texVision.drills.drillComplete', 'Drill Complete!')}
        </p>
        
        {/* Results summary */}
        <div className="bg-[hsl(var(--tex-vision-primary))]/30 rounded-xl p-6 w-full max-w-sm mb-8">
          <h3 className="text-sm font-semibold text-[hsl(var(--tex-vision-text-muted))] mb-4 text-center">
            {t('texVision.drills.yourResults', 'Your Results')}
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Accuracy */}
            {completedResult.accuracyPercent !== undefined && (
              <div className="text-center">
                <div className="text-3xl font-bold text-[hsl(var(--tex-vision-feedback))]">
                  {completedResult.accuracyPercent}%
                </div>
                <div className="text-xs text-[hsl(var(--tex-vision-text-muted))]">
                  {t('texVision.drills.accuracy', 'Accuracy')}
                </div>
              </div>
            )}
            
            {/* Reaction Time */}
            {completedResult.reactionTimeMs !== undefined && completedResult.reactionTimeMs > 0 && (
              <div className="text-center">
                <div className="text-3xl font-bold text-[hsl(var(--tex-vision-timing))]">
                  {completedResult.reactionTimeMs}
                </div>
                <div className="text-xs text-[hsl(var(--tex-vision-text-muted))]">
                  {t('texVision.drills.reactionMs', 'Avg ms')}
                </div>
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

  // Instructions phase
  if (phase === 'instructions') {
    const instructions = DRILL_INSTRUCTIONS[drillId];
    
    return (
      <div className="fixed inset-0 z-50 bg-[hsl(var(--tex-vision-primary-dark))] flex flex-col items-center overflow-y-auto p-6 py-8">
        {/* Exit button */}
        <button
          onClick={onExit}
          className="absolute top-4 right-4 p-2 rounded-full bg-[hsl(var(--tex-vision-primary))]/50 text-[hsl(var(--tex-vision-text-muted))] hover:bg-[hsl(var(--tex-vision-primary))]/70 transition-colors z-10"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Content wrapper - centers when short, scrolls when tall */}
        <div className="flex flex-col items-center w-full max-w-md mt-auto mb-auto">
          {/* Drill icon and name */}
          <Target className="h-12 w-12 text-[hsl(var(--tex-vision-feedback))] mb-4" />
          <h2 className="text-2xl font-bold text-[hsl(var(--tex-vision-text))] mb-2">
            {DRILL_NAMES[drillId] || drillId}
          </h2>
          
          {/* Difficulty badge */}
          <div className="text-sm text-[hsl(var(--tex-vision-text-muted))] mb-6">
            {t('texVision.difficulty.level', 'Level')} {currentDifficultyLevel}/10 • {tier}
          </div>

          {/* Objective */}
          {instructions && (
            <div className="w-full space-y-5">
              <div className="text-center">
                <p className="text-lg text-[hsl(var(--tex-vision-text))] font-medium">
                  {instructions.objective}
                </p>
              </div>

              {/* How to play */}
              <div className="bg-[hsl(var(--tex-vision-primary))]/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-[hsl(var(--tex-vision-text))] mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  {t('texVision.drills.howToPlay', 'How to Play')}
                </h3>
                <ul className="space-y-3">
                  {instructions.howToPlay.map((step, i) => (
                    <li key={i} className="text-sm text-[hsl(var(--tex-vision-text-muted))] flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[hsl(var(--tex-vision-feedback))]/20 text-[hsl(var(--tex-vision-feedback))] flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tips */}
              {instructions.tips && instructions.tips.length > 0 && (
                <div className="bg-[hsl(var(--tex-vision-timing))]/10 rounded-lg p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-[hsl(var(--tex-vision-timing))] uppercase tracking-wide">
                    {t('texVision.drills.tips', 'Tips')}
                  </h4>
                  {instructions.tips.map((tip, i) => (
                    <p key={i} className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
                      • {tip}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Start button */}
          <Button 
            onClick={() => setPhase('countdown')}
            className="mt-8 bg-[hsl(var(--tex-vision-feedback))] hover:bg-[hsl(var(--tex-vision-feedback))]/80 text-[hsl(var(--tex-vision-primary-dark))]"
            size="lg"
          >
            <Play className="h-5 w-5 mr-2" />
            {t('texVision.drills.startDrill', 'Start Drill')}
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
