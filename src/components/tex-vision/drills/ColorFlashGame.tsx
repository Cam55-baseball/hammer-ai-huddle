import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Palette } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface ColorFlashGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
}

type ColorType = 'red' | 'green' | 'blue' | 'yellow';

const COLORS: { type: ColorType; bg: string; name: string }[] = [
  { type: 'red', bg: 'bg-red-500', name: 'Red' },
  { type: 'green', bg: 'bg-emerald-500', name: 'Green' },
  { type: 'blue', bg: 'bg-blue-500', name: 'Blue' },
  { type: 'yellow', bg: 'bg-yellow-400', name: 'Yellow' },
];

export default function ColorFlashGame({ tier, onComplete, onExit }: ColorFlashGameProps) {
  const { t } = useTranslation();
  const [targetColor, setTargetColor] = useState<ColorType>('red');
  const [flashedColor, setFlashedColor] = useState<ColorType | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const flashStartTime = useRef<number>(0);

  const totalAttempts = tier === 'beginner' ? 15 : tier === 'advanced' ? 20 : 30;
  const flashDuration = tier === 'beginner' ? 800 : tier === 'advanced' ? 600 : 400;
  const flashInterval = tier === 'beginner' ? 1500 : tier === 'advanced' ? 1200 : 900;

  // Pick new target color periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newTarget = COLORS[Math.floor(Math.random() * COLORS.length)].type;
      setTargetColor(newTarget);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Flash colors
  useEffect(() => {
    if (isComplete || attempts >= totalAttempts) return;

    const flashColor = () => {
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)].type;
      setFlashedColor(randomColor);
      setIsFlashing(true);
      flashStartTime.current = Date.now();

      setTimeout(() => {
        setIsFlashing(false);
        // If it was target and user didn't tap, count as miss
        if (randomColor === targetColor) {
          setAttempts(prev => prev + 1);
        }
        setFlashedColor(null);
      }, flashDuration);
    };

    const interval = setInterval(flashColor, flashInterval);
    // Initial flash
    setTimeout(flashColor, 500);

    return () => clearInterval(interval);
  }, [isComplete, attempts, totalAttempts, flashDuration, flashInterval, targetColor]);

  // Check completion
  useEffect(() => {
    if (attempts >= totalAttempts && !isComplete) {
      setIsComplete(true);
      const avgReaction = reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : undefined;

      onComplete({
        accuracyPercent: Math.round((score / Math.max(attempts, 1)) * 100),
        reactionTimeMs: avgReaction,
        difficultyLevel: tier === 'beginner' ? 2 : tier === 'advanced' ? 5 : 8,
        drillMetrics: {
          correctHits: score,
          totalAttempts: attempts,
        },
      });
    }
  }, [attempts, totalAttempts, isComplete, score, reactionTimes, tier, onComplete]);

  const handleTap = useCallback(() => {
    if (!isFlashing || !flashedColor || isComplete) return;

    const reactionTime = Date.now() - flashStartTime.current;

    if (flashedColor === targetColor) {
      setScore(prev => prev + 1);
      setReactionTimes(prev => [...prev, reactionTime]);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
    }
    
    setAttempts(prev => prev + 1);
    setIsFlashing(false);
    setFlashedColor(null);

    setTimeout(() => setFeedback(null), 300);
  }, [isFlashing, flashedColor, targetColor, isComplete]);

  const handleTimerComplete = useCallback(() => {
    if (!isComplete) {
      setIsComplete(true);
      const avgReaction = reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : undefined;

      onComplete({
        accuracyPercent: Math.round((score / Math.max(attempts, 1)) * 100),
        reactionTimeMs: avgReaction,
        difficultyLevel: tier === 'beginner' ? 2 : tier === 'advanced' ? 5 : 8,
        drillMetrics: {
          correctHits: score,
          totalAttempts: attempts,
        },
      });
    }
  }, [isComplete, score, attempts, reactionTimes, tier, onComplete]);

  const targetColorData = COLORS.find(c => c.type === targetColor)!;
  const flashedColorData = flashedColor ? COLORS.find(c => c.type === flashedColor) : null;

  return (
    <DrillContainer
      title={t('texVision.drills.colorFlash.title', 'Color Flash')}
      description={t('texVision.drills.colorFlash.description', 'React to your target color')}
      icon={Palette}
      onExit={onExit}
      timer={
        <DrillTimer
          initialSeconds={tier === 'beginner' ? 45 : tier === 'advanced' ? 60 : 90}
          mode="countdown"
          autoStart={true}
          onComplete={handleTimerComplete}
        />
      }
      metrics={
        <DrillMetricsDisplay
          accuracy={attempts > 0 ? Math.round((score / attempts) * 100) : undefined}
          difficulty={tier === 'beginner' ? 2 : tier === 'advanced' ? 5 : 8}
          streak={score}
        />
      }
    >
      <div 
        className="flex flex-col items-center justify-center w-full h-full min-h-[400px] relative cursor-pointer"
        onClick={handleTap}
      >
        {/* Target color indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
            {t('texVision.drills.colorFlash.tapWhenYouSee', 'Tap when you see:')}
          </span>
          <div className={`w-8 h-8 rounded-full ${targetColorData.bg} shadow-lg`} />
        </div>

        {/* Flash area */}
        <div 
          className={`w-48 h-48 rounded-full transition-all duration-100 flex items-center justify-center ${
            isFlashing && flashedColorData
              ? `${flashedColorData.bg} scale-110`
              : 'bg-[hsl(var(--tex-vision-primary))]/30 scale-100'
          } ${
            feedback === 'correct' ? 'ring-4 ring-[hsl(var(--tex-vision-success))]' : 
            feedback === 'wrong' ? 'ring-4 ring-red-500' : ''
          }`}
        >
          {!isFlashing && (
            <span className="text-[hsl(var(--tex-vision-text-muted))] text-sm">
              {t('texVision.drills.colorFlash.watch', 'Watch...')}
            </span>
          )}
        </div>

        {/* Score display */}
        <div className="absolute bottom-16 text-center">
          <p className="text-2xl font-bold text-[hsl(var(--tex-vision-text))]">
            {score} / {attempts}
          </p>
          <p className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
            {t('texVision.drills.colorFlash.correct', 'Correct')}
          </p>
        </div>

        {/* Progress */}
        <div className="absolute top-4 left-4 text-sm text-[hsl(var(--tex-vision-text-muted))]">
          {attempts}/{totalAttempts}
        </div>
      </div>
    </DrillContainer>
  );
}
