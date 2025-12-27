import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, addDays } from 'date-fns';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Plus, Trash2 } from 'lucide-react';
import { useMealPlanning, DayPlan, PlannedMeal } from '@/hooks/useMealPlanning';
import { cn } from '@/lib/utils';

const TIME_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type TimeSlot = typeof TIME_SLOTS[number];

const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

interface MealCardProps {
  meal: PlannedMeal;
  onDelete: () => void;
}

function MealCard({ meal, onDelete }: MealCardProps) {
  return (
    <div
      className="group p-2 bg-background border rounded-md text-xs cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
      data-meal-id={meal.id}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-medium truncate flex-1">{meal.meal_name}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="text-muted-foreground mt-0.5">
        {meal.estimated_calories}kcal • {meal.estimated_protein_g}g P
      </div>
    </div>
  );
}

interface MealSlotProps {
  date: string;
  timeSlot: TimeSlot;
  meals: PlannedMeal[];
  onAddMeal: () => void;
  onDeleteMeal: (mealId: string) => void;
}

function MealSlot({ date, timeSlot, meals, onAddMeal, onDeleteMeal }: MealSlotProps) {
  return (
    <div
      className="min-h-[60px] p-1 space-y-1 bg-muted/30 rounded border border-dashed border-border/50"
      data-date={date}
      data-slot={timeSlot}
    >
      {meals.map((meal) => (
        <MealCard
          key={meal.id}
          meal={meal}
          onDelete={() => onDeleteMeal(meal.id)}
        />
      ))}
      <button
        onClick={onAddMeal}
        className="w-full p-1 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 rounded transition-colors flex items-center justify-center gap-1"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

interface MealPlanCalendarProps {
  onAddMeal?: (date: string, timeSlot: string) => void;
}

export function MealPlanCalendar({ onAddMeal }: MealPlanCalendarProps) {
  const { t } = useTranslation();
  const {
    weekStart,
    weekPlan,
    loading,
    moveMeal,
    deleteMeal,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
  } = useMealPlanning();

  const [activeMeal, setActiveMeal] = useState<PlannedMeal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const mealId = event.active.id as string;
    // Find the meal in the week plan
    for (const day of weekPlan) {
      for (const slot of TIME_SLOTS) {
        const meal = day.meals[slot].find(m => m.id === mealId);
        if (meal) {
          setActiveMeal(meal);
          return;
        }
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveMeal(null);
    
    const { active, over } = event;
    if (!over) return;

    const mealId = active.id as string;
    const overElement = document.querySelector(`[data-date][data-slot]`);
    
    // Extract target from over.id or data attributes
    const targetDate = over.data?.current?.date;
    const targetSlot = over.data?.current?.slot;
    
    if (targetDate && targetSlot) {
      await moveMeal(mealId, targetDate, targetSlot);
    }
  };

  const handleAddMeal = (date: string, timeSlot: string) => {
    onAddMeal?.(date, timeSlot);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => ({
    date: format(addDays(weekStart, i), 'yyyy-MM-dd'),
    dayName: format(addDays(weekStart, i), 'EEE'),
    dayNum: format(addDays(weekStart, i), 'd'),
    isToday: format(addDays(weekStart, i), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
  }));

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            {t('nutrition.mealPlan.weeklyPlan', 'Weekly Meal Plan')}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={goToCurrentWeek}>
              {t('nutrition.mealPlan.today', 'Today')}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="min-w-[700px]">
            {/* Header */}
            <div className="grid grid-cols-8 gap-1 mb-2">
              <div className="text-xs font-medium text-muted-foreground p-1"></div>
              {weekDays.map((day) => (
                <div
                  key={day.date}
                  className={cn(
                    "text-center p-1 rounded",
                    day.isToday && "bg-primary/10"
                  )}
                >
                  <div className="text-xs text-muted-foreground">{day.dayName}</div>
                  <div className={cn(
                    "text-sm font-medium",
                    day.isToday && "text-primary"
                  )}>
                    {day.dayNum}
                  </div>
                </div>
              ))}
            </div>

            {/* Time slots */}
            {TIME_SLOTS.map((slot) => (
              <div key={slot} className="grid grid-cols-8 gap-1 mb-1">
                <div className="text-xs font-medium text-muted-foreground p-1 flex items-center">
                  {TIME_SLOT_LABELS[slot]}
                </div>
                {weekPlan.map((day) => (
                  <MealSlot
                    key={`${day.date}-${slot}`}
                    date={day.date}
                    timeSlot={slot}
                    meals={day.meals[slot]}
                    onAddMeal={() => handleAddMeal(day.date, slot)}
                    onDeleteMeal={deleteMeal}
                  />
                ))}
              </div>
            ))}

            {/* Daily totals */}
            <div className="grid grid-cols-8 gap-1 mt-2 pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground p-1">
                {t('nutrition.mealPlan.totals', 'Totals')}
              </div>
              {weekPlan.map((day) => (
                <div key={day.date} className="text-center text-xs p-1">
                  <div className="font-medium">{day.totals.calories}</div>
                  <div className="text-muted-foreground">kcal</div>
                </div>
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeMeal && (
              <div className="p-2 bg-background border rounded-md shadow-lg text-xs">
                <span className="font-medium">{activeMeal.meal_name}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  );
}
