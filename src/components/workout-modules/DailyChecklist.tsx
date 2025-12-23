import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Reorder } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Dumbbell, ArrowUpDown, GripVertical } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  sets?: string;
  reps?: string;
  duration?: string;
  notes?: string;
}

interface DailyChecklistProps {
  dayTitle: string;
  exercises: Exercise[];
  completedExercises: string[];
  onToggleExercise: (exerciseId: string) => void;
  estimatedTime?: string;
}

export function DailyChecklist({
  dayTitle,
  exercises,
  completedExercises,
  onToggleExercise,
  estimatedTime = '45 min',
}: DailyChecklistProps) {
  const { t } = useTranslation();
  const [autoSort, setAutoSort] = useState(() => localStorage.getItem('workout-sort') !== 'original');
  const [orderedExercises, setOrderedExercises] = useState<Exercise[]>(exercises);
  const completedCount = completedExercises.length;
  const totalCount = exercises.length;
  const isCompleted = completedCount === totalCount;

  // Sync ordered exercises with props and restore saved order
  useEffect(() => {
    const savedOrder = localStorage.getItem('workout-exercises-order');
    if (savedOrder && !autoSort) {
      try {
        const orderIds = JSON.parse(savedOrder) as string[];
        const sorted = [...exercises].sort((a, b) => {
          const aIdx = orderIds.indexOf(a.id);
          const bIdx = orderIds.indexOf(b.id);
          if (aIdx === -1 && bIdx === -1) return 0;
          if (aIdx === -1) return 1;
          if (bIdx === -1) return -1;
          return aIdx - bIdx;
        });
        setOrderedExercises(sorted);
      } catch {
        setOrderedExercises(exercises);
      }
    } else {
      setOrderedExercises(exercises);
    }
  }, [exercises, autoSort]);

  const toggleAutoSort = () => {
    const newValue = !autoSort;
    setAutoSort(newValue);
    localStorage.setItem('workout-sort', newValue ? 'auto' : 'original');
  };

  const handleReorder = (newOrder: Exercise[]) => {
    setOrderedExercises(newOrder);
    localStorage.setItem('workout-exercises-order', JSON.stringify(newOrder.map(e => e.id)));
  };

  // Get display exercises based on sort mode
  const displayExercises = autoSort
    ? [...orderedExercises].sort((a, b) => {
        const aChecked = completedExercises.includes(a.id);
        const bChecked = completedExercises.includes(b.id);
        return aChecked === bChecked ? 0 : aChecked ? 1 : -1;
      })
    : orderedExercises;

  const renderExerciseItem = (exercise: Exercise) => {
    const isChecked = completedExercises.includes(exercise.id);
    return (
      <div
        className={`flex items-start gap-3 p-2 sm:p-3 rounded-lg border transition-colors ${
          isChecked ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/30'
        }`}
      >
        {/* Drag handle - only visible in manual mode */}
        {!autoSort && (
          <div className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        <Checkbox
          id={exercise.id}
          checked={isChecked}
          onCheckedChange={() => onToggleExercise(exercise.id)}
          className="mt-1 h-5 w-5"
        />
        <div className="flex-1 min-w-0">
          <label
            htmlFor={exercise.id}
            className={`font-medium text-sm sm:text-base cursor-pointer block ${
              isChecked ? 'line-through text-muted-foreground' : ''
            }`}
          >
            {exercise.name}
          </label>
          <div className="flex flex-wrap gap-2 mt-1">
            {exercise.sets && (
              <Badge variant="outline" className="text-xs">
                {exercise.sets} {t('workoutModules.sets')}
              </Badge>
            )}
            {exercise.reps && (
              <Badge variant="outline" className="text-xs">
                {exercise.reps} {t('workoutModules.reps')}
              </Badge>
            )}
            {exercise.duration && (
              <Badge variant="outline" className="text-xs">
                {exercise.duration}
              </Badge>
            )}
          </div>
          {exercise.notes && (
            <p className="text-xs text-muted-foreground mt-1">
              {exercise.notes}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className={isCompleted ? 'border-green-500/50 bg-green-500/5' : ''}>
      <CardHeader className="pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Dumbbell className="h-4 w-4 sm:h-5 sm:w-5" />
            {dayTitle}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAutoSort}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 h-auto"
            >
              <ArrowUpDown className="h-3 w-3" />
              {autoSort ? t('workoutModules.autoSort', 'Auto') : t('workoutModules.manualSort', 'Manual')}
            </Button>
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {estimatedTime}
            </Badge>
            <Badge variant={isCompleted ? 'default' : 'secondary'} className="text-xs">
              {completedCount}/{totalCount}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        {autoSort ? (
          <div className="space-y-3">
            {displayExercises.map((exercise) => (
              <div key={exercise.id}>
                {renderExerciseItem(exercise)}
              </div>
            ))}
          </div>
        ) : (
          <Reorder.Group axis="y" values={orderedExercises} onReorder={handleReorder} className="space-y-3">
            {orderedExercises.map((exercise) => (
              <Reorder.Item key={exercise.id} value={exercise}>
                {renderExerciseItem(exercise)}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </CardContent>
    </Card>
  );
}
