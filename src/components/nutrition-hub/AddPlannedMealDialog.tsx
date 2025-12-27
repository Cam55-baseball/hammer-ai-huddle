import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UtensilsCrossed, BookOpen, Plus, X } from 'lucide-react';
import { useRecipes, Recipe } from '@/hooks/useRecipes';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface FoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

interface AddPlannedMealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  timeSlot: string;
  onSave: (meal: {
    meal_name: string;
    food_items: FoodItem[];
    estimated_calories: number;
    estimated_protein_g: number;
    estimated_carbs_g: number;
    estimated_fats_g: number;
  }) => void;
}

interface FoodSearchResult {
  id: string;
  name: string;
  brand?: string;
  calories_per_serving: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  serving_size?: string;
}

export function AddPlannedMealDialog({
  open,
  onOpenChange,
  date,
  timeSlot,
  onSave,
}: AddPlannedMealDialogProps) {
  const { t } = useTranslation();
  const { recipes } = useRecipes();
  const [tab, setTab] = useState<'custom' | 'recipe' | 'search'>('custom');
  const [mealName, setMealName] = useState('');
  const [selectedItems, setSelectedItems] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Custom item form
  const [customItem, setCustomItem] = useState<FoodItem>({
    name: '',
    quantity: 1,
    unit: 'serving',
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fats_g: 0,
  });

  useEffect(() => {
    if (!open) {
      setMealName('');
      setSelectedItems([]);
      setSearchQuery('');
      setSearchResults([]);
      setCustomItem({
        name: '',
        quantity: 1,
        unit: 'serving',
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fats_g: 0,
      });
    }
  }, [open]);

  const searchFoods = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('nutrition_food_database')
        .select('id, name, brand, calories_per_serving, protein_g, carbs_g, fats_g, serving_size')
        .ilike('name', `%${query}%`)
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching foods:', error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (tab === 'search') {
        searchFoods(searchQuery);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, tab]);

  const addFoodFromSearch = (food: FoodSearchResult) => {
    const newItem: FoodItem = {
      name: food.brand ? `${food.name} (${food.brand})` : food.name,
      quantity: 1,
      unit: food.serving_size || 'serving',
      calories: food.calories_per_serving || 0,
      protein_g: food.protein_g || 0,
      carbs_g: food.carbs_g || 0,
      fats_g: food.fats_g || 0,
    };
    setSelectedItems(prev => [...prev, newItem]);
  };

  const addRecipe = (recipe: Recipe) => {
    setMealName(recipe.name);
    const items: FoodItem[] = recipe.ingredients.map(ing => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      calories: ing.calories,
      protein_g: ing.protein_g,
      carbs_g: ing.carbs_g,
      fats_g: ing.fats_g,
    }));
    setSelectedItems(items);
  };

  const addCustomItem = () => {
    if (!customItem.name.trim()) return;
    setSelectedItems(prev => [...prev, { ...customItem }]);
    setCustomItem({
      name: '',
      quantity: 1,
      unit: 'serving',
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fats_g: 0,
    });
  };

  const removeItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  const totals = selectedItems.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein_g,
      carbs: acc.carbs + item.carbs_g,
      fats: acc.fats + item.fats_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const handleSave = () => {
    if (!mealName.trim() && selectedItems.length === 0) return;

    onSave({
      meal_name: mealName || selectedItems[0]?.name || 'Meal',
      food_items: selectedItems,
      estimated_calories: Math.round(totals.calories),
      estimated_protein_g: Math.round(totals.protein),
      estimated_carbs_g: Math.round(totals.carbs),
      estimated_fats_g: Math.round(totals.fats),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            {t('mealPlanning.addMeal', 'Add Meal')} - {timeSlot}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{date}</p>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="custom">{t('mealPlanning.custom', 'Custom')}</TabsTrigger>
            <TabsTrigger value="recipe">{t('mealPlanning.recipes', 'Recipes')}</TabsTrigger>
            <TabsTrigger value="search">{t('mealPlanning.search', 'Search')}</TabsTrigger>
          </TabsList>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t('mealPlanning.mealName', 'Meal Name')}</Label>
              <Input
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                placeholder="e.g., Grilled Chicken Salad"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">{t('nutrition.calories', 'Calories')}</Label>
                <Input
                  type="number"
                  value={customItem.calories}
                  onChange={(e) => setCustomItem(prev => ({ ...prev, calories: Number(e.target.value) }))}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">{t('nutrition.protein', 'Protein')} (g)</Label>
                <Input
                  type="number"
                  value={customItem.protein_g}
                  onChange={(e) => setCustomItem(prev => ({ ...prev, protein_g: Number(e.target.value) }))}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">{t('nutrition.carbs', 'Carbs')} (g)</Label>
                <Input
                  type="number"
                  value={customItem.carbs_g}
                  onChange={(e) => setCustomItem(prev => ({ ...prev, carbs_g: Number(e.target.value) }))}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">{t('nutrition.fats', 'Fats')} (g)</Label>
                <Input
                  type="number"
                  value={customItem.fats_g}
                  onChange={(e) => setCustomItem(prev => ({ ...prev, fats_g: Number(e.target.value) }))}
                  className="h-8"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recipe" className="mt-4">
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-2">
                {recipes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('mealPlanning.noRecipes', 'No recipes saved yet')}
                  </p>
                ) : (
                  recipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => addRecipe(recipe)}
                      className="w-full p-2 text-left rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{recipe.name}</span>
                        <BookOpen className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {recipe.total_calories} kcal • {recipe.total_protein_g}g P
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="search" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('mealPlanning.searchFoods', 'Search foods...')}
                className="pl-8"
              />
            </div>
            <ScrollArea className="h-40">
              <div className="space-y-1 pr-2">
                {searching ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
                ) : searchResults.length === 0 && searchQuery ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No results found</p>
                ) : (
                  searchResults.map((food) => (
                    <button
                      key={food.id}
                      onClick={() => addFoodFromSearch(food)}
                      className="w-full p-2 text-left rounded hover:bg-muted/50 transition-colors"
                    >
                      <div className="text-sm font-medium">{food.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {food.calories_per_serving} kcal • {food.protein_g}g P
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Selected items */}
        {selectedItems.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <Label className="text-xs text-muted-foreground">
              {t('mealPlanning.selectedItems', 'Selected Items')}
            </Label>
            <ScrollArea className="h-24 mt-2">
              <div className="space-y-1 pr-2">
                {selectedItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-1.5 bg-muted/50 rounded text-xs"
                  >
                    <span className="truncate flex-1">{item.name}</span>
                    <span className="text-muted-foreground mx-2">{item.calories} kcal</span>
                    <button
                      onClick={() => removeItem(index)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Totals */}
        <div className="border-t pt-3 mt-2">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 bg-muted/50 rounded">
              <div className="font-medium">{Math.round(totals.calories)}</div>
              <div className="text-muted-foreground">kcal</div>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <div className="font-medium">{Math.round(totals.protein)}g</div>
              <div className="text-muted-foreground">protein</div>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <div className="font-medium">{Math.round(totals.carbs)}g</div>
              <div className="text-muted-foreground">carbs</div>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <div className="font-medium">{Math.round(totals.fats)}g</div>
              <div className="text-muted-foreground">fats</div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!mealName.trim() && selectedItems.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            {t('mealPlanning.addToPlan', 'Add to Plan')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
