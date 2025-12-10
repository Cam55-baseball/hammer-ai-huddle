import { useState, useMemo } from 'react';
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
import { Apple, Droplets, Pill, ChevronDown, CheckCircle, Plus, X, Coffee, Salad, UtensilsCrossed, Cookie, Zap, Dumbbell, Trash2, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
  logged_at: string | null;
}

interface VaultNutritionLogCardProps {
  todaysLogs: NutritionLog[];
  onSave: (data: Omit<NutritionLog, 'id' | 'logged_at'>) => Promise<{ success: boolean }>;
  onDelete: (id: string) => Promise<{ success: boolean }>;
  isLoading?: boolean;
}

// Macro presets with common meal values
const MACRO_PRESETS = [
  { id: 'pre_workout', calories: 350, protein: 20, carbs: 50, fats: 8, icon: Zap },
  { id: 'post_workout', calories: 500, protein: 40, carbs: 60, fats: 12, icon: Dumbbell },
  { id: 'protein_shake', calories: 200, protein: 30, carbs: 10, fats: 5, icon: Droplets },
  { id: 'light_breakfast', calories: 400, protein: 20, carbs: 45, fats: 15, icon: Coffee },
  { id: 'power_lunch', calories: 700, protein: 45, carbs: 70, fats: 25, icon: Salad },
  { id: 'recovery_dinner', calories: 650, protein: 40, carbs: 65, fats: 22, icon: UtensilsCrossed },
  { id: 'healthy_snack', calories: 200, protein: 10, carbs: 25, fats: 8, icon: Cookie },
  { id: 'hydration_only', calories: 0, protein: 0, carbs: 0, fats: 0, icon: Droplets },
];

export function VaultNutritionLogCard({ todaysLogs, onSave, onDelete, isLoading = false }: VaultNutritionLogCardProps) {
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Form state
  const [mealType, setMealType] = useState<string>('');
  const [calories, setCalories] = useState<string>('');
  const [protein, setProtein] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [fats, setFats] = useState<string>('');
  const [hydration, setHydration] = useState<string>('');
  const [energyLevel, setEnergyLevel] = useState<number[]>([5]);
  const [digestionNotes, setDigestionNotes] = useState('');
  const [supplements, setSupplements] = useState<string[]>([]);
  const [newSupplement, setNewSupplement] = useState('');

  // Calculate daily totals
  const dailyTotals = useMemo(() => {
    return todaysLogs.reduce((acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein_g || 0),
      carbs: acc.carbs + (log.carbs_g || 0),
      fats: acc.fats + (log.fats_g || 0),
      hydration: acc.hydration + (log.hydration_oz || 0),
      energySum: acc.energySum + (log.energy_level || 0),
      energyCount: acc.energyCount + (log.energy_level ? 1 : 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, hydration: 0, energySum: 0, energyCount: 0 });
  }, [todaysLogs]);

  const avgEnergy = dailyTotals.energyCount > 0 
    ? Math.round(dailyTotals.energySum / dailyTotals.energyCount) 
    : 0;

  const resetForm = () => {
    setMealType('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
    setHydration('');
    setEnergyLevel([5]);
    setDigestionNotes('');
    setSupplements([]);
    setNewSupplement('');
  };

  const applyPreset = (preset: typeof MACRO_PRESETS[0]) => {
    setCalories(preset.calories.toString());
    setProtein(preset.protein.toString());
    setCarbs(preset.carbs.toString());
    setFats(preset.fats.toString());
    if (preset.id === 'hydration_only') {
      setMealType('hydration');
    }
  };

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
    const result = await onSave({
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
    if (result.success) {
      toast.success(t('vault.nutrition.mealLogged'));
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  const handleLogEntry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
  };

  const hasData = todaysLogs.length > 0;

  const mealTypeOptions = [
    { value: 'breakfast', icon: Coffee, label: t('vault.nutrition.breakfast') },
    { value: 'lunch', icon: Salad, label: t('vault.nutrition.lunch') },
    { value: 'dinner', icon: UtensilsCrossed, label: t('vault.nutrition.dinner') },
    { value: 'snack', icon: Cookie, label: t('vault.nutrition.snack') },
    { value: 'hydration', icon: Droplets, label: t('vault.nutrition.hydrationOnly') },
  ];

  const getMealIcon = (type: string | null) => {
    const option = mealTypeOptions.find(o => o.value === type);
    return option ? option.icon : Apple;
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'h:mm a');
    } catch {
      return '';
    }
  };

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
            {/* Quick Presets */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('vault.nutrition.presets')}</Label>
              <div className="flex flex-wrap gap-1.5">
                {MACRO_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => applyPreset(preset)}
                  >
                    <preset.icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{t(`vault.nutrition.${preset.id}`)}</span>
                  </Button>
                ))}
              </div>
            </div>

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
              {saving ? t('common.loading') : t('vault.nutrition.logThisMeal')}
            </Button>

            {/* Today's Meals History */}
            {todaysLogs.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">{t('vault.nutrition.todaysMeals')}</Label>
                  <Badge variant="secondary" className="text-xs">{todaysLogs.length}</Badge>
                </div>
                
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {todaysLogs.map((log) => {
                    const MealIcon = getMealIcon(log.meal_type);
                    return (
                      <div 
                        key={log.id} 
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <MealIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">
                              {log.meal_type ? t(`vault.nutrition.${log.meal_type}`) : t('vault.nutrition.meal')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(log.logged_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {log.calories || 0} cal • {log.protein_g || 0}P • {log.carbs_g || 0}C • {log.fats_g || 0}F
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(log.id)}
                            disabled={deletingId === log.id}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Daily Totals Summary */}
            {todaysLogs.length > 0 && (
              <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">{t('vault.nutrition.dailyTotals')}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div>
                    <div className="font-bold text-foreground">{dailyTotals.calories}</div>
                    <div className="text-muted-foreground">cal</div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{Math.round(dailyTotals.protein)}g</div>
                    <div className="text-muted-foreground">protein</div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{Math.round(dailyTotals.carbs)}g</div>
                    <div className="text-muted-foreground">carbs</div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{Math.round(dailyTotals.fats)}g</div>
                    <div className="text-muted-foreground">fats</div>
                  </div>
                  <div>
                    <div className="font-bold text-blue-500">{Math.round(dailyTotals.hydration)} oz</div>
                    <div className="text-muted-foreground">water</div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{avgEnergy}/10</div>
                    <div className="text-muted-foreground">energy</div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {todaysLogs.length === 0 && (
              <Alert className="bg-muted/50">
                <Apple className="h-4 w-4" />
                <AlertDescription>{t('vault.nutrition.noMealsLogged')}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}