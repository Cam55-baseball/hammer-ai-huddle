import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical, X, Clock, Timer, Edit2, Check, Plus, Link2, Unlink } from 'lucide-react';
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
  supersetInfo?: { label: string; isFirst: boolean; isLast: boolean; color: string };
  isSelecting: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onUngroup: (groupId: string) => void;
}

const SUPERSET_COLORS = [
  'border-l-blue-500 bg-blue-500/5',
  'border-l-amber-500 bg-amber-500/5',
  'border-l-pink-500 bg-pink-500/5',
  'border-l-cyan-500 bg-cyan-500/5',
];

function SortableExerciseCard({ 
  exercise, 
  onUpdate, 
  onRemove, 
  supersetInfo,
  isSelecting,
  isSelected,
  onToggleSelect,
  onUngroup
}: SortableExerciseCardProps) {
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
        "group relative flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border bg-card",
        "hover:shadow-md transition-all",
        isDragging && "ring-2 ring-primary shadow-lg z-50",
        supersetInfo && `border-l-4 ${supersetInfo.color}`,
        isSelected && "ring-2 ring-primary"
      )}
    >
      {/* Selection checkbox */}
      {isSelecting && (
        <div className="flex items-center pt-2">
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={() => onToggleSelect(exercise.id)}
          />
        </div>
      )}

      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center h-8 sm:h-10 w-6 cursor-grab active:cursor-grabbing touch-manipulation"
      >
        <GripVertical className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-wrap">
            {supersetInfo && (
              <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0 bg-primary/10">
                {supersetInfo.label}
              </Badge>
            )}
            <Badge variant="outline" className={cn("text-[10px] sm:text-xs shrink-0", colorClass)}>
              {exerciseType}
            </Badge>
            <h4 className="font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{exercise.name}</h4>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {supersetInfo && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 sm:h-7 sm:w-7 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onUngroup(exercise.supersetGroupId!)}
                title={t('workoutBuilder.superset.ungroup', 'Ungroup')}
              >
                <Unlink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-7 sm:w-7 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            >
              {isEditing ? <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-7 sm:w-7 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              onClick={() => onRemove(exercise.id)}
            >
              <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          </div>
        </div>

        {isEditing ? (
          <div className="grid grid-cols-2 gap-2">
            {exercise.sets !== undefined && (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('customActivity.exercises.sets')}</label>
                  <Input
                    type="number"
                    value={editValues.sets}
                    onChange={(e) => setEditValues(prev => ({ ...prev, sets: parseInt(e.target.value) || 0 }))}
                    className="h-7 text-xs"
                    min={1}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('customActivity.exercises.reps')}</label>
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
                <label className="text-xs text-muted-foreground">{t('customActivity.exercises.duration')} (s)</label>
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
              <label className="text-xs text-muted-foreground">{t('customActivity.exercises.rest')} (s)</label>
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
            {(exercise.rest ?? 0) > 0 && !supersetInfo?.isFirst && (
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
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { setNodeRef, isOver } = useDroppable({
    id: 'workout-timeline',
  });

  // Calculate superset groups
  const supersetGroups = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};
    exercises.forEach(ex => {
      if (ex.supersetGroupId) {
        if (!groups[ex.supersetGroupId]) groups[ex.supersetGroupId] = [];
        groups[ex.supersetGroupId].push(ex);
      }
    });
    return groups;
  }, [exercises]);

  const getSupersetInfo = (exercise: Exercise) => {
    if (!exercise.supersetGroupId) return undefined;
    
    const group = supersetGroups[exercise.supersetGroupId];
    if (!group || group.length < 2) return undefined;
    
    const sortedGroup = [...group].sort((a, b) => (a.supersetOrder || 0) - (b.supersetOrder || 0));
    const index = sortedGroup.findIndex(ex => ex.id === exercise.id);
    const groupKeys = Object.keys(supersetGroups);
    const groupIndex = groupKeys.indexOf(exercise.supersetGroupId);
    
    return {
      label: `${String.fromCharCode(65 + groupIndex)}${index + 1}`,
      isFirst: index === 0,
      isLast: index === sortedGroup.length - 1,
      color: SUPERSET_COLORS[groupIndex % SUPERSET_COLORS.length],
    };
  };

  const handleUpdateExercise = (id: string, updates: Partial<Exercise>) => {
    onExercisesChange(
      exercises.map(ex => ex.id === id ? { ...ex, ...updates } : ex)
    );
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreateSuperset = () => {
    if (selectedIds.length < 2 || selectedIds.length > 3) return;
    
    const supersetGroupId = `superset-${Date.now()}`;
    onExercisesChange(
      exercises.map((ex, i) => {
        if (selectedIds.includes(ex.id)) {
          return {
            ...ex,
            supersetGroupId,
            supersetOrder: selectedIds.indexOf(ex.id) + 1,
          };
        }
        return ex;
      })
    );
    setSelectedIds([]);
    setIsSelecting(false);
  };

  const handleUngroup = (groupId: string) => {
    onExercisesChange(
      exercises.map(ex => {
        if (ex.supersetGroupId === groupId) {
          const { supersetGroupId, supersetOrder, ...rest } = ex;
          return rest as Exercise;
        }
        return ex;
      })
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
      <div className="p-2 sm:p-3 border-b space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-sm">{t('workoutBuilder.timeline')}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="whitespace-nowrap">
              <span className="hidden sm:inline">{t('workoutBuilder.estimatedDuration')}: </span>
              <strong className="text-foreground">{Math.round(totalDuration)} {t('workoutBuilder.minutes')}</strong>
            </span>
          </div>
        </div>

        {/* Superset controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!isSelecting ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setIsSelecting(true)}
              disabled={exercises.length < 2}
            >
              <Link2 className="h-3 w-3" />
              <span className="hidden xs:inline">{t('workoutBuilder.superset.createSuperset', 'Create Superset')}</span>
              <span className="xs:hidden">{t('workoutBuilder.superset.superset', 'Superset')}</span>
            </Button>
          ) : (
            <>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                <span className="hidden sm:inline">{t('workoutBuilder.superset.selectExercises', 'Select 2-3 exercises')}</span>
                <span className="sm:hidden">{t('common.select', 'Select')}</span> ({selectedIds.length}/3)
              </span>
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs"
                onClick={handleCreateSuperset}
                disabled={selectedIds.length < 2}
              >
                {t('workoutBuilder.superset.grouped', 'Group')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setIsSelecting(false); setSelectedIds([]); }}
              >
                {t('common.cancel')}
              </Button>
            </>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div
          ref={setNodeRef}
          className={cn(
            "p-2 sm:p-3 min-h-[200px] sm:min-h-[300px] transition-colors",
            isOver && "bg-primary/5 ring-2 ring-primary/20 ring-inset rounded-lg"
          )}
        >
          {exercises.length === 0 ? (
            <div className={cn(
              "flex flex-col items-center justify-center min-h-[180px] sm:min-h-[280px] border-2 border-dashed rounded-lg p-4",
              "text-muted-foreground",
              isOver ? "border-primary bg-primary/5" : "border-muted-foreground/20"
            )}>
              <Plus className="h-6 w-6 sm:h-8 sm:w-8 mb-2 opacity-50" />
              <p className="text-xs sm:text-sm font-medium text-center">{t('workoutBuilder.emptyTimeline')}</p>
              <p className="text-xs opacity-70 text-center hidden sm:block">{t('workoutBuilder.dragExercise')}</p>
              <p className="text-xs opacity-70 text-center sm:hidden">{t('workoutBuilder.tapToAddMobile', 'Tap Library to add exercises')}</p>
            </div>
          ) : (
            <SortableContext items={exercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {exercises.map((exercise, index) => {
                  const supersetInfo = getSupersetInfo(exercise);
                  return (
                    <div key={exercise.id} className="relative">
                      {index > 0 && !supersetInfo?.isFirst && (
                        <div className="absolute -top-1 left-3 sm:left-4 w-0.5 h-2 bg-border" />
                      )}
                      {/* Superset shared rest indicator */}
                      {supersetInfo?.isLast && (
                        <div className="absolute -bottom-3 left-4 sm:left-8 right-4 sm:right-8 flex items-center justify-center">
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {t('workoutBuilder.superset.sharedRest', 'Shared Rest')}: {exercise.rest || 60}s
                          </Badge>
                        </div>
                      )}
                      <SortableExerciseCard
                        exercise={exercise}
                        onUpdate={handleUpdateExercise}
                        onRemove={onRemoveExercise}
                        supersetInfo={supersetInfo}
                        isSelecting={isSelecting}
                        isSelected={selectedIds.includes(exercise.id)}
                        onToggleSelect={handleToggleSelect}
                        onUngroup={handleUngroup}
                      />
                      {index < exercises.length - 1 && !supersetInfo?.isFirst && (
                        <div className="absolute -bottom-1 left-3 sm:left-4 w-0.5 h-2 bg-border" />
                      )}
                    </div>
                  );
                })}
              </div>
            </SortableContext>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
