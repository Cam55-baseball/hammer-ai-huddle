import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { EnhancedExercise, VelocityIntent, LoadType, FasciaBiasType, CNSDemand } from '@/types/eliteWorkout';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface AdvancedFieldsPanelProps {
  exercise: EnhancedExercise;
  onUpdate: (exercise: EnhancedExercise) => void;
}

export function AdvancedFieldsPanel({ exercise, onUpdate }: AdvancedFieldsPanelProps) {
  const { t } = useTranslation();
  
  const handleChange = (field: keyof EnhancedExercise, value: any) => {
    onUpdate({ ...exercise, [field]: value });
  };
  
  return (
    <div className="mt-3 pt-3 border-t border-dashed space-y-4">
      {/* Tempo & Velocity Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">
            {t('eliteWorkout.tempo', 'Tempo')}
          </Label>
          <Input
            value={exercise.tempo || ''}
            onChange={(e) => handleChange('tempo', e.target.value || undefined)}
            className="h-8 text-sm"
            placeholder="3-1-2-0"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">
            ecc-pause-con-pause
          </p>
        </div>
        
        <div>
          <Label className="text-xs text-muted-foreground">
            {t('eliteWorkout.velocityIntent', 'Velocity Intent')}
          </Label>
          <Select
            value={exercise.velocity_intent || ''}
            onValueChange={(value) => handleChange('velocity_intent', value as VelocityIntent || undefined)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={t('common.select', 'Select...')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slow">{t('eliteWorkout.velocity.slow', 'Slow')}</SelectItem>
              <SelectItem value="moderate">{t('eliteWorkout.velocity.moderate', 'Moderate')}</SelectItem>
              <SelectItem value="fast">{t('eliteWorkout.velocity.fast', 'Fast')}</SelectItem>
              <SelectItem value="ballistic">{t('eliteWorkout.velocity.ballistic', 'Ballistic')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Load Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">
            {t('eliteWorkout.externalLoad', 'External Load')}
          </Label>
          <Input
            type="number"
            value={exercise.external_load || ''}
            onChange={(e) => handleChange('external_load', parseFloat(e.target.value) || undefined)}
            className="h-8 text-sm"
            min={0}
          />
        </div>
        
        <div>
          <Label className="text-xs text-muted-foreground">
            {t('eliteWorkout.loadType', 'Load Type')}
          </Label>
          <Select
            value={exercise.load_type || ''}
            onValueChange={(value) => handleChange('load_type', value as LoadType || undefined)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={t('common.select', 'Select...')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="barbell">{t('eliteWorkout.loadTypes.barbell', 'Barbell')}</SelectItem>
              <SelectItem value="dumbbell">{t('eliteWorkout.loadTypes.dumbbell', 'Dumbbell')}</SelectItem>
              <SelectItem value="kettlebell">{t('eliteWorkout.loadTypes.kettlebell', 'Kettlebell')}</SelectItem>
              <SelectItem value="band">{t('eliteWorkout.loadTypes.band', 'Band')}</SelectItem>
              <SelectItem value="cable">{t('eliteWorkout.loadTypes.cable', 'Cable')}</SelectItem>
              <SelectItem value="machine">{t('eliteWorkout.loadTypes.machine', 'Machine')}</SelectItem>
              <SelectItem value="bodyweight">{t('eliteWorkout.loadTypes.bodyweight', 'Bodyweight')}</SelectItem>
              <SelectItem value="other">{t('common.other', 'Other')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Fascia & CNS Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">
            {t('eliteWorkout.fasciaBias', 'Fascia Bias')}
          </Label>
          <Select
            value={exercise.fascia_bias || ''}
            onValueChange={(value) => handleChange('fascia_bias', value as FasciaBiasType || undefined)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={t('common.select', 'Select...')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compression">{t('eliteWorkout.fascia.compression', 'Compression')}</SelectItem>
              <SelectItem value="elastic">{t('eliteWorkout.fascia.elastic', 'Elastic')}</SelectItem>
              <SelectItem value="glide">{t('eliteWorkout.fascia.glide', 'Glide')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="text-xs text-muted-foreground">
            {t('eliteWorkout.cnsDemand', 'CNS Demand')}
          </Label>
          <Select
            value={exercise.cns_demand || ''}
            onValueChange={(value) => handleChange('cns_demand', value as CNSDemand || undefined)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={t('common.select', 'Select...')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{t('common.low', 'Low')}</SelectItem>
              <SelectItem value="medium">{t('common.medium', 'Medium')}</SelectItem>
              <SelectItem value="high">{t('common.high', 'High')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Toggles Row */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            id="unilateral"
            checked={exercise.is_unilateral || false}
            onCheckedChange={(checked) => handleChange('is_unilateral', checked)}
          />
          <Label htmlFor="unilateral" className="text-xs">
            {t('eliteWorkout.unilateral', 'Unilateral')}
          </Label>
        </div>
      </div>
      
      {/* Breathing Pattern */}
      <div>
        <Label className="text-xs text-muted-foreground">
          {t('eliteWorkout.breathingPattern', 'Breathing Pattern')}
        </Label>
        <Input
          value={exercise.breathing_pattern || ''}
          onChange={(e) => handleChange('breathing_pattern', e.target.value || undefined)}
          className="h-8 text-sm"
          placeholder="e.g., Exhale on push"
        />
      </div>
      
      {/* Notes */}
      <div>
        <Label className="text-xs text-muted-foreground">
          {t('common.notes', 'Notes')}
        </Label>
        <Textarea
          value={exercise.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value || undefined)}
          className="text-sm min-h-[60px]"
          placeholder={t('eliteWorkout.exerciseNotesPlaceholder', 'Coaching cues, form tips...')}
        />
      </div>
    </div>
  );
}
