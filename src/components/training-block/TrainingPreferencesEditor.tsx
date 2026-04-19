import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTrainingPreferences } from '@/hooks/useTrainingPreferences';
import { useTrainingBlock } from '@/hooks/useTrainingBlock';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EQUIPMENT_OPTIONS = [
  'barbell', 'dumbbells', 'kettlebells', 'bands', 'pull-up bar',
  'bench', 'cables', 'medicine ball', 'bodyweight only',
];

export function TrainingPreferencesEditor() {
  const { t } = useTranslation();
  const { preferences, isLoading, upsertPreferences, updateGoal } = useTrainingPreferences();
  const { activeBlock, adaptBlock } = useTrainingBlock();

  const [goal, setGoal] = useState(preferences?.goal || '');
  const [selectedDays, setSelectedDays] = useState<number[]>(
    preferences?.availability?.days || [1, 3, 5]
  );
  const [equipment, setEquipment] = useState<string[]>(
    (preferences?.equipment as string[]) || []
  );
  const [injuries, setInjuries] = useState(
    ((preferences?.injuries as string[]) || []).join(', ')
  );
  const [experienceLevel, setExperienceLevel] = useState(
    preferences?.experience_level || 'intermediate'
  );

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const toggleEquipment = (item: string) => {
    setEquipment(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  };

  const handleSave = () => {
    upsertPreferences.mutate({
      goal,
      availability: { days: selectedDays },
      equipment,
      injuries: injuries.split(',').map(s => s.trim()).filter(Boolean),
      experience_level: experienceLevel,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="h-4 w-4" />
          {t('trainingBlock.preferences', 'Training Preferences')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>{t('trainingBlock.goal', 'Primary Goal')}</Label>
          <Select value={goal} onValueChange={setGoal}>
            <SelectTrigger>
              <SelectValue placeholder="Select a goal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hypertrophy">Hypertrophy (Muscle Growth)</SelectItem>
              <SelectItem value="strength">Max Strength</SelectItem>
              <SelectItem value="power">Power & Explosiveness</SelectItem>
              <SelectItem value="sport_performance">Sport Performance</SelectItem>
              <SelectItem value="general_fitness">General Fitness</SelectItem>
              <SelectItem value="fat_loss">Fat Loss + Muscle Retention</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('trainingBlock.availability', 'Available Days')}</Label>
          <div className="flex gap-1">
            {DAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleDay(idx)}
                className={cn(
                  'flex-1 py-2 text-xs font-medium rounded-md border transition-colors',
                  selectedDays.includes(idx)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-accent'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('trainingBlock.experience', 'Experience Level')}</Label>
          <Select value={experienceLevel} onValueChange={setExperienceLevel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner (0-1 years)</SelectItem>
              <SelectItem value="intermediate">Intermediate (1-3 years)</SelectItem>
              <SelectItem value="advanced">Advanced (3+ years)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('trainingBlock.equipment', 'Available Equipment')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT_OPTIONS.map(item => (
              <Badge
                key={item}
                variant={equipment.includes(item) ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => toggleEquipment(item)}
              >
                {item}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('trainingBlock.injuries', 'Injuries / Areas to Avoid')}</Label>
          <Input
            value={injuries}
            onChange={e => setInjuries(e.target.value)}
            placeholder="e.g. left shoulder, lower back"
          />
          <p className="text-xs text-muted-foreground">Comma-separated</p>
        </div>

        <Button
          onClick={handleSave}
          disabled={upsertPreferences.isPending}
          className="w-full"
        >
          {upsertPreferences.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>

        {activeBlock && (
          <Button
            variant="outline"
            onClick={() => adaptBlock.mutate({ regenerate: true })}
            disabled={adaptBlock.isPending}
            className="w-full gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', adaptBlock.isPending && 'animate-spin')} />
            {adaptBlock.isPending ? 'Regenerating...' : 'Apply changes to current block'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
