import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillResult } from '@/hooks/useTexVisionSession';
import { Button } from '@/components/ui/button';
import { Play, X } from 'lucide-react';

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

interface ActiveDrillViewProps {
  drillId: string;
  tier: string;
  sessionId: string;
  onComplete: (result: DrillResult) => void;
  onExit: () => void;
}

const DRILL_COMPONENTS: Record<string, React.ComponentType<{
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
}>> = {
  soft_focus: SoftFocusGame,
  pattern_search: PatternSearchGame,
  peripheral_vision: PeripheralVisionDrill,
  convergence: ConvergenceDivergenceGame,
  near_far: NearFarSightGame,
  smooth_pursuit: FollowTheTargetGame,
  whack_a_mole: WhackAMoleGame,
  meter_timing: MeterTimingGame,
  brock_string: BrockStringExercise,
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
};

export default function ActiveDrillView({
  drillId,
  tier,
  sessionId,
  onComplete,
  onExit,
}: ActiveDrillViewProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'countdown' | 'playing'>('countdown');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && countdown === 0) {
      setPhase('playing');
    }
  }, [phase, countdown]);

  const handleDrillComplete = (partialResult: Omit<DrillResult, 'drillType' | 'tier'>) => {
    const fullResult: DrillResult = {
      ...partialResult,
      drillType: drillId,
      tier,
    };
    onComplete(fullResult);
  };

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

        {/* Drill name */}
        <h2 className="text-xl font-semibold text-[hsl(var(--tex-vision-text))] mb-8">
          {DRILL_NAMES[drillId] || drillId}
        </h2>

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

  // Playing phase - render the actual drill
  return (
    <div className="fixed inset-0 z-50 bg-[hsl(var(--tex-vision-primary-dark))] overflow-auto">
      <DrillComponent
        tier={tier}
        onComplete={handleDrillComplete}
        onExit={onExit}
      />
    </div>
  );
}
