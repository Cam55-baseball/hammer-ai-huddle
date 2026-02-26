import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, Bell, Pencil, Dumbbell, X, Info, Utensils, Footprints, Pill, Target, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GamePlanTask } from '@/hooks/useGamePlan';
import { getActivityIcon } from '@/components/custom-activities';
import { CustomField, Exercise, MealData, RunningInterval, EmbeddedRunningSession, CustomActivityTemplate } from '@/types/customActivity';
import { ActivityFolderItem } from '@/types/activityFolder';
import { FolderItemPerformanceLogger } from '@/components/folders/FolderItemPerformanceLogger';
import { useScoutAccess } from '@/hooks/useScoutAccess';
import { SendToPlayerDialog } from '@/components/custom-activities/SendToPlayerDialog';

// Helper to get all checkable item IDs from a template
export const getAllCheckableIds = (template: CustomActivityTemplate): string[] => {
  const ids: string[] = [];
  
  // Custom field checkboxes (only checkbox type)
  const customFields = (template.custom_fields as CustomField[]) || [];
  customFields.filter(f => f.type === 'checkbox').forEach(f => ids.push(f.id));
  
  // Exercises - handle both traditional array and block-based format
  if (template.exercises && typeof template.exercises === 'object' && '_useBlocks' in (template.exercises as any)) {
    // Block-based workout system
    const blockData = template.exercises as unknown as { 
      _useBlocks: boolean; 
      blocks: Array<{ name: string; exercises: Exercise[] }> 
    };
    blockData.blocks?.forEach(block => {
      block.exercises?.forEach(e => ids.push(`exercise_${e.id}`));
    });
  } else if (Array.isArray(template.exercises)) {
    // Traditional exercise array
    (template.exercises as Exercise[]).forEach(e => ids.push(`exercise_${e.id}`));
  }
  
  // Meal items
  const meals = template.meals as MealData;
  if (meals?.items) meals.items.forEach(i => ids.push(`meal_${i.id}`));
  if (meals?.vitamins) meals.vitamins.forEach(v => ids.push(`vitamin_${v.id}`));
  if (meals?.supplements) meals.supplements.forEach(s => ids.push(`supplement_${s.id}`));
  
  // Running intervals
  const intervals = (template.intervals as RunningInterval[]) || [];
  intervals.forEach(i => ids.push(`interval_${i.id}`));
  
  // Embedded running sessions
  const runSessions = (template.embedded_running_sessions as EmbeddedRunningSession[]) || [];
  runSessions.forEach(r => ids.push(`running_${r.id}`));
  
  return ids;
};

// Block-based workout section component
interface BlockBasedWorkoutSectionProps {
  template: CustomActivityTemplate;
  customColor: string;
  getCheckboxState: (fieldId: string, defaultValue?: string) => boolean;
  handleToggleCheckbox: (fieldId: string, checked: boolean) => void;
  savingFieldIds: Set<string>;
  t: ReturnType<typeof useTranslation>['t'];
}

