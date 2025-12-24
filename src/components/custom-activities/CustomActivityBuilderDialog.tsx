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
  onSave: (data: Omit<CustomActivityTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onDelete?: (id: string) => Promise<boolean>;
  selectedSport: 'baseball' | 'softball';
}

const INTENSITY_OPTIONS: IntensityLevel[] = ['light', 'moderate', 'high', 'max'];

export function CustomActivityBuilderDialog({
  open,
  onOpenChange,
  template,
  onSave,
  onDelete,
  selectedSport,
}: CustomActivityBuilderDialogProps) {
  const { t } = useTranslation();
  const isEditing = !!template;

  const [activityType, setActivityType] = useState<ActivityType | null>(template?.activity_type || null);
  const [title, setTitle] = useState(template?.title || '');
  const [description, setDescription] = useState(template?.description || '');
  const [icon, setIcon] = useState(template?.icon || 'dumbbell');
  const [color, setColor] = useState(template?.color || '#8b5cf6');
  const [exercises, setExercises] = useState<Exercise[]>(template?.exercises || []);
  const [meals, setMeals] = useState<MealData>(template?.meals || { items: [], vitamins: [], supplements: [] });
  const [customFields, setCustomFields] = useState<CustomField[]>(template?.custom_fields || []);
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(template?.duration_minutes);
  const [intensity, setIntensity] = useState<IntensityLevel | undefined>(template?.intensity);
  const [distanceValue, setDistanceValue] = useState<number | undefined>(template?.distance_value);
  const [distanceUnit, setDistanceUnit] = useState<'miles' | 'km'>(template?.distance_unit as 'miles' | 'km' || 'miles');
  const [isFavorited, setIsFavorited] = useState(template?.is_favorited || false);
  const [recurringDays, setRecurringDays] = useState<number[]>(template?.recurring_days || []);
  const [recurringActive, setRecurringActive] = useState(template?.recurring_active || false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setActivityType(template.activity_type);
      setTitle(template.title);
      setDescription(template.description || '');
      setIcon(template.icon);
      setColor(template.color);
      setExercises(template.exercises || []);
      setMeals(template.meals || { items: [], vitamins: [], supplements: [] });
      setCustomFields(template.custom_fields || []);
      setDurationMinutes(template.duration_minutes);
      setIntensity(template.intensity);
      setDistanceValue(template.distance_value);
      setDistanceUnit(template.distance_unit as 'miles' | 'km' || 'miles');
      setIsFavorited(template.is_favorited);
      setRecurringDays(template.recurring_days || []);
      setRecurringActive(template.recurring_active);
    } else {
      setActivityType(null);
      setTitle('');
      setDescription('');
      setIcon('dumbbell');
      setColor('#8b5cf6');
      setExercises([]);
      setMeals({ items: [], vitamins: [], supplements: [] });
      setCustomFields([]);
      setDurationMinutes(undefined);
      setIntensity(undefined);
      setDistanceValue(undefined);
      setDistanceUnit('miles');
      setIsFavorited(false);
      setRecurringDays([]);
      setRecurringActive(false);
    }
  }, [template, open]);

  const handleSave = async () => {
    if (!activityType || !title.trim()) return;
    setSaving(true);
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
        distance_unit: distanceUnit,
        pace_value: undefined,
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

  const showExerciseBuilder = activityType === 'workout' || activityType === 'warmup' || activityType === 'practice' || activityType === 'short_practice';
  const showMealBuilder = activityType === 'meal';
  const showRunningFields = activityType === 'running';
  const showCustomFields = activityType === 'free_session' || activityType === 'recovery';

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
            {!isEditing && (
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

                {showRunningFields && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">{t('customActivity.fields.distance')}</Label>
                      <Input type="number" value={distanceValue || ''} onChange={(e) => setDistanceValue(parseFloat(e.target.value) || undefined)} placeholder="3.0" step={0.1} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">{t('customActivity.fields.distanceUnit')}</Label>
                      <Select value={distanceUnit} onValueChange={(v) => setDistanceUnit(v as 'miles' | 'km')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="miles">Miles</SelectItem>
                          <SelectItem value="km">Kilometers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-bold">{t('customActivity.fields.icon')}</Label>
                  <IconPicker selected={icon} onSelect={setIcon} color={color} />
                </div>

                <ColorPicker selected={color} onSelect={setColor} />

                {showExerciseBuilder && <ExerciseBuilder exercises={exercises} onChange={setExercises} />}
                {showMealBuilder && <MealBuilder meals={meals} onChange={setMeals} />}
                {showCustomFields && <CustomFieldsBuilder fields={customFields} onChange={setCustomFields} />}

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
