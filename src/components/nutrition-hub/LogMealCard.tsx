import { useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Utensils, ChevronDown, Star, Zap, Pill } from 'lucide-react';
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
  favoritesSlot?: ReactNode;
  quickActionsSlot?: ReactNode;
  supplementsSlot?: ReactNode;
}

interface SectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: ReactNode;
  label: string;
  children: ReactNode;
}

function CollapsibleSection({ open, onOpenChange, icon, label, children }: SectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between" size="sm">
          <span className="flex items-center gap-2 text-sm font-medium">
            {icon}
            {label}
          </span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function LogMealCard({
  onLogMeal,
  onSelectFood,
  favoritesSlot,
  quickActionsSlot,
  supplementsSlot,
}: LogMealCardProps) {
  const { t } = useTranslation();
  const [quickPickOpen, setQuickPickOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [supplementsOpen, setSupplementsOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Utensils className="h-5 w-5 text-green-500" />
          {t('nutrition.logMeal', 'Log Meal')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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

        <CollapsibleSection
          open={quickPickOpen}
          onOpenChange={setQuickPickOpen}
          icon={<Utensils className="h-4 w-4 text-green-500" />}
          label={t('nutrition.quickPickFoods', 'Quick Pick Foods')}
        >
          <CommonFoodsGallery onSelectFood={onSelectFood} />
        </CollapsibleSection>

        {favoritesSlot && (
          <CollapsibleSection
            open={favoritesOpen}
            onOpenChange={setFavoritesOpen}
            icon={<Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
            label={t('nutrition.favorites', 'Favorites')}
          >
            {favoritesSlot}
          </CollapsibleSection>
        )}

        {quickActionsSlot && (
          <CollapsibleSection
            open={quickActionsOpen}
            onOpenChange={setQuickActionsOpen}
            icon={<Zap className="h-4 w-4 text-blue-500" />}
            label={t('nutrition.quickActions', 'Quick Actions')}
          >
            {quickActionsSlot}
          </CollapsibleSection>
        )}

        {supplementsSlot && (
          <CollapsibleSection
            open={supplementsOpen}
            onOpenChange={setSupplementsOpen}
            icon={<Pill className="h-4 w-4 text-purple-500" />}
            label={t('nutrition.vitaminsSupplements', 'Vitamins & Supplements')}
          >
            {supplementsSlot}
          </CollapsibleSection>
        )}
      </CardContent>
    </Card>
  );
}
