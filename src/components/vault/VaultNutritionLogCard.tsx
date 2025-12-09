import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Apple, Droplets, Pill, ChevronDown, CheckCircle, Plus, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NutritionLog {
  id: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  hydration_oz: number | null;
  energy_level: number | null;
  digestion_notes: string | null;
  supplements: string[];
}

interface VaultNutritionLogCardProps {
  todaysLog: NutritionLog | null;
  onSave: (data: Omit<NutritionLog, 'id'>) => Promise<{ success: boolean }>;
}

export function VaultNutritionLogCard({ todaysLog, onSave }: VaultNutritionLogCardProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [calories, setCalories] = useState<string>(todaysLog?.calories?.toString() || '');
  const [protein, setProtein] = useState<string>(todaysLog?.protein_g?.toString() || '');
  const [carbs, setCarbs] = useState<string>(todaysLog?.carbs_g?.toString() || '');
  const [fats, setFats] = useState<string>(todaysLog?.fats_g?.toString() || '');
  const [hydration, setHydration] = useState<string>(todaysLog?.hydration_oz?.toString() || '');
  const [energyLevel, setEnergyLevel] = useState<number[]>([todaysLog?.energy_level || 5]);
  const [digestionNotes, setDigestionNotes] = useState(todaysLog?.digestion_notes || '');
  const [supplements, setSupplements] = useState<string[]>(todaysLog?.supplements || []);
  const [newSupplement, setNewSupplement] = useState('');

  const handleAddSupplement = () => {
    if (newSupplement.trim() && !supplements.includes(newSupplement.trim())) {
      setSupplements([...supplements, newSupplement.trim()]);
      setNewSupplement('');
    }
  };

  const handleRemoveSupplement = (supp: string) => {
    setSupplements(supplements.filter(s => s !== supp));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      calories: calories ? parseInt(calories) : null,
      protein_g: protein ? parseFloat(protein) : null,
      carbs_g: carbs ? parseFloat(carbs) : null,
      fats_g: fats ? parseFloat(fats) : null,
      hydration_oz: hydration ? parseFloat(hydration) : null,
      energy_level: energyLevel[0],
      digestion_notes: digestionNotes || null,
      supplements,
    });
    setSaving(false);
  };

  const hasData = todaysLog && (todaysLog.calories || todaysLog.protein_g || todaysLog.hydration_oz);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Apple className="h-5 w-5 text-green-500" />
                <CardTitle className="text-lg">{t('vault.nutrition.title')}</CardTitle>
                {hasData && <CheckCircle className="h-4 w-4 text-green-500" />}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <CardDescription>{t('vault.nutrition.description')}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {hasData && (
              <Alert className="bg-green-500/10 border-green-500/30">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription>{t('vault.nutrition.logged')}</AlertDescription>
              </Alert>
            )}

            {/* Macros */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('vault.nutrition.calories')}</Label>
                <Input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="2000"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('vault.nutrition.protein')}</Label>
                <Input
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder="150g"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('vault.nutrition.carbs')}</Label>
                <Input
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder="250g"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('vault.nutrition.fats')}</Label>
                <Input
                  type="number"
                  value={fats}
                  onChange={(e) => setFats(e.target.value)}
                  placeholder="70g"
                  className="h-9"
                />
              </div>
            </div>

            {/* Hydration */}
            <div className="flex items-center gap-3">
              <Droplets className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{t('vault.nutrition.hydration')}</Label>
                <Input
                  type="number"
                  value={hydration}
                  onChange={(e) => setHydration(e.target.value)}
                  placeholder="100 oz"
                  className="h-9"
                />
              </div>
            </div>

            {/* Energy Level */}
            <div className="space-y-2">
              <Label className="text-xs">{t('vault.nutrition.energyLevel')}: {energyLevel[0]}/10</Label>
              <Slider
                value={energyLevel}
                onValueChange={setEnergyLevel}
                min={1}
                max={10}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('vault.nutrition.low')}</span>
                <span>{t('vault.nutrition.high')}</span>
              </div>
            </div>

            {/* Supplements */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-purple-500" />
                <Label className="text-xs">{t('vault.nutrition.supplements')}</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {supplements.map((supp) => (
                  <Badge key={supp} variant="secondary" className="gap-1">
                    {supp}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveSupplement(supp)} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSupplement}
                  onChange={(e) => setNewSupplement(e.target.value)}
                  placeholder={t('vault.nutrition.addSupplement')}
                  className="h-9"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSupplement()}
                />
                <Button type="button" size="sm" variant="outline" onClick={handleAddSupplement}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Digestion Notes */}
            <div className="space-y-1">
              <Label className="text-xs">{t('vault.nutrition.digestionNotes')}</Label>
              <Textarea
                value={digestionNotes}
                onChange={(e) => setDigestionNotes(e.target.value)}
                placeholder={t('vault.nutrition.digestionPlaceholder')}
                className="min-h-[60px]"
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? t('common.loading') : t('vault.nutrition.save')}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
