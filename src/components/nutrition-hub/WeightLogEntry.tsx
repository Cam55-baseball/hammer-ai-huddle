import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { isImpossibleEntry } from '@/lib/ledger/entryCheck';
import { ImpossibleNumberNote } from '@/components/measure/ImpossibleNumberNote';

interface WeightLogEntryProps {
  onSubmit: (weight: number, bodyFat?: number | null, notes?: string | null, date?: string) => Promise<any>;
  loading?: boolean;
  currentWeight?: number | null;
}

export function WeightLogEntry({ onSubmit, loading, currentWeight }: WeightLogEntryProps) {
  const { t } = useTranslation();
  const [weight, setWeight] = useState(currentWeight?.toString() || '');
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [submitting, setSubmitting] = useState(false);

  // Owner Nov 9: bounds come from the one metric dictionary (same as ledger-save), not browser min/max.
  const weightBad = isImpossibleEntry('body.weight_lbs', weight);
  const bodyFatBad = isImpossibleEntry('body.body_fat_percent', bodyFat);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!weight || isNaN(parseFloat(weight))) return;
    if (weightBad || bodyFatBad) return;

    setSubmitting(true);
    try {
      await onSubmit(
        parseFloat(weight),
        bodyFat ? parseFloat(bodyFat) : null,
        notes || null,
        date
      );
      
      // Reset form (keep date)
      setWeight('');
      setBodyFat('');
      setNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4 text-primary" />
          {t('nutrition.weight.logWeight', 'Log Weight')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">{t('nutrition.weight.weightLbs', 'Weight (lbs)')}</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="175.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
              <ImpossibleNumberNote show={weightBad} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date">{t('nutrition.weight.date', 'Date')}</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bodyFat">
              {t('nutrition.weight.bodyFatOptional', 'Body Fat % (optional)')}
            </Label>
            <Input
              id="bodyFat"
              type="number"
              step="0.1"
              placeholder="15.0"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
            />
            <ImpossibleNumberNote show={bodyFatBad} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              {t('nutrition.weight.notesOptional', 'Notes (optional)')}
            </Label>
            <Textarea
              id="notes"
              placeholder={t('nutrition.weight.notesPlaceholder', 'Morning weigh-in, after workout...')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || submitting || !weight || weightBad || bodyFatBad}
          >
            <Plus className="h-4 w-4 mr-2" />
            {submitting 
              ? t('common.loading', 'Loading...') 
              : t('nutrition.weight.logEntry', 'Log Entry')
            }
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
