import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentFoods } from '@/hooks/useRecentFoods';
import { MealTypeSelector } from './MealTypeSelector';

interface FoodItem {
  id: string;
  name: string;
  brand?: string | null;
  caloriesPerServing?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fats?: number | null;
  servingSize?: string | null;
}

interface FavoriteFoodsWidgetProps {
  onQuickAdd: (food: FoodItem, mealType: string) => void;
}

export function FavoriteFoodsWidget({ onQuickAdd }: FavoriteFoodsWidgetProps) {
  const { t } = useTranslation();
  const { favoriteFoods, loading } = useRecentFoods();
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [mealTypeSelectorOpen, setMealTypeSelectorOpen] = useState(false);

  // Don't render if no favorites and not loading
  if (!loading && favoriteFoods.length === 0) {
    return null;
  }

  const handleFoodClick = (food: FoodItem) => {
    setSelectedFood(food);
    setMealTypeSelectorOpen(true);
  };

  const handleMealTypeSelected = (mealType: string) => {
    if (selectedFood) {
      onQuickAdd(selectedFood, mealType);
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(30);
    }
    setSelectedFood(null);
    setMealTypeSelectorOpen(false);
  };

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          {t('nutrition.favorites', 'Favorites')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {loading ? (
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14 flex-1 min-w-[100px]" />
            ))}
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {favoriteFoods.map(food => (
              <Button
                key={food.id}
                variant="outline"
                className="flex-shrink-0 h-auto py-2 px-3 flex-col items-start min-w-[100px] max-w-[140px]
                           hover:bg-amber-500/10 hover:border-amber-500/50 transition-colors"
                onClick={() => handleFoodClick(food)}
              >
                <span className="text-xs font-medium truncate w-full text-left">
                  {food.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {food.caloriesPerServing || 0} cal
                </span>
              </Button>
            ))}
          </div>
        )}

        <MealTypeSelector
          open={mealTypeSelectorOpen}
          onOpenChange={setMealTypeSelectorOpen}
          onSelect={handleMealTypeSelected}
          title={t('nutrition.selectMealTypeFor', 'Add to which meal?')}
        />
      </CardContent>
    </Card>
  );
}
