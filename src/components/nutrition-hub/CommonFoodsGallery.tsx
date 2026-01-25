import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: string;
  category: 'fruits' | 'proteins' | 'grains' | 'dairy' | 'drinks' | 'snacks';
}

const COMMON_FOODS: FoodItem[] = [
  // Fruits
  { id: 'apple', name: 'Apple', emoji: '🍎', calories: 95, protein: 0, carbs: 25, fats: 0, servingSize: '1 medium', category: 'fruits' },
  { id: 'banana', name: 'Banana', emoji: '🍌', calories: 105, protein: 1, carbs: 27, fats: 0, servingSize: '1 medium', category: 'fruits' },
  { id: 'orange', name: 'Orange', emoji: '🍊', calories: 62, protein: 1, carbs: 15, fats: 0, servingSize: '1 medium', category: 'fruits' },
  { id: 'grapes', name: 'Grapes', emoji: '🍇', calories: 62, protein: 1, carbs: 16, fats: 0, servingSize: '1 cup', category: 'fruits' },
  { id: 'strawberries', name: 'Strawberries', emoji: '🍓', calories: 49, protein: 1, carbs: 12, fats: 0, servingSize: '1 cup', category: 'fruits' },
  { id: 'watermelon', name: 'Watermelon', emoji: '🍉', calories: 46, protein: 1, carbs: 12, fats: 0, servingSize: '1 cup', category: 'fruits' },
  
  // Proteins
  { id: 'chicken_breast', name: 'Chicken Breast', emoji: '🍗', calories: 165, protein: 31, carbs: 0, fats: 4, servingSize: '3 oz cooked', category: 'proteins' },
  { id: 'eggs', name: 'Eggs', emoji: '🥚', calories: 78, protein: 6, carbs: 1, fats: 5, servingSize: '1 large', category: 'proteins' },
  { id: 'steak', name: 'Steak', emoji: '🥩', calories: 207, protein: 26, carbs: 0, fats: 11, servingSize: '3 oz', category: 'proteins' },
  { id: 'fish', name: 'Fish', emoji: '🐟', calories: 136, protein: 22, carbs: 0, fats: 5, servingSize: '3 oz', category: 'proteins' },
  { id: 'turkey', name: 'Turkey', emoji: '🦃', calories: 135, protein: 24, carbs: 0, fats: 4, servingSize: '3 oz', category: 'proteins' },
  
  // Grains & Carbs
  { id: 'rice', name: 'Rice', emoji: '🍚', calories: 206, protein: 4, carbs: 45, fats: 0, servingSize: '1 cup cooked', category: 'grains' },
  { id: 'bread', name: 'Bread', emoji: '🍞', calories: 79, protein: 3, carbs: 15, fats: 1, servingSize: '1 slice', category: 'grains' },
  { id: 'pasta', name: 'Pasta', emoji: '🍝', calories: 220, protein: 8, carbs: 43, fats: 1, servingSize: '1 cup cooked', category: 'grains' },
  { id: 'oatmeal', name: 'Oatmeal', emoji: '🥣', calories: 158, protein: 6, carbs: 27, fats: 3, servingSize: '1 cup cooked', category: 'grains' },
  { id: 'cereal', name: 'Cereal', emoji: '🥣', calories: 120, protein: 2, carbs: 26, fats: 1, servingSize: '1 cup', category: 'grains' },
  
  // Dairy
  { id: 'milk', name: 'Milk', emoji: '🥛', calories: 103, protein: 8, carbs: 12, fats: 2, servingSize: '1 cup', category: 'dairy' },
  { id: 'cheese', name: 'Cheese', emoji: '🧀', calories: 113, protein: 7, carbs: 0, fats: 9, servingSize: '1 oz', category: 'dairy' },
  { id: 'yogurt', name: 'Yogurt', emoji: '🥛', calories: 100, protein: 17, carbs: 6, fats: 1, servingSize: '1 cup', category: 'dairy' },
  
  // Drinks
  { id: 'water', name: 'Water', emoji: '💧', calories: 0, protein: 0, carbs: 0, fats: 0, servingSize: '8 oz', category: 'drinks' },
  { id: 'orange_juice', name: 'Orange Juice', emoji: '🧃', calories: 112, protein: 2, carbs: 26, fats: 0, servingSize: '1 cup', category: 'drinks' },
  { id: 'chocolate_milk', name: 'Chocolate Milk', emoji: '🥛', calories: 208, protein: 8, carbs: 26, fats: 8, servingSize: '1 cup', category: 'drinks' },
  { id: 'smoothie', name: 'Smoothie', emoji: '🥤', calories: 150, protein: 5, carbs: 30, fats: 2, servingSize: '1 cup', category: 'drinks' },
  
  // Snacks
  { id: 'peanut_butter', name: 'Peanut Butter', emoji: '🥜', calories: 188, protein: 8, carbs: 6, fats: 16, servingSize: '2 tbsp', category: 'snacks' },
  { id: 'crackers', name: 'Crackers', emoji: '🍘', calories: 120, protein: 3, carbs: 20, fats: 3, servingSize: '6 crackers', category: 'snacks' },
  { id: 'granola_bar', name: 'Granola Bar', emoji: '🍫', calories: 120, protein: 2, carbs: 20, fats: 4, servingSize: '1 bar', category: 'snacks' },
  { id: 'pizza', name: 'Pizza', emoji: '🍕', calories: 285, protein: 12, carbs: 36, fats: 10, servingSize: '1 slice', category: 'snacks' },
  { id: 'sandwich', name: 'Sandwich', emoji: '🥪', calories: 350, protein: 15, carbs: 35, fats: 15, servingSize: '1 sandwich', category: 'snacks' },
  { id: 'tacos', name: 'Tacos', emoji: '🌮', calories: 226, protein: 9, carbs: 20, fats: 12, servingSize: '1 taco', category: 'snacks' },
  { id: 'burrito', name: 'Burrito', emoji: '🌯', calories: 431, protein: 18, carbs: 50, fats: 18, servingSize: '1 burrito', category: 'snacks' },
];

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '⭐' },
  { id: 'fruits', label: 'Fruits', emoji: '🍎' },
  { id: 'proteins', label: 'Proteins', emoji: '🍗' },
  { id: 'grains', label: 'Grains', emoji: '🍚' },
  { id: 'dairy', label: 'Dairy', emoji: '🥛' },
  { id: 'drinks', label: 'Drinks', emoji: '💧' },
  { id: 'snacks', label: 'Snacks', emoji: '🍕' },
];

