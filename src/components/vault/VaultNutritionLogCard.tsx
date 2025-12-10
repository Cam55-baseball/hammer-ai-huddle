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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Apple, Droplets, Pill, ChevronDown, CheckCircle, Plus, X, Coffee, Salad, UtensilsCrossed, Cookie, Zap, Dumbbell, Trash2, Clock, Settings, Flame, FlameKindling, AlertTriangle, Heart, Star, Lightbulb } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { VaultFavoriteMeal } from '@/hooks/useVault';

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

interface NutritionGoals {
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fats_goal: number;
  hydration_goal: number;
}

interface VaultNutritionLogCardProps {
  todaysLogs: NutritionLog[];
  goals: NutritionGoals | null;
  favoriteMeals: VaultFavoriteMeal[];
  onSave: (data: Omit<NutritionLog, 'id' | 'logged_at'>) => Promise<{ success: boolean }>;
  onDelete: (id: string) => Promise<{ success: boolean }>;
  onSaveGoals: (goals: NutritionGoals) => Promise<{ success: boolean }>;
  onSaveFavorite: (meal: Omit<VaultFavoriteMeal, 'id' | 'usage_count' | 'created_at' | 'last_used_at'>) => Promise<{ success: boolean }>;
  onDeleteFavorite: (id: string) => Promise<{ success: boolean }>;
  onUseFavorite: (favorite: VaultFavoriteMeal) => Promise<{ success: boolean }>;
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

const DEFAULT_GOALS: NutritionGoals = {
  calorie_goal: 2000,
  protein_goal: 150,
  carbs_goal: 250,
  fats_goal: 70,
  hydration_goal: 100,
};

export function VaultNutritionLogCard({ 
  todaysLogs, 
  goals, 
  favoriteMeals,
  onSave, 
  onDelete, 
  onSaveGoals,
  onSaveFavorite,
  onDeleteFavorite,
  onUseFavorite,
  isLoading = false 
}: VaultNutritionLogCardProps) {
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [saveFavoriteDialogOpen, setSaveFavoriteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingFavoriteId, setDeletingFavoriteId] = useState<string | null>(null);
  const [usingFavoriteId, setUsingFavoriteId] = useState<string | null>(null);
  
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
  
  // Favorite meal name
  const [favoriteMealName, setFavoriteMealName] = useState('');

  // Goals form state
  const currentGoals = goals || DEFAULT_GOALS;
  const [goalCalories, setGoalCalories] = useState(currentGoals.calorie_goal.toString());
  const [goalProtein, setGoalProtein] = useState(currentGoals.protein_goal.toString());
  const [goalCarbs, setGoalCarbs] = useState(currentGoals.carbs_goal.toString());
  const [goalFats, setGoalFats] = useState(currentGoals.fats_goal.toString());
  const [goalHydration, setGoalHydration] = useState(currentGoals.hydration_goal.toString());

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

  // Calculate progress percentages
  const getProgress = (current: number, goal: number) => {
    if (goal === 0) return 0;
    return Math.round((current / goal) * 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage > 110) return 'bg-destructive';
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-destructive';
  };

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

  const handleSaveGoals = async () => {
    setSavingGoals(true);
    const result = await onSaveGoals({
      calorie_goal: parseInt(goalCalories) || DEFAULT_GOALS.calorie_goal,
      protein_goal: parseInt(goalProtein) || DEFAULT_GOALS.protein_goal,
      carbs_goal: parseInt(goalCarbs) || DEFAULT_GOALS.carbs_goal,
      fats_goal: parseInt(goalFats) || DEFAULT_GOALS.fats_goal,
      hydration_goal: parseInt(goalHydration) || DEFAULT_GOALS.hydration_goal,
    });
    setSavingGoals(false);
    if (result.success) {
      toast.success(t('vault.nutrition.goalsSaved'));
      setGoalsDialogOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  const handleSaveFavorite = async () => {
    if (!favoriteMealName.trim()) {
      toast.error(t('vault.nutrition.enterMealName'));
      return;
    }
    setSavingFavorite(true);
    const result = await onSaveFavorite({
      meal_name: favoriteMealName.trim(),
      calories: calories ? parseInt(calories) : null,
      protein_g: protein ? parseFloat(protein) : null,
      carbs_g: carbs ? parseFloat(carbs) : null,
      fats_g: fats ? parseFloat(fats) : null,
      hydration_oz: hydration ? parseFloat(hydration) : null,
      meal_type: mealType || null,
      supplements,
    });
    setSavingFavorite(false);
    if (result.success) {
      toast.success(t('vault.nutrition.savedAsFavorite'));
      setFavoriteMealName('');
      setSaveFavoriteDialogOpen(false);
    }
  };

  const handleDeleteFavorite = async (id: string) => {
    setDeletingFavoriteId(id);
    await onDeleteFavorite(id);
    setDeletingFavoriteId(null);
    toast.success(t('vault.nutrition.favoriteRemoved'));
  };

  const handleUseFavorite = async (favorite: VaultFavoriteMeal) => {
    setUsingFavoriteId(favorite.id);
    const result = await onUseFavorite(favorite);
    setUsingFavoriteId(null);
    if (result.success) {
      toast.success(t('vault.nutrition.addedFromFavorite'));
    }
  };

  const handleLogEntry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
  };

  const hasData = todaysLogs.length > 0;
  const hasFavorites = favoriteMeals.length > 0;

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

  // Progress bar items
  const progressItems = [
    { key: 'calories', label: t('vault.nutrition.calories'), current: dailyTotals.calories, goal: currentGoals.calorie_goal, unit: '', icon: Flame, iconColor: 'text-orange-500' },
    { key: 'protein', label: t('vault.nutrition.protein'), current: Math.round(dailyTotals.protein), goal: currentGoals.protein_goal, unit: 'g', icon: FlameKindling, iconColor: 'text-red-500' },
    { key: 'carbs', label: t('vault.nutrition.carbs'), current: Math.round(dailyTotals.carbs), goal: currentGoals.carbs_goal, unit: 'g', icon: Cookie, iconColor: 'text-amber-500' },
    { key: 'fats', label: t('vault.nutrition.fats'), current: Math.round(dailyTotals.fats), goal: currentGoals.fats_goal, unit: 'g', icon: Droplets, iconColor: 'text-green-500' },
    { key: 'hydration', label: t('vault.nutrition.hydration'), current: Math.round(dailyTotals.hydration), goal: currentGoals.hydration_goal, unit: 'oz', icon: Droplets, iconColor: 'text-blue-500' },
  ];

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
            {/* Favorite Meals Section */}
            <Collapsible open={favoritesOpen} onOpenChange={setFavoritesOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20 cursor-pointer hover:bg-amber-500/15 transition-colors">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">{t('vault.nutrition.favoriteMeals')}</span>
                    {hasFavorites && <Badge variant="secondary" className="text-xs">{favoriteMeals.length}</Badge>}
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${favoritesOpen ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                {/* Hint about favorites */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 mb-3 text-sm">
                  <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{t('vault.nutrition.favoriteMealsHint')}</span>
                </div>
                
                {hasFavorites ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {favoriteMeals.map((fav) => {
                      const MealIcon = getMealIcon(fav.meal_type);
                      return (
                        <div 
                          key={fav.id} 
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <MealIcon className="h-4 w-4 flex-shrink-0 text-amber-500" />
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate">{fav.meal_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {fav.calories || 0} cal • {fav.protein_g || 0}P • {fav.carbs_g || 0}C
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {t('vault.nutrition.usedTimes', { count: fav.usage_count || 0 })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleUseFavorite(fav)}
                              disabled={usingFavoriteId === fav.id}
                            >
                              <Plus className="h-3 w-3" />
                              {t('vault.nutrition.quickAdd')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteFavorite(fav.id)}
                              disabled={deletingFavoriteId === fav.id}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <Star className="h-6 w-6 mx-auto mb-1 opacity-50" />
                    {t('vault.nutrition.noFavorites')}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

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

            {/* Save Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? t('common.loading') : t('vault.nutrition.logThisMeal')}
              </Button>
              
              {/* Save to Favorites Dialog */}
              <Dialog open={saveFavoriteDialogOpen} onOpenChange={setSaveFavoriteDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    disabled={!calories && !protein && !carbs && !fats}
                    title={t('vault.nutrition.saveToFavorites')}
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-amber-500" />
                      {t('vault.nutrition.saveToFavorites')}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{t('vault.nutrition.mealName')}</Label>
                      <Input
                        value={favoriteMealName}
                        onChange={(e) => setFavoriteMealName(e.target.value)}
                        placeholder={t('vault.nutrition.enterMealName')}
                      />
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-sm">
                      <p>{calories || 0} cal • {protein || 0}g P • {carbs || 0}g C • {fats || 0}g F</p>
                      {mealType && <p className="text-muted-foreground text-xs mt-1">{t(`vault.nutrition.${mealType}`)}</p>}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => setSaveFavoriteDialogOpen(false)} className="flex-1">
                        {t('common.cancel')}
                      </Button>
                      <Button onClick={handleSaveFavorite} disabled={savingFavorite} className="flex-1">
                        {savingFavorite ? t('common.loading') : t('common.save')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

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

            {/* Daily Progress with Goal Tracking */}
            {todaysLogs.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">{t('vault.nutrition.dailyProgress')}</span>
                  </div>
                  <Dialog open={goalsDialogOpen} onOpenChange={setGoalsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                        <Settings className="h-3 w-3" />
                        {t('vault.nutrition.setGoals')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          {t('vault.nutrition.setGoals')}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>{t('vault.nutrition.calorieGoal')}</Label>
                          <Input
                            type="number"
                            value={goalCalories}
                            onChange={(e) => setGoalCalories(e.target.value)}
                            placeholder="2000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('vault.nutrition.proteinGoal')}</Label>
                          <Input
                            type="number"
                            value={goalProtein}
                            onChange={(e) => setGoalProtein(e.target.value)}
                            placeholder="150"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('vault.nutrition.carbsGoal')}</Label>
                          <Input
                            type="number"
                            value={goalCarbs}
                            onChange={(e) => setGoalCarbs(e.target.value)}
                            placeholder="250"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('vault.nutrition.fatsGoal')}</Label>
                          <Input
                            type="number"
                            value={goalFats}
                            onChange={(e) => setGoalFats(e.target.value)}
                            placeholder="70"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('vault.nutrition.hydrationGoal')}</Label>
                          <Input
                            type="number"
                            value={goalHydration}
                            onChange={(e) => setGoalHydration(e.target.value)}
                            placeholder="100"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" onClick={() => setGoalsDialogOpen(false)} className="flex-1">
                            {t('common.cancel')}
                          </Button>
                          <Button onClick={handleSaveGoals} disabled={savingGoals} className="flex-1">
                            {savingGoals ? t('common.loading') : t('common.save')}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3">
                  {progressItems.map((item) => {
                    const percentage = getProgress(item.current, item.goal);
                    const isOver = percentage > 100;
                    return (
                      <div key={item.key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <item.icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                            <span className="text-muted-foreground">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">
                              {item.current} / {item.goal}{item.unit}
                            </span>
                            <span className={`text-xs ${percentage >= 90 && percentage <= 110 ? 'text-green-500' : percentage >= 50 ? 'text-amber-500' : 'text-destructive'}`}>
                              {percentage}%
                            </span>
                            {isOver && (
                              <Badge variant="destructive" className="h-4 px-1 text-[10px] gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {t('vault.nutrition.overGoal')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Progress 
                          value={Math.min(percentage, 100)} 
                          className="h-2"
                          indicatorClassName={getProgressColor(percentage)}
                        />
                      </div>
                    );
                  })}

                  {/* Energy Level */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t">
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-muted-foreground">{t('vault.nutrition.energyLevel')}</span>
                    </div>
                    <span className="font-medium">{avgEnergy}/10</span>
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