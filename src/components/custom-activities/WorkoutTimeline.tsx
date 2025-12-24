import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GripVertical, X, Clock, Timer, Edit2, Check, Plus } from 'lucide-react';
import { Exercise } from '@/types/customActivity';
import { cn } from '@/lib/utils';
import { CATEGORY_COLORS } from './ExerciseLibrarySidebar';

interface WorkoutTimelineProps {
  exercises: Exercise[];
  onExercisesChange: (exercises: Exercise[]) => void;
  onRemoveExercise: (id: string) => void;
}

interface SortableExerciseCardProps {
  exercise: Exercise;
  onUpdate: (id: string, updates: Partial<Exercise>) => void;
  onRemove: (id: string) => void;
}

function SortableExerciseCard({ exercise, onUpdate, onRemove }: SortableExerciseCardProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    sets: exercise.sets || 3,
    reps: exercise.reps || 10,
    duration: exercise.duration || 60,
    rest: exercise.rest || 60,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    onUpdate(exercise.id, editValues);
    setIsEditing(false);
  };

  const exerciseType = exercise.type || 'strength';
  const colorClass = CATEGORY_COLORS[exerciseType] || CATEGORY_COLORS.strength;

  const estimatedTime = exercise.sets && exercise.reps 
    ? (exercise.sets * 45 + (exercise.sets - 1) * (exercise.rest || 60)) / 60
    : (exercise.duration || 60) / 60;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-start gap-3 p-3 rounded-lg border bg-card",
        "hover:shadow-md transition-all",
        isDragging && "ring-2 ring-primary shadow-lg z-50"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center h-10 w-6 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className={cn("text-xs shrink-0", colorClass)}>
              {exerciseType}
            </Badge>
            <h4 className="font-medium text-sm truncate">{exercise.name}</h4>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            >
              {isEditing ? <Check className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              onClick={() => onRemove(exercise.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {isEditing ? (
          <div className="grid grid-cols-2 gap-2">
            {exercise.sets !== undefined && (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('customActivity.exercise.sets')}</label>
                  <Input
                    type="number"
                    value={editValues.sets}
                    onChange={(e) => setEditValues(prev => ({ ...prev, sets: parseInt(e.target.value) || 0 }))}
                    className="h-7 text-xs"
                    min={1}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('customActivity.exercise.reps')}</label>
                  <Input
                    type="number"
                    value={editValues.reps as number}
                    onChange={(e) => setEditValues(prev => ({ ...prev, reps: parseInt(e.target.value) || 0 }))}
                    className="h-7 text-xs"
                    min={1}
                  />
                </div>
              </>
            )}
            {exercise.duration !== undefined && (
              <div className="space-y-1 col-span-2">
                <label className="text-xs text-muted-foreground">{t('customActivity.exercise.duration')} (s)</label>
                <Input
                  type="number"
                  value={editValues.duration}
                  onChange={(e) => setEditValues(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                  className="h-7 text-xs"
                  min={1}
                />
              </div>
            )}
            <div className="space-y-1 col-span-2">
              <label className="text-xs text-muted-foreground">{t('customActivity.exercise.rest')} (s)</label>
              <Input
                type="number"
                value={editValues.rest}
                onChange={(e) => setEditValues(prev => ({ ...prev, rest: parseInt(e.target.value) || 0 }))}
                className="h-7 text-xs"
                min={0}
              />
            </div>
            <Button size="sm" className="col-span-2 h-7" onClick={handleSave}>
              {t('common.save')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {exercise.sets && exercise.reps && (
              <span className="flex items-center gap-1">
                <span className="font-medium text-foreground">{exercise.sets}×{exercise.reps}</span>
              </span>
            )}
            {exercise.duration && (
              <span className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                <span>{exercise.duration}s</span>
              </span>
            )}
            {(exercise.rest ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{exercise.rest}s rest</span>
              </span>
            )}
            <span className="ml-auto text-muted-foreground/70">
              ~{estimatedTime.toFixed(1)} min
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function WorkoutTimeline({ exercises, onExercisesChange, onRemoveExercise }: WorkoutTimelineProps) {
  const { t } = useTranslation();
  
  const { setNodeRef, isOver } = useDroppable({
    id: 'workout-timeline',
  });

  const handleUpdateExercise = (id: string, updates: Partial<Exercise>) => {
    onExercisesChange(
      exercises.map(ex => ex.id === id ? { ...ex, ...updates } : ex)
    );
  };

  const totalDuration = exercises.reduce((acc, ex) => {
    if (ex.sets && ex.reps) {
      return acc + (ex.sets * 45 + (ex.sets - 1) * (ex.rest || 60));
    }
    return acc + (ex.duration || 60) + (ex.rest || 0);
  }, 0) / 60;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-bold text-sm">{t('workoutBuilder.timeline')}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {t('workoutBuilder.estimatedDuration')}: <strong className="text-foreground">{Math.round(totalDuration)} {t('workoutBuilder.minutes')}</strong>
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div
          ref={setNodeRef}
          className={cn(
            "p-3 min-h-[300px] transition-colors",
            isOver && "bg-primary/5 ring-2 ring-primary/20 ring-inset rounded-lg"
          )}
        >
          {exercises.length === 0 ? (
            <div className={cn(
              "flex flex-col items-center justify-center h-[280px] border-2 border-dashed rounded-lg",
              "text-muted-foreground",
              isOver ? "border-primary bg-primary/5" : "border-muted-foreground/20"
            )}>
              <Plus className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">{t('workoutBuilder.emptyTimeline')}</p>
              <p className="text-xs opacity-70">{t('workoutBuilder.dragExercise')}</p>
            </div>
          ) : (
            <SortableContext items={exercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {exercises.map((exercise, index) => (
                  <div key={exercise.id} className="relative">
                    {index > 0 && (
                      <div className="absolute -top-1 left-4 w-0.5 h-2 bg-border" />
                    )}
                    <SortableExerciseCard
                      exercise={exercise}
                      onUpdate={handleUpdateExercise}
                      onRemove={onRemoveExercise}
                    />
                    {index < exercises.length - 1 && (
                      <div className="absolute -bottom-1 left-4 w-0.5 h-2 bg-border" />
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
