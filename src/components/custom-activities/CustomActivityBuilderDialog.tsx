import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Star, Save, Trash2, ChevronDown, Footprints, Plus, X, Bell, Image, CalendarPlus, Loader2, Lock, Layers, CalendarDays } from 'lucide-react';
import { LogoUploadButton } from './LogoUploadButton';
import { ActivityTypeSelector } from './ActivityTypeSelector';
import { IconPicker } from './IconPicker';
import { ColorPicker } from './ColorPicker';
import { RecurringDayPicker } from './RecurringDayPicker';
import { ExerciseBuilder } from './ExerciseBuilder';
import { DragDropExerciseBuilder } from './DragDropExerciseBuilder';
import { MealBuilder } from './MealBuilder';
import { CustomFieldsBuilder } from './CustomFieldsBuilder';
import { WarmupGeneratorCard } from './WarmupGeneratorCard';
import { BlockContainer } from '@/components/elite-workout/blocks/BlockContainer';
import { ViewModeToggle } from '@/components/elite-workout/views/ViewModeToggle';
import { CNSLoadIndicator } from '@/components/elite-workout/intelligence/CNSLoadIndicator';
import { WorkoutBlock, ViewMode } from '@/types/eliteWorkout';
import { calculateWorkoutCNS } from '@/utils/loadCalculation';
import { CustomActivityTemplate, ActivityType, IntensityLevel, Exercise, MealData, CustomField, RunningInterval, EmbeddedRunningSession } from '@/types/customActivity';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type LockableField = 
  | 'title' 
  | 'description' 
  | 'type' 
  | 'timing' 
  | 'exercises' 
  | 'meals' 
  | 'running' 
  | 'custom_fields' 
  | 'schedule' 
  | 'appearance';

interface CustomActivityBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: CustomActivityTemplate | null;
  presetActivityType?: ActivityType | null;
  onSave: (data: Omit<CustomActivityTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>, scheduleForToday?: boolean) => Promise<any>;
  onDelete?: (id: string) => Promise<boolean>;
  selectedSport: 'baseball' | 'softball';
  // Coach-sent activity props
  lockedFields?: LockableField[];
  isFromCoach?: boolean;
  coachName?: string;
}

const INTENSITY_OPTIONS: IntensityLevel[] = ['light', 'moderate', 'high', 'max'];
const DISTANCE_UNITS = ['feet', 'yards', 'meters', 'miles', 'kilometers'] as const;
type ScheduleMode = 'none' | 'weekly' | 'specific_date';

const createEmptyRunningSession = (): EmbeddedRunningSession => ({
  id: crypto.randomUUID(),
  distance_value: undefined,
  distance_unit: 'miles',
  time_goal: undefined,
  pace_goal: undefined,
});

