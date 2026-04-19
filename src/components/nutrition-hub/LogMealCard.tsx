import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Utensils, ChevronDown } from 'lucide-react';
import { MEAL_TYPES } from './MealTypeSelector';
import { CommonFoodsGallery } from './CommonFoodsGallery';
import { cn } from '@/lib/utils';

interface LogMealCardProps {
  onLogMeal: (mealType: string) => void;
  onSelectFood: (food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    servingSize: string;
  }) => void;
}

export function LogMealCard({ onLogMeal, onSelectFood }: LogMealCardProps) {
  const { t } = useTranslation();
  const [quickPickOpen, setQuickPickOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Utensils className="h-5 w-5 text-green-500" />
          {t('nutrition.logMeal', 'Log Meal')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {MEAL_TYPES.map((type) => (
            <Button
              key={type.value}
              variant="outline"
              size="sm"
              className="flex-col h-auto py-3 gap-1 hover:bg-green-500/10 hover:border-green-500/50"
              onClick={() => onLogMeal(type.value)}
            >
              <span className="text-lg">{type.icon}</span>
              <span className="text-xs">
                {t(`nutrition.mealTypes.${type.value}`, type.label)}
              </span>
            </Button>
          ))}
        </div>

        <Collapsible open={quickPickOpen} onOpenChange={setQuickPickOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between"
              size="sm"
            >
              <span className="text-sm font-medium">
                {t('nutrition.quickPickFoods', 'Quick Pick Foods')}
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  quickPickOpen && 'rotate-180'
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <CommonFoodsGallery onSelectFood={onSelectFood} />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
