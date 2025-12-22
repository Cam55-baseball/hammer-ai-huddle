import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Trophy, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Exercise, ExperienceLevel, isExerciseObject } from '@/types/workout';
import { RestTimer } from './RestTimer';
import { ExerciseDisplayCard } from './ExerciseDisplayCard';
import { WorkoutProgressBar } from './WorkoutProgressBar';

interface FullScreenWorkoutModeProps {
  exercises: (string | Exercise)[];
  experienceLevel: ExperienceLevel;
  exerciseProgress: boolean[];
  weightLog: { [exerciseIndex: number]: number[] };
  onExerciseToggle: (index: number, completed: boolean) => void;
  onWeightUpdate: (exerciseIndex: number, setIndex: number, weight: number) => void;
  onComplete: () => void;
  onExit: () => void;
}

type WorkoutPhase = 'exercise' | 'rest' | 'complete';

// Rest duration in seconds based on exercise type and intensity
const getRestDuration = (exercise: Exercise | string, isLastSet: boolean): number => {
  if (!isExerciseObject(exercise)) {
    return isLastSet ? 60 : 45; // Skill exercise
  }
  
  const intensity = exercise.percentOf1RM || 70;
  
  if (exercise.type === 'strength') {
    if (intensity >= 80) return isLastSet ? 180 : 180; // Heavy
    if (intensity >= 65) return isLastSet ? 150 : 120; // Moderate
    return isLastSet ? 120 : 90; // Light
  }
  
  if (exercise.type === 'isometric') {
    return isLastSet ? 90 : 60;
  }
  
  // Skill exercises
  return isLastSet ? 60 : 45;
};

const getIntensity = (exercise: Exercise | string): 'heavy' | 'moderate' | 'light' => {
  if (!isExerciseObject(exercise)) return 'light';
  const percent = exercise.percentOf1RM || 70;
  if (percent >= 80) return 'heavy';
  if (percent >= 65) return 'moderate';
  return 'light';
};

const getExerciseType = (exercise: Exercise | string): 'strength' | 'isometric' | 'skill' => {
  if (!isExerciseObject(exercise)) return 'skill';
  return exercise.type || 'skill';
};

const getTotalSets = (exercise: Exercise | string): number => {
  if (!isExerciseObject(exercise)) return 1;
  return exercise.sets || 1;
};

const getExerciseName = (exercise: Exercise | string): string => {
  if (!isExerciseObject(exercise)) return exercise;
  return exercise.name;
};