interface CommonFoodsGalleryProps {
  onSelectFood: (food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    servingSize: string;
  }) => void;
  className?: string;
}

export function CommonFoodsGallery({ onSelectFood, className }: CommonFoodsGalleryProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredFoods = selectedCategory === 'all' 
    ? COMMON_FOODS 
    : COMMON_FOODS.filter(f => f.category === selectedCategory);

  const displayedFoods = isExpanded ? filteredFoods : filteredFoods.slice(0, 12);

  const handleFoodClick = (food: FoodItem) => {
    onSelectFood({
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      servingSize: food.servingSize,
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-medium">
          {t('nutrition.quickPick', 'Quick Pick')}
        </h3>
        <span className="text-xs text-muted-foreground">
          {t('nutrition.tapToAdd', 'Tap to add')}
        </span>
      </div>

      {/* Category Filter */}
      <ScrollArea className="w-full">
        <div className="flex gap-1 pb-2">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                "flex-shrink-0 gap-1 h-8 px-3 text-xs",
                selectedCategory === cat.id && "bg-primary/10 text-primary"
              )}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span>{cat.emoji}</span>
              <span className="hidden sm:inline">{cat.label}</span>
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Food Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {displayedFoods.map((food) => (
          <button
            key={food.id}
            onClick={() => handleFoodClick(food)}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-lg border",
              "bg-card hover:bg-accent hover:border-primary/50 transition-all",
              "active:scale-95 touch-manipulation",
              "min-h-[72px]"
            )}
          >
            <span className="text-2xl mb-1">{food.emoji}</span>
            <span className="text-[10px] text-center font-medium leading-tight line-clamp-2">
              {food.name}
            </span>
            <span className="text-[9px] text-muted-foreground">
              {food.calories} cal
            </span>
          </button>
        ))}
      </div>

      {/* Show more button */}
      {filteredFoods.length > 12 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs gap-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? t('common.showLess', 'Show less') : t('common.showMore', 'Show more')}
          <ChevronRight className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")} />
        </Button>
      )}
    </div>
  );
}
