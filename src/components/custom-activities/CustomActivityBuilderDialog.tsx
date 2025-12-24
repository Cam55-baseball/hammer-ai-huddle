import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Star, Save, Trash2 } from 'lucide-react';
import { ActivityTypeSelector } from './ActivityTypeSelector';
import { IconPicker } from './IconPicker';
import { ColorPicker } from './ColorPicker';
import { RecurringDayPicker } from './RecurringDayPicker';
import { ExerciseBuilder } from './ExerciseBuilder';
import { MealBuilder } from './MealBuilder';
import { CustomFieldsBuilder } from './CustomFieldsBuilder';
import { CustomActivityTemplate, ActivityType, IntensityLevel, Exercise, MealData, CustomField, RunningInterval } from '@/types/customActivity';
import { cn } from '@/lib/utils';

interface CustomActivityBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: CustomActivityTemplate | null;
  presetActivityType?: ActivityType | null;
  onSave: (data: Omit<CustomActivityTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onDelete?: (id: string) => Promise<boolean>;
  selectedSport: 'baseball' | 'softball';
}

const INTENSITY_OPTIONS: IntensityLevel[] = ['light', 'moderate', 'high', 'max'];
const DISTANCE_UNITS = ['feet', 'yards', 'meters', 'miles', 'kilometers'] as const;

export function CustomActivityBuilderDialog({
  open,
  onOpenChange,
  template,
  presetActivityType,
  onSave,
  onDelete,
  selectedSport,
}: CustomActivityBuilderDialogProps) {
  const { t } = useTranslation();
  const isEditing = !!template;

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
  
  // Running-specific fields
  const [timeGoalHours, setTimeGoalHours] = useState<number | undefined>();
  const [timeGoalMinutes, setTimeGoalMinutes] = useState<number | undefined>();
  const [timeGoalSeconds, setTimeGoalSeconds] = useState<number | undefined>();
  const [paceGoal, setPaceGoal] = useState<string>('');

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
      // Parse time goal if stored in pace_value
      if (template.pace_value) {
        const parts = template.pace_value.split(':');
        if (parts.length === 3) {
          setTimeGoalHours(parseInt(parts[0]) || undefined);
          setTimeGoalMinutes(parseInt(parts[1]) || undefined);
          setTimeGoalSeconds(parseInt(parts[2]) || undefined);
        }
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
      setTimeGoalHours(undefined);
      setTimeGoalMinutes(undefined);
      setTimeGoalSeconds(undefined);
      setPaceGoal('');
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
      setTimeGoalHours(undefined);
      setTimeGoalMinutes(undefined);
      setTimeGoalSeconds(undefined);
      setPaceGoal('');
    }
  }, [template, presetActivityType, open]);

  const handleSave = async () => {
    if (!activityType || !title.trim()) return;
    setSaving(true);
    
    // Combine time goal into pace_value
    let paceValue: string | undefined;
    if (timeGoalHours || timeGoalMinutes || timeGoalSeconds) {
      paceValue = `${timeGoalHours || 0}:${timeGoalMinutes || 0}:${timeGoalSeconds || 0}`;
    }
    
    try {
      await onSave({
        activity_type: activityType,
        title: title.trim(),
        description: description.trim() || undefined,
        icon,
        color,
        exercises,
        meals,
        custom_fields: customFields,
        duration_minutes: durationMinutes,
        intensity,
        distance_value: distanceValue,
        distance_unit: distanceUnit as 'miles' | 'km',
        pace_value: paceValue || paceGoal || undefined,
        intervals: [] as RunningInterval[],
        is_favorited: isFavorited,
        recurring_days: recurringDays,
        recurring_active: recurringActive,
        sport: selectedSport,
      });
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-black">
            {isEditing ? t('customActivity.edit') : t('customActivity.create')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)] px-6">
          <div className="space-y-6 py-4">
            {!isEditing && !presetActivityType && (
              <div className="space-y-2">
                <Label className="text-sm font-bold">{t('customActivity.selectType')}</Label>
                <ActivityTypeSelector selected={activityType} onSelect={setActivityType} />
              </div>
            )}

            {activityType && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">{t('customActivity.fields.name')} *</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('customActivity.fields.namePlaceholder')} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">{t('customActivity.fields.duration')}</Label>
                    <Input type="number" value={durationMinutes || ''} onChange={(e) => setDurationMinutes(parseInt(e.target.value) || undefined)} placeholder="45" min={1} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">{t('customActivity.fields.description')}</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('customActivity.fields.descriptionPlaceholder')} rows={2} />
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
                      <div className="grid grid-cols-3 gap-2">
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

                {/* Type-specific builders */}
                {showMealBuilder && <MealBuilder meals={meals} onChange={setMeals} />}

                <Separator className="my-4" />
                
                {/* Universal sections - Available for ALL activity types */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                    {t('customActivity.universal.additionalOptions')}
                  </h3>
                  
                  {/* Exercise Builder - Available for ALL types */}
                  <ExerciseBuilder exercises={exercises} onChange={setExercises} />
                  
                  {/* Custom Fields Builder - Available for ALL types */}
                  <CustomFieldsBuilder fields={customFields} onChange={setCustomFields} />
                </div>

                <RecurringDayPicker selectedDays={recurringDays} onDaysChange={setRecurringDays} isActive={recurringActive} onActiveChange={setRecurringActive} />
              </>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-3 p-6 pt-4 border-t">
          {isEditing && onDelete ? (
            <Button variant="destructive" onClick={handleDelete} className="gap-2">
              <Trash2 className="h-4 w-4" /> {t('common.delete')}
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={!activityType || !title.trim() || saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