export function FullScreenWorkoutMode({
  exercises,
  experienceLevel,
  exerciseProgress,
  weightLog,
  onExerciseToggle,
  onWeightUpdate,
  onComplete,
  onExit,
}: FullScreenWorkoutModeProps) {
  const { t } = useTranslation();
  
  // Find the first incomplete exercise
  const findFirstIncompleteExercise = useCallback(() => {
    for (let i = 0; i < exercises.length; i++) {
      if (!exerciseProgress[i]) return i;
    }
    return exercises.length; // All complete
  }, [exercises, exerciseProgress]);

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(findFirstIncompleteExercise);
  const [currentSet, setCurrentSet] = useState(1);
  const [completedSets, setCompletedSets] = useState<number[]>([]);
  const [phase, setPhase] = useState<WorkoutPhase>('exercise');
  const [showConfetti, setShowConfetti] = useState(false);

  const currentExercise = exercises[currentExerciseIndex];
  const totalSets = getTotalSets(currentExercise);
  const isLastSet = currentSet === totalSets;
  const isLastExercise = currentExerciseIndex === exercises.length - 1;

  const handleCompleteSet = useCallback(() => {
    // Mark set as completed
    setCompletedSets(prev => [...prev, currentSet - 1]);
    
    if (isLastSet) {
      // Mark exercise as complete
      onExerciseToggle(currentExerciseIndex, true);
      
      if (isLastExercise) {
        // Workout complete!
        setShowConfetti(true);
        setPhase('complete');
      } else {
        // Move to rest, then next exercise
        setPhase('rest');
      }
    } else {
      // Rest between sets
      setPhase('rest');
    }
  }, [currentSet, isLastSet, isLastExercise, currentExerciseIndex, onExerciseToggle]);

  const handleRestComplete = useCallback(() => {
    if (isLastSet) {
      // Move to next exercise
      setCurrentExerciseIndex(prev => prev + 1);
      setCurrentSet(1);
      setCompletedSets([]);
    } else {
      // Move to next set
      setCurrentSet(prev => prev + 1);
    }
    setPhase('exercise');
  }, [isLastSet]);

  const handleSkipExercise = useCallback(() => {
    if (isLastExercise) {
      setPhase('complete');
    } else {
      setCurrentExerciseIndex(prev => prev + 1);
      setCurrentSet(1);
      setCompletedSets([]);
      setPhase('exercise');
    }
  }, [isLastExercise]);

  const handleSkipRest = useCallback(() => {
    handleRestComplete();
  }, [handleRestComplete]);

  // Get background gradient based on exercise type
  const getBackgroundClass = () => {
    const type = getExerciseType(currentExercise);
    switch (type) {
      case 'strength':
        return 'from-orange-950/30 via-background to-background';
      case 'isometric':
        return 'from-blue-950/30 via-background to-background';
      case 'skill':
        return 'from-emerald-950/30 via-background to-background';
      default:
        return 'from-background via-background to-background';
    }
  };

  if (phase === 'complete') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6"
      >
        {/* Confetti Effect */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: '50vw',
                  y: '50vh',
                  scale: 0,
                  rotate: 0
                }}
                animate={{
                  x: `${Math.random() * 100}vw`,
                  y: `${Math.random() * 100}vh`,
                  scale: [0, 1, 0.5],
                  rotate: Math.random() * 360
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  ease: 'easeOut',
                  delay: Math.random() * 0.5
                }}
                className={cn(
                  "absolute w-3 h-3 rounded-full",
                  i % 5 === 0 && "bg-primary",
                  i % 5 === 1 && "bg-orange-500",
                  i % 5 === 2 && "bg-yellow-500",
                  i % 5 === 3 && "bg-green-500",
                  i % 5 === 4 && "bg-blue-500"
                )}
              />
            ))}
          </div>
        )}

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.3 }}
          className="text-center space-y-6"
        >
          <div className="inline-flex p-6 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
            <Trophy className="h-16 w-16 text-yellow-500" />
          </div>
          
          <h1 className="text-4xl font-bold text-foreground">
            {t('workoutFullScreen.workoutFinished')}
          </h1>
          
          <p className="text-xl text-muted-foreground">
            {t('workoutFullScreen.greatWork')}
          </p>

          <div className="flex items-center justify-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">
              {exercises.length} {t('workoutFullScreen.exercisesRemaining', { count: 0 }).replace('0', exercises.length.toString())}
            </span>
            <Sparkles className="h-5 w-5" />
          </div>

          <Button
            size="lg"
            onClick={() => {
              onComplete();
              onExit();
            }}
            className="h-14 px-10 text-lg mt-6"
          >
            {t('workoutFullScreen.exitFullScreen')}
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "fixed inset-0 z-[100] bg-gradient-to-b overflow-y-auto",
        getBackgroundClass()
      )}
    >
      <div className="min-h-full flex flex-col p-4 sm:p-6 lg:p-8">
        {/* Progress Bar */}
        <WorkoutProgressBar
          currentExerciseIndex={currentExerciseIndex}
          totalExercises={exercises.length}
          currentSet={currentSet}
          totalSets={totalSets}
          exerciseType={getExerciseType(currentExercise)}
          exerciseName={getExerciseName(currentExercise)}
          onExit={onExit}
        />

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center py-8">
          <AnimatePresence mode="wait">
            {phase === 'exercise' && isExerciseObject(currentExercise) && (
              <motion.div
                key={`exercise-${currentExerciseIndex}-${currentSet}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-lg"
              >
                <ExerciseDisplayCard
                  exercise={currentExercise}
                  currentSet={currentSet}
                  totalSets={totalSets}
                  experienceLevel={experienceLevel}
                  exerciseWeights={weightLog[currentExerciseIndex] || []}
                  onWeightUpdate={(setIndex, weight) => onWeightUpdate(currentExerciseIndex, setIndex, weight)}
                  onCompleteSet={handleCompleteSet}
                  onSkipExercise={handleSkipExercise}
                  completedSets={completedSets}
                />
              </motion.div>
            )}

            {phase === 'exercise' && !isExerciseObject(currentExercise) && (
              <motion.div
                key={`skill-${currentExerciseIndex}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-lg"
              >
                <div className="text-center space-y-8 p-8 rounded-3xl border border-border/50 bg-emerald-500/5">
                  <h2 className="text-3xl font-bold text-foreground">
                    {currentExercise}
                  </h2>
                  
                  <Button
                    size="lg"
                    onClick={handleCompleteSet}
                    className="h-16 px-12 text-xl font-semibold"
                  >
                    {t('workoutFullScreen.completeSet')}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={handleSkipExercise}
                    className="text-muted-foreground"
                  >
                    {t('workoutFullScreen.skipExercise')}
                  </Button>
                </div>
              </motion.div>
            )}

            {phase === 'rest' && (
              <motion.div
                key="rest"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-lg"
              >
                <RestTimer
                  initialSeconds={getRestDuration(currentExercise, isLastSet)}
                  onComplete={handleRestComplete}
                  onSkip={handleSkipRest}
                  exerciseType={getExerciseType(currentExercise)}
                  intensity={getIntensity(currentExercise)}
                  nextExerciseName={
                    isLastSet && !isLastExercise
                      ? getExerciseName(exercises[currentExerciseIndex + 1])
                      : undefined
                  }
                  isLastSet={isLastSet}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
