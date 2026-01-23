import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Zap } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface RapidSwitchGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
}

type TaskType = 'color' | 'shape' | 'count' | 'direction';

interface Task {
  type: TaskType;
  prompt: string;
  correctAnswer: string;
  options: string[];
}

export default function RapidSwitchGame({ tier, onComplete, onExit }: RapidSwitchGameProps) {
  const { t } = useTranslation();
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [taskType, setTaskType] = useState<TaskType>('color');
  const startTime = useRef<number>(Date.now());

  const totalAttempts = tier === 'beginner' ? 20 : tier === 'advanced' ? 30 : 45;
  const switchInterval = tier === 'beginner' ? 8 : tier === 'advanced' ? 5 : 3; // Switch task type every N attempts

  const generateTask = useCallback((type: TaskType): Task => {
    switch (type) {
      case 'color': {
        const colors = ['Red', 'Blue', 'Green', 'Yellow'];
        const correct = colors[Math.floor(Math.random() * colors.length)];
        return {
          type: 'color',
          prompt: `🔴🔵🟢🟡`.split('')[colors.indexOf(correct)],
          correctAnswer: correct,
          options: colors,
        };
      }
      case 'shape': {
        const shapes = [
          { name: 'Circle', emoji: '⭕' },
          { name: 'Square', emoji: '⬛' },
          { name: 'Triangle', emoji: '🔺' },
          { name: 'Star', emoji: '⭐' },
        ];
        const correct = shapes[Math.floor(Math.random() * shapes.length)];
        return {
          type: 'shape',
          prompt: correct.emoji,
          correctAnswer: correct.name,
          options: shapes.map(s => s.name),
        };
      }
      case 'count': {
        const count = Math.floor(Math.random() * 5) + 1;
        return {
          type: 'count',
          prompt: '●'.repeat(count),
          correctAnswer: count.toString(),
          options: ['1', '2', '3', '4', '5'],
        };
      }
      case 'direction': {
        const directions = [
          { name: 'Up', emoji: '⬆️' },
          { name: 'Down', emoji: '⬇️' },
          { name: 'Left', emoji: '⬅️' },
          { name: 'Right', emoji: '➡️' },
        ];
        const correct = directions[Math.floor(Math.random() * directions.length)];
        return {
          type: 'direction',
          prompt: correct.emoji,
          correctAnswer: correct.name,
          options: directions.map(d => d.name),
        };
      }
    }
  }, []);

  const nextTask = useCallback(() => {
    // Determine if we should switch task types
    const types: TaskType[] = ['color', 'shape', 'count', 'direction'];
    let newType = taskType;
    
    if (attempts > 0 && attempts % switchInterval === 0) {
      const currentIndex = types.indexOf(taskType);
      newType = types[(currentIndex + 1) % types.length];
      setTaskType(newType);
    }

    setCurrentTask(generateTask(newType));
    startTime.current = Date.now();
  }, [taskType, attempts, switchInterval, generateTask]);

  useEffect(() => {
    nextTask();
  }, []);

  const handleAnswer = useCallback((answer: string) => {
    if (!currentTask || isComplete) return;

    const reactionTime = Date.now() - startTime.current;
    const isCorrect = answer === currentTask.correctAnswer;

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
        nextTask();
      }
    }, 250);
  }, [currentTask, isComplete, attempts, totalAttempts, nextTask]);

  // Completion effect
  useEffect(() => {
    if (isComplete) {
      const avgReaction = reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : undefined;

      onComplete({
        accuracyPercent: Math.round((score / totalAttempts) * 100),
        reactionTimeMs: avgReaction,
        difficultyLevel: tier === 'beginner' ? 5 : tier === 'advanced' ? 8 : 10,
        drillMetrics: {
          correctAnswers: score,
          totalAttempts,
          taskSwitches: Math.floor(attempts / switchInterval),
        },
      });
    }
  }, [isComplete, score, totalAttempts, reactionTimes, tier, attempts, switchInterval, onComplete]);

  const handleTimerComplete = useCallback(() => {
    if (!isComplete) {
      setIsComplete(true);
    }
  }, [isComplete]);

  const getTaskLabel = (type: TaskType) => {
    switch (type) {
      case 'color': return t('texVision.drills.rapidSwitch.identifyColor', 'Identify the COLOR');
      case 'shape': return t('texVision.drills.rapidSwitch.identifyShape', 'Identify the SHAPE');
      case 'count': return t('texVision.drills.rapidSwitch.countDots', 'COUNT the dots');
      case 'direction': return t('texVision.drills.rapidSwitch.identifyDirection', 'Identify the DIRECTION');
    }
  };

  if (!currentTask) return null;

  return (
    <DrillContainer
      title={t('texVision.drills.rapidSwitch.title', 'Rapid Switch')}
      description={t('texVision.drills.rapidSwitch.description', 'Quick task switching under pressure')}
      icon={Zap}
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
          difficulty={tier === 'beginner' ? 5 : tier === 'advanced' ? 8 : 10}
          streak={score}
        />
      }
    >
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] relative">
        {/* Task type indicator */}
        <div className={`absolute top-4 px-4 py-2 rounded-full text-sm font-bold transition-all ${
          feedback === 'correct' ? 'bg-[hsl(var(--tex-vision-success))]/20 text-[hsl(var(--tex-vision-success))]' :
          feedback === 'wrong' ? 'bg-red-500/20 text-red-400' :
          'bg-[hsl(var(--tex-vision-feedback))]/20 text-[hsl(var(--tex-vision-feedback))]'
        }`}>
          {getTaskLabel(currentTask.type)}
        </div>

        {/* Stimulus */}
        <div className={`text-7xl mb-8 transition-transform duration-100 ${
          feedback === 'correct' ? 'scale-110' : feedback === 'wrong' ? 'scale-90' : ''
        }`}>
          {currentTask.prompt}
        </div>

        {/* Answer options */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {currentTask.options.map((option) => (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              disabled={isComplete}
              className={`p-3 rounded-xl font-bold text-sm transition-all duration-100
                bg-[hsl(var(--tex-vision-primary))]/50 text-[hsl(var(--tex-vision-text))]
                hover:bg-[hsl(var(--tex-vision-primary))]/70 hover:scale-105 
                active:scale-95 disabled:opacity-50`}
            >
              {option}
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
