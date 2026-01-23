import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Brain } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface StroopChallengeGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
}

type ColorName = 'RED' | 'GREEN' | 'BLUE' | 'YELLOW';

interface ColorOption {
  name: ColorName;
  textClass: string;
  bgClass: string;
}

const COLORS: ColorOption[] = [
  { name: 'RED', textClass: 'text-red-500', bgClass: 'bg-red-500' },
  { name: 'GREEN', textClass: 'text-emerald-500', bgClass: 'bg-emerald-500' },
  { name: 'BLUE', textClass: 'text-blue-500', bgClass: 'bg-blue-500' },
  { name: 'YELLOW', textClass: 'text-yellow-400', bgClass: 'bg-yellow-400' },
];

export default function StroopChallengeGame({ tier, onComplete, onExit }: StroopChallengeGameProps) {
  const { t } = useTranslation();
  const [displayWord, setDisplayWord] = useState<ColorName>('RED');
  const [displayColor, setDisplayColor] = useState<ColorOption>(COLORS[0]);
  const [mode, setMode] = useState<'color' | 'word'>('color'); // What to identify
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const startTime = useRef<number>(Date.now());

  const totalAttempts = tier === 'beginner' ? 15 : tier === 'advanced' ? 25 : 40;

  const generateNewChallenge = useCallback(() => {
    // Pick random word and color (they can be different for Stroop effect)
    const wordIndex = Math.floor(Math.random() * COLORS.length);
    const colorIndex = Math.floor(Math.random() * COLORS.length);
    
    setDisplayWord(COLORS[wordIndex].name);
    setDisplayColor(COLORS[colorIndex]);
    
    // In advanced/chaos, randomly switch between identifying color vs word
    if (tier !== 'beginner' && Math.random() > 0.5) {
      setMode('word');
    } else {
      setMode('color');
    }
    
    startTime.current = Date.now();
  }, [tier]);

  useEffect(() => {
    generateNewChallenge();
  }, [generateNewChallenge]);

  const handleAnswer = useCallback((selectedColor: ColorName) => {
    if (isComplete) return;

    const reactionTime = Date.now() - startTime.current;
    const correctAnswer = mode === 'color' ? displayColor.name : displayWord;
    const isCorrect = selectedColor === correctAnswer;

    if (isCorrect) {
      setScore(prev => prev + 1);
      setReactionTimes(prev => [...prev, reactionTime]);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
    }

    setAttempts(prev => prev + 1);

    setTimeout(() => {
      setFeedback(null);
      if (attempts + 1 >= totalAttempts) {
        setIsComplete(true);
      } else {
        generateNewChallenge();
      }
    }, 300);
  }, [isComplete, mode, displayColor.name, displayWord, attempts, totalAttempts, generateNewChallenge]);

  // Completion effect
  useEffect(() => {
    if (isComplete) {
      const avgReaction = reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : undefined;

      onComplete({
        accuracyPercent: Math.round((score / totalAttempts) * 100),
        reactionTimeMs: avgReaction,
        difficultyLevel: tier === 'beginner' ? 3 : tier === 'advanced' ? 6 : 9,
        drillMetrics: {
          correctAnswers: score,
          totalAttempts,
        },
      });
    }
  }, [isComplete, score, totalAttempts, reactionTimes, tier, onComplete]);

  const handleTimerComplete = useCallback(() => {
    if (!isComplete) {
      setIsComplete(true);
    }
  }, [isComplete]);

  return (
    <DrillContainer
      title={t('texVision.drills.stroopChallenge.title', 'Stroop Challenge')}
      description={t('texVision.drills.stroopChallenge.description', 'Color-word interference training')}
      icon={Brain}
      onExit={onExit}
      timer={
        <DrillTimer
          initialSeconds={tier === 'beginner' ? 60 : tier === 'advanced' ? 90 : 120}
          mode="countdown"
          autoStart={true}
          onComplete={handleTimerComplete}
        />
      }
      metrics={
        <DrillMetricsDisplay
          accuracy={attempts > 0 ? Math.round((score / attempts) * 100) : undefined}
          difficulty={tier === 'beginner' ? 3 : tier === 'advanced' ? 6 : 9}
          streak={score}
        />
      }
    >
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] relative">
        {/* Instruction */}
        <div className="absolute top-4 text-center">
          <p className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
            {mode === 'color' 
              ? t('texVision.drills.stroopChallenge.identifyColor', 'Identify the INK COLOR')
              : t('texVision.drills.stroopChallenge.identifyWord', 'Identify the WORD')
            }
          </p>
        </div>

        {/* The Stroop word */}
        <div 
          className={`text-6xl font-bold mb-12 transition-all duration-150 ${displayColor.textClass} ${
            feedback === 'correct' ? 'scale-110' : feedback === 'wrong' ? 'scale-90 opacity-50' : ''
          }`}
        >
          {displayWord}
        </div>

        {/* Answer buttons */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
          {COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => handleAnswer(color.name)}
              disabled={isComplete}
              className={`${color.bgClass} p-4 rounded-xl text-white font-bold text-lg shadow-lg 
                hover:scale-105 active:scale-95 transition-transform duration-100
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {color.name}
            </button>
          ))}
        </div>

        {/* Score */}
        <div className="absolute bottom-16 text-center">
          <p className="text-2xl font-bold text-[hsl(var(--tex-vision-text))]">
            {score} / {attempts}
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