function BlockBasedWorkoutSection({ 
  template, 
  customColor, 
  getCheckboxState, 
  handleToggleCheckbox, 
  savingFieldIds,
  t 
}: BlockBasedWorkoutSectionProps) {
  // Check if this is a block-based workout
  if (!template.exercises || typeof template.exercises !== 'object' || !('_useBlocks' in (template.exercises as any))) {
    return null;
  }

  const blockData = template.exercises as unknown as { 
    _useBlocks: boolean; 
    blocks: Array<{ name: string; exercises: Exercise[] }> 
  };
  
  const totalExercises = blockData.blocks?.reduce((sum, b) => sum + (b.exercises?.length || 0), 0) || 0;
  
  if (totalExercises === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Dumbbell className="h-4 w-4" />
        {t('customActivity.exercises.title', 'Exercises')} ({totalExercises})
      </h4>
      {blockData.blocks?.map((block, blockIndex) => (
        block.exercises && block.exercises.length > 0 && (
          <div key={blockIndex} className="space-y-2">
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide"
              style={{ backgroundColor: `${customColor}30`, color: customColor }}
            >
              <Target className="h-3.5 w-3.5" />
              {block.name}
            </div>
            <div className="space-y-2 pl-2">
              {block.exercises.map((exercise) => {
                const fieldId = `exercise_${exercise.id}`;
                const isChecked = getCheckboxState(fieldId);
                return (
                  <div key={exercise.id} className="rounded-lg bg-muted p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => handleToggleCheckbox(fieldId, !!checked)}
                        disabled={savingFieldIds.has(fieldId)}
                        className={cn(
                          "mt-0.5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500",
                          savingFieldIds.has(fieldId) && "opacity-50"
                        )}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "font-medium text-sm",
                            isChecked && "line-through text-muted-foreground"
                          )}>
                            {exercise.name}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {exercise.type}
                          </Badge>
                        </div>
                        <div className={cn(
                          "flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground",
                          isChecked && "opacity-60"
                        )}>
                          {exercise.sets && <span>{exercise.sets} sets</span>}
                          {exercise.reps && <span>× {exercise.reps} reps</span>}
                          {exercise.weight && <span>@ {exercise.weight} {exercise.weightUnit || 'lbs'}</span>}
                          {exercise.rest && <span>• {exercise.rest}s rest</span>}
                          {exercise.duration && <span>• {exercise.duration}s</span>}
                        </div>
                        {exercise.notes && (
                          <p className={cn(
                            "text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5",
                            isChecked && "opacity-60"
                          )}>
                            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{exercise.notes}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ))}
    </div>
  );
}

interface CustomActivityDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: GamePlanTask | null;
  taskTime: string | null;
  taskReminder: number | null;
  onComplete: () => void;
  onEdit: () => void;
  onSaveTime: (time: string | null, reminder: number | null) => void;
  onToggleCheckbox?: (fieldId: string, checked: boolean) => void;
  onUpdateFieldValue?: (fieldId: string, value: string) => void;
  onSkipTask?: () => void;
  onSavePerformanceData?: (data: any) => Promise<void>;
}

export function CustomActivityDetailDialog({
  open,
  onOpenChange,
  task,
  taskTime,
  taskReminder,
  onComplete,
  onEdit,
  onSaveTime,
  onToggleCheckbox,
  onUpdateFieldValue,
  onSkipTask,
  onSavePerformanceData,
}: CustomActivityDetailDialogProps) {
  const { t } = useTranslation();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(taskTime || '');
  const [tempReminder, setTempReminder] = useState<number | null>(taskReminder);
  const [savingFieldIds, setSavingFieldIds] = useState<Set<string>>(new Set());
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [localFieldValues, setLocalFieldValues] = useState<Record<string, string>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const { canSendActivities, loading: accessLoading } = useScoutAccess();

  // Clean up debounce timers on unmount or dialog close
  useEffect(() => {
    if (!open) {
      Object.values(debounceTimers.current).forEach(clearTimeout);
      debounceTimers.current = {};
      setLocalFieldValues({});
    }
  }, [open]);

  if (!task || !task.customActivityData) return null;

  const template = task.customActivityData.template;
  const log = task.customActivityData.log;
  const IconComponent = getActivityIcon(template.icon);
  const customColor = template.color || '#10b981';

  // Get checkbox states from log's performance_data (resets daily) or fall back to template defaults
  const getCheckboxState = (fieldId: string, defaultValue?: string): boolean => {
    const performanceData = log?.performance_data as Record<string, any> | null;
    const checkboxStates = performanceData?.checkboxStates as Record<string, boolean> | undefined;
    if (checkboxStates && fieldId in checkboxStates) {
      return checkboxStates[fieldId];
    }
    return defaultValue === 'true';
  };

  // Get daily field value from performance_data.fieldValues, preferring local state during editing
  const getFieldValue = (fieldId: string, templateDefault?: string): string => {
    if (fieldId in localFieldValues) {
      return localFieldValues[fieldId];
    }
    const performanceData = log?.performance_data as Record<string, any> | null;
    const fieldValues = performanceData?.fieldValues as Record<string, string> | undefined;
    if (fieldValues && fieldId in fieldValues) {
      return fieldValues[fieldId];
    }
    return '';
  };

  // Debounced field change handler for text/number inputs
  const handleLocalFieldChange = (fieldId: string, value: string) => {
    setLocalFieldValues(prev => ({ ...prev, [fieldId]: value }));
    if (debounceTimers.current[fieldId]) {
      clearTimeout(debounceTimers.current[fieldId]);
    }
    debounceTimers.current[fieldId] = setTimeout(async () => {
      await handleUpdateFieldValue(fieldId, value);
      setLocalFieldValues(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
      delete debounceTimers.current[fieldId];
    }, 800);
  };

  const handleUpdateFieldValue = async (fieldId: string, value: string) => {
    if (!onUpdateFieldValue) return;
    setSavingFieldIds(prev => new Set(prev).add(fieldId));
    try {
      await onUpdateFieldValue(fieldId, value);
    } finally {
      setSavingFieldIds(prev => {
        const next = new Set(prev);
        next.delete(fieldId);
        return next;
      });
    }
  };

  // Calculate progress
  const allCheckableIds = getAllCheckableIds(template);
  const checkedCount = allCheckableIds.filter(id => getCheckboxState(id)).length;
  const totalCheckableCount = allCheckableIds.length;

  const formatTimeDisplay = (time: string | null) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const handleSaveTime = () => {
    onSaveTime(tempTime || null, tempReminder);
    setShowTimePicker(false);
  };

  const handleRemoveTime = () => {
    setTempTime('');
    setTempReminder(null);
    onSaveTime(null, null);
    setShowTimePicker(false);
  };

  const handleToggleCheckbox = async (fieldId: string, checked: boolean) => {
    if (!onToggleCheckbox) return;
    
    setSavingFieldIds(prev => new Set(prev).add(fieldId));
    try {
      await onToggleCheckbox(fieldId, checked);
    } finally {
      setSavingFieldIds(prev => {
        const next = new Set(prev);
        next.delete(fieldId);
        return next;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header with color accent */}
        <div 
          className="p-6 pb-4 flex-shrink-0"
          style={{ backgroundColor: `${customColor}20` }}
        >
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: customColor }}
              >
                <IconComponent className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-black text-foreground truncate">
                    {template.title}
                  </DialogTitle>
                  {totalCheckableCount > 0 && (
                    <Badge 
                      variant={checkedCount === totalCheckableCount ? "default" : "secondary"}
                      className={cn(
                        "text-xs font-bold",
                        checkedCount === totalCheckableCount && "bg-green-500"
                      )}
                    >
                      {checkedCount}/{totalCheckableCount}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t(`customActivity.types.${template.activity_type}`)}
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 pt-2 space-y-4">
            {/* Description */}
            {template.description && (
              <p className="text-sm text-muted-foreground">{template.description}</p>
            )}

            {/* Duration & Intensity */}
            <div className="flex flex-wrap gap-3">
              {template.duration_minutes && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {template.duration_minutes} {t('customActivity.minutes')}
                  </span>
                </div>
              )}
              {template.intensity && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
                  <Dumbbell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium capitalize">
                    {t(`customActivity.intensity.${template.intensity}`)}
                  </span>
                </div>
              )}
            </div>

            {/* Traditional Exercises Section */}
            {template.exercises && Array.isArray(template.exercises) && (template.exercises as Exercise[]).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Dumbbell className="h-4 w-4" />
                  {t('customActivity.exercises.title', 'Exercises')} ({(template.exercises as Exercise[]).length})
                </h4>
                <div className="space-y-2">
                  {(template.exercises as Exercise[]).map((exercise) => {
                    const fieldId = `exercise_${exercise.id}`;
                    const isChecked = getCheckboxState(fieldId);
                    return (
                      <div key={exercise.id} className="rounded-lg bg-muted p-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => handleToggleCheckbox(fieldId, !!checked)}
                            disabled={savingFieldIds.has(fieldId)}
                            className={cn(
                              "mt-0.5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500",
                              savingFieldIds.has(fieldId) && "opacity-50"
                            )}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                "font-medium text-sm",
                                isChecked && "line-through text-muted-foreground"
                              )}>
                                {exercise.name}
                              </span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {exercise.type}
                              </Badge>
                            </div>
                            <div className={cn(
                              "flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground",
                              isChecked && "opacity-60"
                            )}>
                              {exercise.sets && <span>{exercise.sets} sets</span>}
                              {exercise.reps && <span>× {exercise.reps} reps</span>}
                              {exercise.weight && <span>@ {exercise.weight} {exercise.weightUnit || 'lbs'}</span>}
                              {exercise.rest && <span>• {exercise.rest}s rest</span>}
                              {exercise.duration && <span>• {exercise.duration}s</span>}
                            </div>
                            {exercise.notes && (
                              <p className={cn(
                                "text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5",
                                isChecked && "opacity-60"
                              )}>
                                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>{exercise.notes}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Block-Based Workout Section */}
            <BlockBasedWorkoutSection 
              template={template} 
              customColor={customColor}
              getCheckboxState={getCheckboxState}
              handleToggleCheckbox={handleToggleCheckbox}
              savingFieldIds={savingFieldIds}
              t={t}
            />

            {/* Meal Items Section */}
            {template.meals && (template.meals as MealData).items && (template.meals as MealData).items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  {t('customActivity.meals.items', 'Meal Items')}
                </h4>
                <div className="space-y-2">
                  {(template.meals as MealData).items.map((item) => {
                    const fieldId = `meal_${item.id}`;
                    const isChecked = getCheckboxState(fieldId);
                    return (
                      <div key={item.id} className="rounded-lg bg-muted p-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => handleToggleCheckbox(fieldId, !!checked)}
                            disabled={savingFieldIds.has(fieldId)}
                            className={cn(
                              "mt-0.5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500",
                              savingFieldIds.has(fieldId) && "opacity-50"
                            )}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                "font-medium text-sm",
                                isChecked && "line-through text-muted-foreground"
                              )}>
                                {item.name}
                              </span>
                              {item.quantity && item.unit && (
                                <span className="text-xs text-muted-foreground">{item.quantity} {item.unit}</span>
                              )}
                            </div>
                            {(item.calories || item.protein || item.carbs || item.fats) && (
                              <div className={cn(
                                "flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground",
                                isChecked && "opacity-60"
                              )}>
                                {item.calories && <span>{item.calories} cal</span>}
                                {item.protein && <span>• {item.protein}g protein</span>}
                                {item.carbs && <span>• {item.carbs}g carbs</span>}
                                {item.fats && <span>• {item.fats}g fats</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vitamins Section */}
            {template.meals && (template.meals as MealData).vitamins && (template.meals as MealData).vitamins.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  {t('customActivity.meals.vitamins', 'Vitamins')}
                </h4>
                <div className="space-y-2">
                  {(template.meals as MealData).vitamins.map((vitamin) => {
                    const fieldId = `vitamin_${vitamin.id}`;
                    const isChecked = getCheckboxState(fieldId);
                    return (
                      <div key={vitamin.id} className="flex items-center gap-3 rounded-lg bg-muted p-2.5">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => handleToggleCheckbox(fieldId, !!checked)}
                          disabled={savingFieldIds.has(fieldId)}
                          className={cn(
                            "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500",
                            savingFieldIds.has(fieldId) && "opacity-50"
                          )}
                        />
                        <span className={cn(
                          "text-sm",
                          isChecked && "line-through text-muted-foreground"
                        )}>
                          {vitamin.name} {vitamin.dosage && `(${vitamin.dosage})`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Supplements Section */}
            {template.meals && (template.meals as MealData).supplements && (template.meals as MealData).supplements.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  {t('customActivity.meals.supplements', 'Supplements')}
                </h4>
                <div className="space-y-2">
                  {(template.meals as MealData).supplements.map((supplement) => {
                    const fieldId = `supplement_${supplement.id}`;
                    const isChecked = getCheckboxState(fieldId);
                    return (
                      <div key={supplement.id} className="flex items-center gap-3 rounded-lg bg-muted p-2.5">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => handleToggleCheckbox(fieldId, !!checked)}
                          disabled={savingFieldIds.has(fieldId)}
                          className={cn(
                            "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500",
                            savingFieldIds.has(fieldId) && "opacity-50"
                          )}
                        />
                        <span className={cn(
                          "text-sm",
                          isChecked && "line-through text-muted-foreground"
                        )}>
                          {supplement.name} {supplement.dosage && `(${supplement.dosage})`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Running Intervals Section */}
            {template.intervals && Array.isArray(template.intervals) && (template.intervals as RunningInterval[]).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Footprints className="h-4 w-4" />
                  {t('customActivity.running.intervals', 'Intervals')}
                </h4>
                <div className="space-y-2">
                  {(template.intervals as RunningInterval[]).map((interval) => {
                    const fieldId = `interval_${interval.id}`;
                    const isChecked = getCheckboxState(fieldId);
                    return (
                      <div key={interval.id} className="rounded-lg bg-muted p-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => handleToggleCheckbox(fieldId, !!checked)}
                            disabled={savingFieldIds.has(fieldId)}
                            className={cn(
                              "mt-0.5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500",
                              savingFieldIds.has(fieldId) && "opacity-50"
                            )}
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <span className={cn(
                              "font-medium text-sm capitalize",
                              isChecked && "line-through text-muted-foreground"
                            )}>
                              {interval.type}
                            </span>
                            <div className={cn(
                              "flex gap-2 text-xs text-muted-foreground",
                              isChecked && "opacity-60"
                            )}>
                              {interval.duration && <span>{Math.floor(interval.duration / 60)}:{String(interval.duration % 60).padStart(2, '0')}</span>}
                              {interval.distance && <span>{interval.distance} {interval.distanceUnit}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Embedded Running Sessions Section */}
            {template.embedded_running_sessions && Array.isArray(template.embedded_running_sessions) && (template.embedded_running_sessions as EmbeddedRunningSession[]).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {t('customActivity.running.goals', 'Running Goals')}
                </h4>
                <div className="space-y-2">
                  {(template.embedded_running_sessions as EmbeddedRunningSession[]).map((session) => {
                    const fieldId = `running_${session.id}`;
                    const isChecked = getCheckboxState(fieldId);
                    return (
                      <div key={session.id} className="rounded-lg bg-muted p-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => handleToggleCheckbox(fieldId, !!checked)}
                            disabled={savingFieldIds.has(fieldId)}
                            className={cn(
                              "mt-0.5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500",
                              savingFieldIds.has(fieldId) && "opacity-50"
                            )}
                          />
                          <div className={cn(
                            "flex flex-wrap gap-3 text-sm flex-1",
                            isChecked && "opacity-60"
                          )}>
                            {session.distance_value && (
                              <span className={cn(
                                "font-medium",
                                isChecked && "line-through text-muted-foreground"
                              )}>
                                {session.distance_value} {session.distance_unit}
                              </span>
                            )}
                            {session.time_goal && (
                              <span className="text-muted-foreground">Goal: {session.time_goal}</span>
                            )}
                            {session.pace_goal && (
                              <span className="text-muted-foreground">Pace: {session.pace_goal}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Log Sets - conditional for exercise/skill_work types */}
            {(template.activity_type === 'workout' || template.activity_type === 'practice' || template.activity_type === 'free_session') && onSavePerformanceData && (
              <FolderItemPerformanceLogger
                item={{
                  id: template.id,
                  folder_id: '',
                  title: template.title,
                  description: template.description,
                  item_type: template.activity_type,
                  assigned_days: null,
                  cycle_week: null,
                  order_index: 0,
                  exercises: template.exercises as any,
                  attachments: null,
                  duration_minutes: template.duration_minutes || null,
                  notes: null,
                  completion_tracking: true,
                  specific_dates: null,
                  created_at: template.created_at || '',
                }}
                performanceData={(log?.performance_data as any) || undefined}
                onSave={onSavePerformanceData}
              />
            )}

            {/* Custom Fields - Always visible, no accordion */}
            {template.custom_fields && Array.isArray(template.custom_fields) && template.custom_fields.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground">
                  {t('customActivity.customFields.title', 'Tasks')}
                </h4>
                <div className="space-y-2">
                  {(template.custom_fields as CustomField[]).map((field) => (
                    <div 
                      key={field.id} 
                      className="rounded-lg bg-muted p-3"
                    >
                      {/* Field content */}
                      <div className="flex items-start gap-3">
                        {field.type === 'checkbox' ? (
                          <Checkbox
                            checked={getCheckboxState(field.id, field.value)}
                            onCheckedChange={(checked) => handleToggleCheckbox(field.id, !!checked)}
                            disabled={savingFieldIds.has(field.id)}
                            className={cn(
                              "mt-0.5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500",
                              savingFieldIds.has(field.id) && "opacity-50"
                            )}
                          />
                        ) : null}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn(
                              "text-sm font-medium",
                              field.type === 'checkbox' && getCheckboxState(field.id, field.value) && "line-through text-muted-foreground"
                            )}>
                              {field.label}
                            </span>
                            {field.type !== 'checkbox' && (
                              field.type === 'time' ? (
                                <Input
                                  type="time"
                                  value={getFieldValue(field.id)}
                                  onChange={(e) => handleUpdateFieldValue(field.id, e.target.value)}
                                  placeholder={field.value || '—'}
                                  disabled={savingFieldIds.has(field.id)}
                                  className="h-7 w-28 text-sm font-mono text-primary"
                                />
                              ) : field.type === 'number' ? (
                                <Input
                                  type="number"
                                  value={getFieldValue(field.id)}
                                  onChange={(e) => handleLocalFieldChange(field.id, e.target.value)}
                                  placeholder={field.value || t('customActivity.customFields.numberPlaceholder', 'e.g. 4.2')}
                                  disabled={savingFieldIds.has(field.id)}
                                  className="h-7 w-28 text-sm"
                                />
                              ) : (
                                <Input
                                  type="text"
                                  value={getFieldValue(field.id)}
                                  onChange={(e) => handleLocalFieldChange(field.id, e.target.value)}
                                  placeholder={field.value || t('customActivity.customFields.valuePlaceholder', 'Value...')}
                                  disabled={savingFieldIds.has(field.id)}
                                  className="h-7 w-32 text-sm"
                                />
                              )
                            )}
                          </div>
                          {/* Notes always visible when present */}
                          {field.notes && (
                            <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5">
                              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{field.notes}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scheduled Time Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {t('customActivity.detail.scheduledFor')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTempTime(taskTime || '');
                    setTempReminder(taskReminder);
                    setShowTimePicker(!showTimePicker);
                  }}
                  className="text-primary h-8"
                >
                  {showTimePicker ? <X className="h-4 w-4" /> : <Clock className="h-4 w-4 mr-1" />}
                  {showTimePicker ? t('common.cancel') : taskTime ? t('common.edit') : t('gamePlan.startTime.tapToSet')}
                </Button>
              </div>

              {/* Current time display */}
              {taskTime && !showTimePicker && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium text-primary">{formatTimeDisplay(taskTime)}</span>
                  {taskReminder && (
                    <div className="flex items-center gap-1 ml-auto text-xs text-muted-foreground">
                      <Bell className="h-3 w-3" />
                      {t('gamePlan.reminder.minutesBefore', { minutes: taskReminder })}
                    </div>
                  )}
                </div>
              )}

              {!taskTime && !showTimePicker && (
                <p className="text-sm text-muted-foreground italic">
                  {t('customActivity.detail.noTimeSet')}
                </p>
              )}

              {/* Inline time picker */}
              <AnimatePresence>
                {showTimePicker && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground">
                          {t('gamePlan.startTime.time')}
                        </label>
                        <Input
                          type="time"
                          value={tempTime}
                          onChange={(e) => setTempTime(e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground">
                          {t('gamePlan.reminder.remindMe')}
                        </label>
                        <Select 
                          value={tempReminder?.toString() || 'none'} 
                          onValueChange={(v) => setTempReminder(v === 'none' ? null : parseInt(v))}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder={t('gamePlan.reminder.noReminder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('gamePlan.reminder.noReminder')}</SelectItem>
                            <SelectItem value="5">{t('gamePlan.reminder.minutesBefore', { minutes: 5 })}</SelectItem>
                            <SelectItem value="10">{t('gamePlan.reminder.minutesBefore', { minutes: 10 })}</SelectItem>
                            <SelectItem value="15">{t('gamePlan.reminder.minutesBefore', { minutes: 15 })}</SelectItem>
                            <SelectItem value="20">{t('gamePlan.reminder.minutesBefore', { minutes: 20 })}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 pt-2">
                        {taskTime && (
                          <Button variant="outline" size="sm" onClick={handleRemoveTime} className="flex-1">
                            {t('gamePlan.startTime.removeTime')}
                          </Button>
                        )}
                        <Button size="sm" onClick={handleSaveTime} className="flex-1">
                          {t('common.save')}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4 border-t">
              {/* Send to Player button - only for coaches/scouts */}
              {(canSendActivities || accessLoading) && (
                <Button
                  variant="outline"
                  onClick={() => setSendDialogOpen(true)}
                  disabled={accessLoading}
                  className="w-full gap-2 border-primary/50 text-primary hover:bg-primary/10"
                >
                  <Send className="h-4 w-4" />
                  {t('sentActivity.sendToPlayer', 'Send to Player')}
                </Button>
              )}
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onEdit}
                  className="flex-1 gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  {t('customActivity.detail.editActivity')}
                </Button>
                <Button
                  onClick={() => {
                    onComplete();
                    onOpenChange(false);
                  }}
                  className={cn(
                    "flex-1 gap-2 font-bold",
                    task.completed 
                      ? "bg-muted text-muted-foreground hover:bg-muted" 
                      : ""
                  )}
                  style={!task.completed ? { backgroundColor: customColor } : undefined}
                >
                  <Check className="h-4 w-4" />
                  {task.completed 
                    ? t('customActivity.detail.markedComplete') 
                    : t('customActivity.detail.markComplete')
                  }
                </Button>
              </div>
              {onSkipTask && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onSkipTask();
                    onOpenChange(false);
                  }}
                  className="w-full gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400 dark:border-amber-400/50"
                >
                  <X className="h-4 w-4" />
                  {t('gamePlan.skipForToday', 'Skip for Today')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Send Dialog */}
      <SendToPlayerDialog 
        open={sendDialogOpen} 
        onOpenChange={setSendDialogOpen} 
        template={template} 
      />
    </Dialog>
  );
}