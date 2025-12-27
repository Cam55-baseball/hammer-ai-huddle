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
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Plus, Trash2, GripVertical } from 'lucide-react';
import { useMealPlanning, DayPlan, PlannedMeal } from '@/hooks/useMealPlanning';
import { AddPlannedMealDialog } from './AddPlannedMealDialog';
import { cn } from '@/lib/utils';

const TIME_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type TimeSlot = typeof TIME_SLOTS[number];

const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

interface DraggableMealCardProps {
  meal: PlannedMeal;
  onDelete: () => void;
}

function DraggableMealCard({ meal, onDelete }: DraggableMealCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: meal.id,
    data: { meal },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group p-2 bg-background border rounded-md text-xs hover:border-primary/50 transition-colors",
        isDragging && "shadow-lg"
      )}
    >
      <div className="flex items-start gap-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-0.5"
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <div className="flex-1 min-w-0">
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
      </div>
    </div>
  );
}

interface DroppableMealSlotProps {
  date: string;
  timeSlot: TimeSlot;
  meals: PlannedMeal[];
  onAddMeal: () => void;
  onDeleteMeal: (mealId: string) => void;
}

function DroppableMealSlot({ date, timeSlot, meals, onAddMeal, onDeleteMeal }: DroppableMealSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${date}-${timeSlot}`,
    data: { date, slot: timeSlot },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[60px] p-1 space-y-1 bg-muted/30 rounded border border-dashed transition-colors",
        isOver ? "border-primary bg-primary/10" : "border-border/50"
      )}
    >
      {meals.map((meal) => (
        <DraggableMealCard
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

export function MealPlanCalendar() {
  const { t } = useTranslation();
  const {
    weekStart,
    weekPlan,
    loading,
    addMeal,
    moveMeal,
    deleteMeal,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
  } = useMealPlanning();

  const [activeMeal, setActiveMeal] = useState<PlannedMeal | null>(null);
  const [addMealDialog, setAddMealDialog] = useState<{ open: boolean; date: string; timeSlot: string }>({
    open: false,
    date: '',
    timeSlot: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const meal = event.active.data.current?.meal as PlannedMeal;
    if (meal) {
      setActiveMeal(meal);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveMeal(null);
    
    const { active, over } = event;
    if (!over) return;

    const mealId = active.id as string;
    const targetData = over.data.current;
    
    if (targetData?.date && targetData?.slot) {
      await moveMeal(mealId, targetData.date, targetData.slot);
    }
  };

  const handleAddMealClick = (date: string, timeSlot: string) => {
    setAddMealDialog({ open: true, date, timeSlot });
  };

  const handleSaveMeal = async (meal: {
    meal_name: string;
    food_items: any[];
    estimated_calories: number;
    estimated_protein_g: number;
    estimated_carbs_g: number;
    estimated_fats_g: number;
  }) => {
    await addMeal({
      planned_date: addMealDialog.date,
      meal_type: addMealDialog.timeSlot,
      time_slot: addMealDialog.timeSlot,
      meal_name: meal.meal_name,
      food_items: meal.food_items,
      estimated_calories: meal.estimated_calories,
      estimated_protein_g: meal.estimated_protein_g,
      estimated_carbs_g: meal.estimated_carbs_g,
      estimated_fats_g: meal.estimated_fats_g,
      is_completed: false,
    });
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => ({
    date: format(addDays(weekStart, i), 'yyyy-MM-dd'),
    dayName: format(addDays(weekStart, i), 'EEE'),
    dayNum: format(addDays(weekStart, i), 'd'),
    isToday: format(addDays(weekStart, i), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
  }));

  return (
    <>
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
                    <DroppableMealSlot
                      key={`${day.date}-${slot}`}
                      date={day.date}
                      timeSlot={slot}
                      meals={day.meals[slot]}
                      onAddMeal={() => handleAddMealClick(day.date, slot)}
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
                  <div className="text-muted-foreground">
                    {activeMeal.estimated_calories}kcal
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </CardContent>
      </Card>

      <AddPlannedMealDialog
        open={addMealDialog.open}
        onOpenChange={(open) => setAddMealDialog(prev => ({ ...prev, open }))}
        date={addMealDialog.date}
        timeSlot={addMealDialog.timeSlot}
        onSave={handleSaveMeal}
      />
    </>
  );
}
