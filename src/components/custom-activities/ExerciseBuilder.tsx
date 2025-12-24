import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Exercise } from '@/types/customActivity';
import { cn } from '@/lib/utils';

interface ExerciseBuilderProps {
  exercises: Exercise[];
  onChange: (exercises: Exercise[]) => void;
}

const EXERCISE_TYPES = ['strength', 'cardio', 'flexibility', 'plyometric', 'other'] as const;

export function ExerciseBuilder({ exercises, onChange }: ExerciseBuilderProps) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addExercise = () => {
    const newExercise: Exercise = {
      id: crypto.randomUUID(),
      name: '',
      type: 'strength',
      sets: 3,
      reps: 10,
      rest: 60,
      intensity: 70,
    };
    onChange([...exercises, newExercise]);
    setExpandedId(newExercise.id);
  };

  const updateExercise = (id: string, updates: Partial<Exercise>) => {
    onChange(exercises.map(ex => ex.id === id ? { ...ex, ...updates } : ex));
  };

  const removeExercise = (id: string) => {
    onChange(exercises.filter(ex => ex.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= exercises.length) return;
    
    const newExercises = [...exercises];
    [newExercises[index], newExercises[newIndex]] = [newExercises[newIndex], newExercises[index]];
    onChange(newExercises);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-bold">
          {t('customActivity.exercises.title')} ({exercises.length})
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addExercise}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          {t('customActivity.exercises.add')}
        </Button>
      </div>

      <div className="space-y-2">
        {exercises.map((exercise, index) => (
          <div
            key={exercise.id}
            className={cn(
              "border rounded-lg bg-background/50 transition-all duration-200",
              expandedId === exercise.id ? "border-primary" : "border-border/50"
            )}
          >
            {/* Collapsed Header */}
            <div 
              className="flex items-center gap-2 p-3 cursor-pointer"
              onClick={() => setExpandedId(expandedId === exercise.id ? null : exercise.id)}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <Input
                  value={exercise.name}
                  onChange={(e) => updateExercise(exercise.id, { name: e.target.value })}
                  placeholder={t('customActivity.exercises.namePlaceholder')}
                  className="h-8 text-sm font-medium"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                {exercise.sets && exercise.reps && (
                  <span className="px-2 py-0.5 rounded bg-muted">
                    {exercise.sets}×{exercise.reps}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); moveExercise(index, 'up'); }}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); moveExercise(index, 'down'); }}
                  disabled={index === exercises.length - 1}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); removeExercise(exercise.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedId === exercise.id && (
              <div className="px-3 pb-3 space-y-4 border-t border-border/50 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('customActivity.exercises.type')}</Label>
                    <Select
                      value={exercise.type}
                      onValueChange={(value) => updateExercise(exercise.id, { type: value as Exercise['type'] })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXERCISE_TYPES.map(type => (
                          <SelectItem key={type} value={type}>
                            {t(`customActivity.exercises.types.${type}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">{t('customActivity.fields.sets')}</Label>
                    <Input
                      type="number"
                      value={exercise.sets || ''}
                      onChange={(e) => updateExercise(exercise.id, { sets: parseInt(e.target.value) || undefined })}
                      className="h-9"
                      min={1}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('customActivity.fields.reps')}</Label>
                    <Input
                      value={exercise.reps || ''}
                      onChange={(e) => updateExercise(exercise.id, { reps: e.target.value })}
                      placeholder="10 or 8-12"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">{t('customActivity.fields.rest')} (sec)</Label>
                    <Input
                      type="number"
                      value={exercise.rest || ''}
                      onChange={(e) => updateExercise(exercise.id, { rest: parseInt(e.target.value) || undefined })}
                      className="h-9"
                      min={0}
                      step={15}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('customActivity.fields.intensity')}</Label>
                    <span className="text-xs font-bold text-primary">{exercise.intensity || 0}%</span>
                  </div>
                  <Slider
                    value={[exercise.intensity || 0]}
                    onValueChange={([value]) => updateExercise(exercise.id, { intensity: value })}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('customActivity.exercises.weight')}</Label>
                    <Input
                      type="number"
                      value={exercise.weight || ''}
                      onChange={(e) => updateExercise(exercise.id, { weight: parseFloat(e.target.value) || undefined })}
                      className="h-9"
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('customActivity.exercises.weightUnit')}</Label>
                    <Select
                      value={exercise.weightUnit || 'lbs'}
                      onValueChange={(value) => updateExercise(exercise.id, { weightUnit: value as 'lbs' | 'kg' })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lbs">lbs</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">{t('customActivity.fields.notes')}</Label>
                  <Textarea
                    value={exercise.notes || ''}
                    onChange={(e) => updateExercise(exercise.id, { notes: e.target.value })}
                    placeholder={t('customActivity.exercises.notesPlaceholder')}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {exercises.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('customActivity.exercises.empty')}
          </div>
        )}
      </div>
    </div>
  );
}