export function CustomActivityBuilderDialog({
  open,
  onOpenChange,
  template,
  presetActivityType,
  onSave,
  onDelete,
  selectedSport,
  lockedFields = [],
  isFromCoach = false,
  coachName,
}: CustomActivityBuilderDialogProps) {
  const { t } = useTranslation();
  const isEditing = !!template;

  // Helper to check if a field is locked
  const isFieldLocked = (field: LockableField): boolean => lockedFields.includes(field);

  const [activityType, setActivityType] = useState<ActivityType | null>(template?.activity_type || presetActivityType || null);
  const [title, setTitle] = useState(template?.title || '');
  const [description, setDescription] = useState(template?.description || '');
  const [icon, setIcon] = useState(template?.icon || 'dumbbell');
  const [color, setColor] = useState(template?.color || '#8b5cf6');
  const [exercises, setExercises] = useState<Exercise[]>(template?.exercises || []);
  const [meals, setMeals] = useState<MealData>(template?.meals || { items: [], vitamins: [], supplements: [], hydration: { amount: 0, unit: 'oz', goal: 64 } });
  const [customFields, setCustomFields] = useState<CustomField[]>(template?.custom_fields || []);
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(template?.duration_minutes);
  const [intensity, setIntensity] = useState<IntensityLevel | undefined>(template?.intensity);
  const [distanceValue, setDistanceValue] = useState<number | undefined>(template?.distance_value);
  const [distanceUnit, setDistanceUnit] = useState<string>(template?.distance_unit || 'miles');
  const [isFavorited, setIsFavorited] = useState(template?.is_favorited || false);
  const [recurringDays, setRecurringDays] = useState<number[]>(template?.recurring_days || []);
  const [recurringActive, setRecurringActive] = useState(template?.recurring_active || false);
  const [saving, setSaving] = useState(false);
  
  // Card customization fields
  const [displayNickname, setDisplayNickname] = useState(template?.display_nickname || '');
  const [customLogoUrl, setCustomLogoUrl] = useState(template?.custom_logo_url || '');
  
  // Reminder fields
  const [reminderEnabled, setReminderEnabled] = useState(template?.reminder_enabled || false);
  const [reminderTime, setReminderTime] = useState(template?.reminder_time || '08:00');
  
  // Running-specific fields
  const [timeGoalHours, setTimeGoalHours] = useState<number | undefined>();
  const [timeGoalMinutes, setTimeGoalMinutes] = useState<number | undefined>();
  const [timeGoalSeconds, setTimeGoalSeconds] = useState<number | undefined>();
  const [timeGoalTenths, setTimeGoalTenths] = useState<number | undefined>();
  const [paceGoal, setPaceGoal] = useState<string>('');
  
  // Multiple embedded running sessions for non-running activity types
  const [showRunningSessions, setShowRunningSessions] = useState(false);
  const [embeddedRunningSessions, setEmbeddedRunningSessions] = useState<EmbeddedRunningSession[]>([]);
  
  // Schedule for today toggle (only for new activities)
  const [scheduleForToday, setScheduleForToday] = useState(false);
  
  // Schedule mode state
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('none');
  const [specificDates, setSpecificDates] = useState<Date[]>([]);
  
  // Elite Workout Block System state
  const [useBlockSystem, setUseBlockSystem] = useState(false);
  const [workoutBlocks, setWorkoutBlocks] = useState<WorkoutBlock[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('execute');

  useEffect(() => {
    if (template) {
      setActivityType(template.activity_type);
      setTitle(template.title);
      setDescription(template.description || '');
      setIcon(template.icon);
      setColor(template.color);
      setExercises(template.exercises || []);
      setMeals(template.meals || { items: [], vitamins: [], supplements: [], hydration: { amount: 0, unit: 'oz', goal: 64 } });
      setCustomFields(template.custom_fields || []);
      setDurationMinutes(template.duration_minutes);
      setIntensity(template.intensity);
      setDistanceValue(template.distance_value);
      setDistanceUnit(template.distance_unit || 'miles');
      setIsFavorited(template.is_favorited);
      setRecurringDays(template.recurring_days || []);
      setRecurringActive(template.recurring_active);
      // Initialize schedule mode from template
      if (template.specific_dates && template.specific_dates.length > 0) {
        setScheduleMode('specific_date');
        setSpecificDates(template.specific_dates.map(d => new Date(d + 'T00:00:00')));
      } else if (template.recurring_active) {
        setScheduleMode('weekly');
        setSpecificDates([]);
      } else {
        setScheduleMode('none');
        setSpecificDates([]);
      }
      setDisplayNickname(template.display_nickname || '');
      setCustomLogoUrl(template.custom_logo_url || '');
      setReminderEnabled(template.reminder_enabled || false);
      setReminderTime(template.reminder_time || '08:00');
      // Parse time goal if stored in pace_value (format: H:MM:SS.T)
      if (template.pace_value && template.pace_value.includes(':')) {
        const [timePart, tenthsPart] = template.pace_value.split('.');
        const parts = timePart.split(':');
        if (parts.length === 3) {
          setTimeGoalHours(parseInt(parts[0]) || undefined);
          setTimeGoalMinutes(parseInt(parts[1]) || undefined);
          setTimeGoalSeconds(parseInt(parts[2]) || undefined);
          setTimeGoalTenths(parseInt(tenthsPart) || undefined);
        }
      }
      // Parse embedded running sessions (support both old single and new array format)
      if (template.embedded_running_sessions && template.embedded_running_sessions.length > 0) {
        setShowRunningSessions(true);
        setEmbeddedRunningSessions(template.embedded_running_sessions);
      } else if (template.embedded_running) {
        // Migration from old single embedded_running to array
        setShowRunningSessions(true);
        setEmbeddedRunningSessions([{
          id: crypto.randomUUID(),
          distance_value: template.embedded_running.distance_value,
          distance_unit: template.embedded_running.distance_unit || 'miles',
          time_goal: template.embedded_running.time_goal,
          pace_goal: template.embedded_running.pace_goal,
        }]);
      } else {
        setShowRunningSessions(false);
        setEmbeddedRunningSessions([]);
      }
      // Parse block-based exercises
      if (template.exercises && typeof template.exercises === 'object' && '_useBlocks' in (template.exercises as any)) {
        const exercisesData = template.exercises as any;
        setUseBlockSystem(true);
        setWorkoutBlocks(exercisesData.blocks || []);
      } else {
        setUseBlockSystem(false);
        setWorkoutBlocks([]);
      }
    } else if (presetActivityType) {
      setActivityType(presetActivityType);
      setTitle('');
      setDescription('');
      setIcon(presetActivityType === 'meal' ? 'utensils' : 'dumbbell');
      setColor(presetActivityType === 'meal' ? '#10b981' : '#8b5cf6');
      setExercises([]);
      setMeals({ items: [], vitamins: [], supplements: [], hydration: { amount: 0, unit: 'oz', goal: 64 } });
      setCustomFields([]);
      setDurationMinutes(undefined);
      setIntensity(undefined);
      setDistanceValue(undefined);
      setDistanceUnit('miles');
      setIsFavorited(false);
      setRecurringDays([]);
      setRecurringActive(false);
      setScheduleMode('none');
      setSpecificDates([]);
      setDisplayNickname('');
      setCustomLogoUrl('');
      setReminderEnabled(false);
      setReminderTime('08:00');
      setTimeGoalHours(undefined);
      setTimeGoalMinutes(undefined);
      setTimeGoalSeconds(undefined);
      setTimeGoalTenths(undefined);
      setPaceGoal('');
      setShowRunningSessions(false);
      setEmbeddedRunningSessions([]);
      setScheduleForToday(false);
      setUseBlockSystem(false);
      setWorkoutBlocks([]);
      setViewMode('execute');
    } else {
      setActivityType(null);
      setTitle('');
      setDescription('');
      setIcon('dumbbell');
      setColor('#8b5cf6');
      setExercises([]);
      setMeals({ items: [], vitamins: [], supplements: [], hydration: { amount: 0, unit: 'oz', goal: 64 } });
      setCustomFields([]);
      setDurationMinutes(undefined);
      setIntensity(undefined);
      setDistanceValue(undefined);
      setDistanceUnit('miles');
      setIsFavorited(false);
      setRecurringDays([]);
      setRecurringActive(false);
      setScheduleMode('none');
      setSpecificDates([]);
      setDisplayNickname('');
      setCustomLogoUrl('');
      setReminderEnabled(false);
      setReminderTime('08:00');
      setTimeGoalHours(undefined);
      setTimeGoalMinutes(undefined);
      setTimeGoalSeconds(undefined);
      setTimeGoalTenths(undefined);
      setPaceGoal('');
      setShowRunningSessions(false);
      setEmbeddedRunningSessions([]);
      setScheduleForToday(false);
      setUseBlockSystem(false);
      setWorkoutBlocks([]);
      setViewMode('execute');
    }
  }, [template, presetActivityType, open]);

  const addRunningSession = () => {
    setEmbeddedRunningSessions(prev => [...prev, createEmptyRunningSession()]);
    setShowRunningSessions(true);
  };

  const removeRunningSession = (id: string) => {
    setEmbeddedRunningSessions(prev => prev.filter(s => s.id !== id));
  };

  const updateRunningSession = (id: string, updates: Partial<EmbeddedRunningSession>) => {
    setEmbeddedRunningSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleSave = async () => {
    if (!activityType) {
      toast.error(t('customActivity.selectTypeRequired', 'Please select an activity type'));
      return;
    }
    if (!title.trim()) {
      toast.error(t('customActivity.titleRequired', 'Please enter a title'));
      return;
    }
    
    setSaving(true);
    
    // Combine time goal into pace_value (format: H:MM:SS.T)
    let paceValue: string | undefined;
    if (timeGoalHours || timeGoalMinutes || timeGoalSeconds || timeGoalTenths) {
      const timeStr = `${timeGoalHours || 0}:${String(timeGoalMinutes || 0).padStart(2, '0')}:${String(timeGoalSeconds || 0).padStart(2, '0')}`;
      paceValue = timeGoalTenths ? `${timeStr}.${timeGoalTenths}` : timeStr;
    }
    
    // Build embedded running sessions if any
    const runningSessions = activityType !== 'running' && embeddedRunningSessions.length > 0 
      ? embeddedRunningSessions 
      : undefined;
    
    // Build exercises data with block system support
    const exercisesData = useBlockSystem 
      ? { _useBlocks: true, blocks: workoutBlocks } as any
      : exercises;
    
    try {
      console.log('[CustomActivityBuilderDialog] Saving activity...', { activityType, title, scheduleForToday, useBlockSystem });
      
      const result = await onSave({
        activity_type: activityType,
        title: title.trim(),
        description: description.trim() || undefined,
        icon,
        color,
        exercises: exercisesData,
        meals,
        custom_fields: customFields,
        duration_minutes: durationMinutes,
        intensity,
        distance_value: distanceValue,
        distance_unit: distanceUnit as 'feet' | 'yards' | 'meters' | 'miles' | 'kilometers',
        pace_value: paceValue || paceGoal || undefined,
        intervals: [] as RunningInterval[],
        is_favorited: isFavorited,
        recurring_days: scheduleMode === 'weekly' ? recurringDays : [],
        recurring_active: scheduleMode === 'weekly' && recurringActive,
        specific_dates: scheduleMode === 'specific_date' ? specificDates.map(d => format(d, 'yyyy-MM-dd')) : undefined,
        sport: selectedSport,
        embedded_running_sessions: runningSessions,
        display_nickname: displayNickname.trim() || undefined,
        custom_logo_url: customLogoUrl.trim() || undefined,
        reminder_enabled: reminderEnabled,
        reminder_time: reminderEnabled ? reminderTime : undefined,
      }, !isEditing ? scheduleForToday : undefined);
      
      console.log('[CustomActivityBuilderDialog] Save result:', result);
      
      // Only close dialog if save was successful (result is truthy)
      if (result) {
        onOpenChange(false);
      } else {
        // Save failed - error toast already shown by useCustomActivities
        console.error('[CustomActivityBuilderDialog] Save returned null/false');
      }
    } catch (error) {
      console.error('[CustomActivityBuilderDialog] Save error:', error);
      toast.error(t('customActivity.createError', 'Failed to save activity'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!template || !onDelete) return;
    if (await onDelete(template.id)) {
      onOpenChange(false);
    }
  };

  // Type-specific content
  const showMealBuilder = activityType === 'meal';
  const showRunningFields = activityType === 'running';
  const showEmbeddedRunningOption = activityType && !showRunningFields && activityType !== 'meal';
  const showBlockSystemToggle = activityType === 'workout';
  const showHammerWarmup = activityType === 'warmup';
  const totalCNS = useBlockSystem ? calculateWorkoutCNS(workoutBlocks) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <DialogTitle className="text-xl font-black">
            {isFromCoach 
              ? t('customActivity.editFromCoach', 'Customize Activity') 
              : isEditing 
                ? t('customActivity.edit') 
                : t('customActivity.create')
            }
          </DialogTitle>
          {isFromCoach && coachName && (
            <p className="text-sm text-muted-foreground">
              {t('sentActivity.fromCoach', `Sent by ${coachName}`)}
              {lockedFields.length > 0 && (
                <span className="ml-2 text-xs">
                  • {t('sentActivity.lockedFieldsCount', { count: lockedFields.length })} {t('sentActivity.locked', 'locked')}
                </span>
              )}
            </p>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)] px-3 sm:px-6 scroll-area-no-hscroll">
          <div className="space-y-6 py-4 overflow-hidden">
            {!isEditing && !presetActivityType && !isFieldLocked('type') && (
              <div className="space-y-2">
                <Label className="text-sm font-bold">{t('customActivity.selectType')}</Label>
                <ActivityTypeSelector selected={activityType} onSelect={setActivityType} />
              </div>
            )}

            {activityType && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 relative">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      {t('customActivity.fields.name')} *
                      {isFieldLocked('title') && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </Label>
                    <Input 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      placeholder={t('customActivity.fields.namePlaceholder')}
                      disabled={isFieldLocked('title')}
                      className={isFieldLocked('title') ? 'opacity-60' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      {t('customActivity.fields.duration')}
                      {isFieldLocked('timing') && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </Label>
                    <Input 
                      type="number" 
                      value={durationMinutes || ''} 
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value) || undefined)} 
                      placeholder="45" 
                      min={1}
                      disabled={isFieldLocked('timing')}
                      className={isFieldLocked('timing') ? 'opacity-60' : ''}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    {t('customActivity.fields.description')}
                    {isFieldLocked('description') && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </Label>
                  <Textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder={t('customActivity.fields.descriptionPlaceholder')} 
                    rows={2}
                    disabled={isFieldLocked('description')}
                    className={isFieldLocked('description') ? 'opacity-60' : ''}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">{t('customActivity.fields.intensity')}</Label>
                    <Select value={intensity || ''} onValueChange={(v) => setIntensity(v as IntensityLevel)}>
                      <SelectTrigger><SelectValue placeholder={t('customActivity.fields.selectIntensity')} /></SelectTrigger>
                      <SelectContent>
                        {INTENSITY_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt}>{t(`customActivity.intensity.${opt}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                <div className="flex items-center gap-3 pt-6">
                    <Switch id="favorite" checked={isFavorited} onCheckedChange={setIsFavorited} />
                    <Label htmlFor="favorite" className="flex items-center gap-2 cursor-pointer">
                      <Star className={cn("h-4 w-4", isFavorited && "fill-yellow-500 text-yellow-500")} />
                      {t('customActivity.favorite')}
                    </Label>
                  </div>
                </div>

                {/* Schedule for Today Toggle - Only show for new activities */}
                {!isEditing && (
                  <div className="p-3 sm:p-4 rounded-lg border bg-primary/5 border-primary/20 overflow-hidden">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="scheduleForToday" className="flex items-center gap-2 cursor-pointer min-w-0">
                        <CalendarPlus className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold">{t('customActivity.scheduleForToday')}</span>
                          <p className="text-xs text-muted-foreground mt-0.5 break-words">
                            {t('customActivity.scheduleForTodayDesc')}
                          </p>
                        </div>
                      </Label>
                      <Switch 
                        id="scheduleForToday" 
                        checked={scheduleForToday} 
                        onCheckedChange={setScheduleForToday} 
                      />
                    </div>
                  </div>
                )}

                {/* Running-specific fields */}
                {showRunningFields && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">{t('customActivity.fields.distance')}</Label>
                        <Input type="number" value={distanceValue || ''} onChange={(e) => setDistanceValue(parseFloat(e.target.value) || undefined)} placeholder="3.0" step={0.1} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">{t('customActivity.running.distanceUnit')}</Label>
                        <Select value={distanceUnit} onValueChange={setDistanceUnit}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DISTANCE_UNITS.map(unit => (
                              <SelectItem key={unit} value={unit}>{t(`customActivity.running.units.${unit}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">{t('customActivity.running.timeGoal')}</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t('customActivity.running.hours')}</Label>
                          <Input type="number" value={timeGoalHours || ''} onChange={(e) => setTimeGoalHours(parseInt(e.target.value) || undefined)} placeholder="0" min={0} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t('customActivity.running.minutes')}</Label>
                          <Input type="number" value={timeGoalMinutes || ''} onChange={(e) => setTimeGoalMinutes(parseInt(e.target.value) || undefined)} placeholder="30" min={0} max={59} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t('customActivity.running.seconds')}</Label>
                          <Input type="number" value={timeGoalSeconds || ''} onChange={(e) => setTimeGoalSeconds(parseInt(e.target.value) || undefined)} placeholder="0" min={0} max={59} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t('customActivity.running.tenths')}</Label>
                          <Input type="number" value={timeGoalTenths || ''} onChange={(e) => setTimeGoalTenths(parseInt(e.target.value) || undefined)} placeholder="0" min={0} max={9} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">{t('customActivity.running.paceGoal')}</Label>
                      <Input value={paceGoal} onChange={(e) => setPaceGoal(e.target.value)} placeholder={t('customActivity.running.paceGoalPlaceholder')} />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-bold">{t('customActivity.fields.icon')}</Label>
                  <IconPicker selected={icon} onSelect={setIcon} color={color} />
                </div>

                <ColorPicker selected={color} onSelect={setColor} />

                {/* Card Customization Section */}
                <div className="space-y-4 p-3 sm:p-4 rounded-lg border bg-muted/30 overflow-hidden">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    {t('customActivity.cardCustomization.title')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('customActivity.cardCustomization.nickname')}</Label>
                      <Input 
                        value={displayNickname} 
                        onChange={(e) => setDisplayNickname(e.target.value)} 
                        placeholder={t('customActivity.cardCustomization.nicknamePlaceholder')} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('customActivity.cardCustomization.logo')}</Label>
                      <LogoUploadButton
                        currentUrl={customLogoUrl}
                        onUpload={(url) => setCustomLogoUrl(url)}
                        onRemove={() => setCustomLogoUrl('')}
                      />
                    </div>
                  </div>
                </div>

                {/* Type-specific builders */}
                {showMealBuilder && <MealBuilder meals={meals} onChange={setMeals} />}
                
                {/* Hammer Warmup Generator - for warmup activity type */}
                {showHammerWarmup && (
                  <WarmupGeneratorCard
                    exercises={exercises}
                    onAddWarmup={(warmupExercises) => setExercises(prev => [...warmupExercises, ...prev])}
                    sport={selectedSport}
                    isWarmupActivity={true}
                  />
                )}
                
                {/* Embedded Running Sessions - for workout, recovery, practice, warmup, etc. */}
                {showEmbeddedRunningOption && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Footprints className="h-4 w-4" />
                        {t('customActivity.running.sessions')}
                      </Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addRunningSession}
                        className="gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t('customActivity.running.addRunningSession')}
                      </Button>
                    </div>
                    
                    {embeddedRunningSessions.map((session, index) => (
                      <div key={session.id} className="p-4 rounded-lg border bg-muted/30 space-y-4">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                          <span className="text-sm font-medium truncate min-w-0">
                            {t('customActivity.running.sessionNumber', { number: index + 1 })}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRunningSession(session.id)}
                            className="h-7 px-2 text-destructive hover:text-destructive shrink-0 whitespace-nowrap"
                          >
                            <X className="h-4 w-4" />
                            <span className="hidden sm:inline">{t('customActivity.running.removeSession')}</span>
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-bold">{t('customActivity.fields.distance')}</Label>
                            <Input 
                              type="number" 
                              value={session.distance_value || ''} 
                              onChange={(e) => updateRunningSession(session.id, { distance_value: parseFloat(e.target.value) || undefined })} 
                              placeholder="3.0" 
                              step={0.1} 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-bold">{t('customActivity.running.distanceUnit')}</Label>
                            <Select 
                              value={session.distance_unit || 'miles'} 
                              onValueChange={(v) => updateRunningSession(session.id, { distance_unit: v as any })}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {DISTANCE_UNITS.map(unit => (
                                  <SelectItem key={unit} value={unit}>{t(`customActivity.running.units.${unit}`)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-bold">{t('customActivity.running.timeGoal')}</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(() => {
                              const timeGoal = session.time_goal || '';
                              const [timePart, tenthsPart] = timeGoal.split('.');
                              const parts = timePart.split(':');
                              const hours = parts.length === 3 ? parseInt(parts[0]) || 0 : 0;
                              const minutes = parts.length === 3 ? parseInt(parts[1]) || 0 : 0;
                              const seconds = parts.length === 3 ? parseInt(parts[2]) || 0 : 0;
                              const tenths = parseInt(tenthsPart) || 0;
                              
                              const updateTimeGoal = (h: number, m: number, s: number, t: number) => {
                                const timeStr = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                                const newTimeGoal = t > 0 ? `${timeStr}.${t}` : timeStr;
                                updateRunningSession(session.id, { time_goal: newTimeGoal });
                              };
                              
                              return (
                                <>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{t('customActivity.running.hours')}</Label>
                                    <Input type="number" value={hours || ''} onChange={(e) => updateTimeGoal(parseInt(e.target.value) || 0, minutes, seconds, tenths)} placeholder="0" min={0} />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{t('customActivity.running.minutes')}</Label>
                                    <Input type="number" value={minutes || ''} onChange={(e) => updateTimeGoal(hours, parseInt(e.target.value) || 0, seconds, tenths)} placeholder="30" min={0} max={59} />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{t('customActivity.running.seconds')}</Label>
                                    <Input type="number" value={seconds || ''} onChange={(e) => updateTimeGoal(hours, minutes, parseInt(e.target.value) || 0, tenths)} placeholder="0" min={0} max={59} />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{t('customActivity.running.tenths')}</Label>
                                    <Input type="number" value={tenths || ''} onChange={(e) => updateTimeGoal(hours, minutes, seconds, parseInt(e.target.value) || 0)} placeholder="0" min={0} max={9} />
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-bold">{t('customActivity.running.paceGoal')}</Label>
                          <Input 
                            value={session.pace_goal || ''} 
                            onChange={(e) => updateRunningSession(session.id, { pace_goal: e.target.value })} 
                            placeholder={t('customActivity.running.paceGoalPlaceholder')} 
                          />
                        </div>
                      </div>
                    ))}
                    
                    {embeddedRunningSessions.length > 0 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addRunningSession}
                        className="w-full gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t('customActivity.running.addAnother')}
                      </Button>
                    )}
                  </div>
                )}

                <Separator className="my-4" />
                
                {/* Block System Toggle - Only for workout type */}
                {showBlockSystemToggle && (
                  <div className="p-3 sm:p-4 rounded-lg border-2 border-dashed bg-muted/30 space-y-4 overflow-hidden">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="useBlockSystem" className="flex items-center gap-2 cursor-pointer min-w-0">
                        <Layers className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold">{t('eliteWorkout.useBlockSystem', 'Use Block-Based Builder')}</span>
                          <p className="text-xs text-muted-foreground mt-0.5 break-words">
                            {t('eliteWorkout.useBlockSystemDesc', 'Organize exercises into structured blocks with intelligent load tracking')}
                          </p>
                        </div>
                      </Label>
                      <Switch 
                        id="useBlockSystem" 
                        checked={useBlockSystem} 
                        onCheckedChange={setUseBlockSystem}
                        disabled={isFieldLocked('exercises')}
                      />
                    </div>
                    
                    {/* View Mode Toggle & CNS Preview - Only when block system active */}
                    {useBlockSystem && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <ViewModeToggle value={viewMode} onChange={setViewMode} />
                        {viewMode === 'coach' && totalCNS > 0 && (
                          <CNSLoadIndicator load={totalCNS} size="sm" />
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Universal sections - Available for ALL activity types */}
                <div className="space-y-4 overflow-hidden">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                    {t('customActivity.universal.additionalOptions')}
                  </h3>
                  
                  {/* Exercise Builder - Block system for workout when enabled, Drag-and-drop for workout type, standard for others */}
                  {activityType === 'workout' && useBlockSystem ? (
                    <BlockContainer
                      blocks={workoutBlocks}
                      onChange={setWorkoutBlocks}
                      viewMode={viewMode}
                      onViewModeChange={setViewMode}
                      showViewModeToggle={false}
                      className={isFieldLocked('exercises') ? 'opacity-60 pointer-events-none' : ''}
                    />
                  ) : activityType === 'workout' ? (
                    <DragDropExerciseBuilder
                      exercises={exercises} 
                      onExercisesChange={setExercises} 
                    />
                  ) : (
                    <ExerciseBuilder exercises={exercises} onChange={setExercises} />
                  )}
                  
                  {/* Custom Fields Builder - Available for ALL types */}
                  <CustomFieldsBuilder fields={customFields} onChange={setCustomFields} />
                </div>

                {/* Schedule Mode Selector */}
                <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {t('customActivity.scheduling.title', 'Scheduling')}
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['none', 'weekly', 'specific_date'] as ScheduleMode[]).map(mode => (
                      <Button
                        key={mode}
                        type="button"
                        variant={scheduleMode === mode ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setScheduleMode(mode);
                          if (mode === 'weekly') setRecurringActive(true);
                          else setRecurringActive(false);
                        }}
                        className="text-xs"
                      >
                        {mode === 'none' ? t('customActivity.scheduling.noSchedule', 'No Schedule')
                          : mode === 'weekly' ? t('customActivity.scheduling.weekly', 'Weekly')
                          : t('customActivity.scheduling.specificDate', 'Specific Date')}
                      </Button>
                    ))}
                  </div>

                  {scheduleMode === 'weekly' && (
                    <RecurringDayPicker selectedDays={recurringDays} onDaysChange={setRecurringDays} isActive={recurringActive} onActiveChange={setRecurringActive} />
                  )}

                  {scheduleMode === 'specific_date' && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        {t('customActivity.scheduling.pickDates', 'Select one or more dates')}
                      </Label>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {specificDates.map((d, i) => (
                          <Badge key={i} variant="secondary" className="gap-1 text-xs">
                            {format(d, 'MMM d, yyyy')}
                            <button type="button" onClick={() => setSpecificDates(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {t('customActivity.scheduling.addDate', 'Add Date')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={undefined}
                            onSelect={(date) => {
                              if (date && !specificDates.some(d => d.toDateString() === date.toDateString())) {
                                setSpecificDates(prev => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
                              }
                            }}
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>

                {/* Reminder Settings - Only show when recurring is active */}
                {recurringActive && (
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        {t('customActivity.reminders.title', 'Activity Reminder')}
                      </Label>
                      <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                    </div>
                    {reminderEnabled && (
                      <div className="space-y-2">
                        <Label className="text-sm">{t('customActivity.reminders.time', 'Reminder Time')}</Label>
                        <Input 
                          type="time" 
                          value={reminderTime} 
                          onChange={(e) => setReminderTime(e.target.value)} 
                        />
                        <p className="text-xs text-muted-foreground">
                          {t('customActivity.reminders.description', 'Get notified when this recurring activity is due')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-3 p-4 sm:p-6 pt-4 border-t">
          {isEditing && onDelete ? (
            <Button variant="destructive" onClick={handleDelete} className="gap-2">
              <Trash2 className="h-4 w-4" /> {t('common.delete')}
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={!activityType || !title.trim() || saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? t('common.saving', 'Saving...') : t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
