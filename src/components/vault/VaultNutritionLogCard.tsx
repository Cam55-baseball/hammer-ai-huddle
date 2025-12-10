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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Apple, Droplets, Pill, ChevronDown, CheckCircle, Plus, X, Coffee, Salad, UtensilsCrossed, Cookie } from 'lucide-react';
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
  meal_type: string | null;
}

interface VaultNutritionLogCardProps {
  todaysLog: NutritionLog | null;
  onSave: (data: Omit<NutritionLog, 'id'>) => Promise<{ success: boolean }>;
  isLoading?: boolean;
}

export function VaultNutritionLogCard({ todaysLog, onSave, isLoading = false }: VaultNutritionLogCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-muted animate-pulse" />
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-4 w-48 bg-muted rounded animate-pulse mt-1" />
        </CardHeader>
      </Card>
    );
  }

  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [mealType, setMealType] = useState<string>(todaysLog?.meal_type || '');
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
      meal_type: mealType || null,
    });
    setSaving(false);
  };

  const handleLogEntry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
  };

  const hasData = todaysLog && (todaysLog.calories || todaysLog.protein_g || todaysLog.hydration_oz);

  const mealTypeOptions = [
    { value: 'breakfast', icon: Coffee, label: t('vault.nutrition.breakfast') },
    { value: 'lunch', icon: Salad, label: t('vault.nutrition.lunch') },
    { value: 'dinner', icon: UtensilsCrossed, label: t('vault.nutrition.dinner') },
    { value: 'snack', icon: Cookie, label: t('vault.nutrition.snack') },
    { value: 'hydration', icon: Droplets, label: t('vault.nutrition.hydrationOnly') },
  ];

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Apple className="h-5 w-5 text-green-500" />
                <CardTitle className="text-lg">{t('vault.nutrition.title')}</CardTitle>
                {hasData && <CheckCircle className="h-4 w-4 text-green-500" />}
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 gap-1 text-xs ml-2"
                  onClick={handleLogEntry}
                >
                  <Plus className="h-3 w-3" />
                  {t('vault.nutrition.logEntry')}
                </Button>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
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

            {/* Meal Type */}
            <div className="space-y-2">
              <Label className="text-xs">{t('vault.nutrition.mealType')}</Label>
              <ToggleGroup 
                type="single" 
                value={mealType} 
                onValueChange={(val) => val && setMealType(val)}
                className="flex flex-wrap gap-1 justify-start"
              >
                {mealTypeOptions.map((option) => (
                  <ToggleGroupItem 
                    key={option.value} 
                    value={option.value}
                    className="flex-1 min-w-[70px] gap-1 text-xs h-9 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    <option.icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{option.label}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

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

            {/* Energy Level with number labels */}
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
              <div className="flex justify-between px-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <span 
                    key={num} 
                    className={`text-[10px] w-4 text-center ${
                      num === energyLevel[0] 
                        ? 'text-primary font-bold' 
                        : 'text-muted-foreground'
                    }`}
                  >
                    {num}
                  </span>
                ))}
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
