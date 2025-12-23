import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Clock, Dumbbell } from 'lucide-react';

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
  const completedCount = completedExercises.length;
  const totalCount = exercises.length;
  const isCompleted = completedCount === totalCount;

  return (
    <Card className={isCompleted ? 'border-green-500/50 bg-green-500/5' : ''}>
      <CardHeader className="pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Dumbbell className="h-4 w-4 sm:h-5 sm:w-5" />
            {dayTitle}
          </CardTitle>
          <div className="flex items-center gap-2">
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
        <div className="space-y-3">
          {[...exercises].sort((a, b) => {
            const aChecked = completedExercises.includes(a.id);
            const bChecked = completedExercises.includes(b.id);
            return aChecked === bChecked ? 0 : aChecked ? 1 : -1;
          }).map((exercise) => {
            const isChecked = completedExercises.includes(exercise.id);
            return (
              <div
                key={exercise.id}
                className={`flex items-start gap-3 p-2 sm:p-3 rounded-lg border transition-colors ${
                  isChecked ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/30'
                }`}
              >
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
          })}
        </div>
      </CardContent>
    </Card>
  );
}
