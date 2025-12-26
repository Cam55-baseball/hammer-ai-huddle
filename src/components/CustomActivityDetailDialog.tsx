import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, Bell, Pencil, Dumbbell, X, Info, Utensils, Footprints, Pill, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GamePlanTask } from '@/hooks/useGamePlan';
import { getActivityIcon } from '@/components/custom-activities';
import { CustomField, Exercise, MealData, RunningInterval, EmbeddedRunningSession } from '@/types/customActivity';

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
}: CustomActivityDetailDialogProps) {
  const { t } = useTranslation();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(taskTime || '');
  const [tempReminder, setTempReminder] = useState<number | null>(taskReminder);
  const [savingFieldIds, setSavingFieldIds] = useState<Set<string>>(new Set());

  if (!task || !task.customActivityData) return null;

  const template = task.customActivityData.template;
  const log = task.customActivityData.log;
  const IconComponent = getActivityIcon(template.icon);
  const customColor = template.color || '#10b981';

  // Get checkbox states from log's performance_data (resets daily) or fall back to template defaults
  const getCheckboxState = (fieldId: string, defaultValue: string): boolean => {
    const performanceData = log?.performance_data as Record<string, any> | null;
    const checkboxStates = performanceData?.checkboxStates as Record<string, boolean> | undefined;
    if (checkboxStates && fieldId in checkboxStates) {
      return checkboxStates[fieldId];
    }
    return defaultValue === 'true';
  };

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
                <DialogTitle className="text-xl font-black text-foreground truncate">
                  {template.title}
                </DialogTitle>
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

            {/* Exercises Section */}
            {template.exercises && Array.isArray(template.exercises) && (template.exercises as Exercise[]).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Dumbbell className="h-4 w-4" />
                  {t('customActivity.exercises.title', 'Exercises')} ({(template.exercises as Exercise[]).length})
                </h4>
                <div className="space-y-2">
                  {(template.exercises as Exercise[]).map((exercise) => (
                    <div key={exercise.id} className="rounded-lg bg-muted p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{exercise.name}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {exercise.type}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                        {exercise.sets && <span>{exercise.sets} sets</span>}
                        {exercise.reps && <span>× {exercise.reps} reps</span>}
                        {exercise.weight && <span>@ {exercise.weight} {exercise.weightUnit || 'lbs'}</span>}
                        {exercise.rest && <span>• {exercise.rest}s rest</span>}
                        {exercise.duration && <span>• {exercise.duration}s</span>}
                      </div>
                      {exercise.notes && (
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5">
                          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{exercise.notes}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meal Items Section */}
            {template.meals && (template.meals as MealData).items && (template.meals as MealData).items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  {t('customActivity.meals.items', 'Meal Items')}
                </h4>
                <div className="space-y-2">
                  {(template.meals as MealData).items.map((item) => (
                    <div key={item.id} className="rounded-lg bg-muted p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{item.name}</span>
                        {item.quantity && item.unit && (
                          <span className="text-xs text-muted-foreground">{item.quantity} {item.unit}</span>
                        )}
                      </div>
                      {(item.calories || item.protein || item.carbs || item.fats) && (
                        <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                          {item.calories && <span>{item.calories} cal</span>}
                          {item.protein && <span>• {item.protein}g protein</span>}
                          {item.carbs && <span>• {item.carbs}g carbs</span>}
                          {item.fats && <span>• {item.fats}g fats</span>}
                        </div>
                      )}
                    </div>
                  ))}
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
                <div className="flex flex-wrap gap-2">
                  {(template.meals as MealData).vitamins.map((vitamin) => (
                    <Badge key={vitamin.id} variant="secondary" className="text-xs">
                      {vitamin.name} {vitamin.dosage && `(${vitamin.dosage})`}
                    </Badge>
                  ))}
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
                <div className="flex flex-wrap gap-2">
                  {(template.meals as MealData).supplements.map((supplement) => (
                    <Badge key={supplement.id} variant="secondary" className="text-xs">
                      {supplement.name} {supplement.dosage && `(${supplement.dosage})`}
                    </Badge>
                  ))}
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
                  {(template.intervals as RunningInterval[]).map((interval) => (
                    <div key={interval.id} className="rounded-lg bg-muted p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm capitalize">{interval.type}</span>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {interval.duration && <span>{Math.floor(interval.duration / 60)}:{String(interval.duration % 60).padStart(2, '0')}</span>}
                          {interval.distance && <span>{interval.distance} {interval.distanceUnit}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
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
                  {(template.embedded_running_sessions as EmbeddedRunningSession[]).map((session) => (
                    <div key={session.id} className="rounded-lg bg-muted p-3">
                      <div className="flex flex-wrap gap-3 text-sm">
                        {session.distance_value && (
                          <span className="font-medium">{session.distance_value} {session.distance_unit}</span>
                        )}
                        {session.time_goal && (
                          <span className="text-muted-foreground">Goal: {session.time_goal}</span>
                        )}
                        {session.pace_goal && (
                          <span className="text-muted-foreground">Pace: {session.pace_goal}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                                <span className="text-sm font-mono text-primary">{field.value || '—'}</span>
                              ) : field.type === 'number' ? (
                                <Badge variant="outline">{field.value || '—'}</Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground truncate max-w-[120px]">{field.value || '—'}</span>
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
            <div className="flex gap-3 pt-4 border-t">
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
                    : "bg-green-600 hover:bg-green-700 text-white"
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}