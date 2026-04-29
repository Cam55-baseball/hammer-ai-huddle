import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Clock, Trash2, Edit2, Utensils, ShieldCheck, Bot, FileQuestion } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DIGESTION_TAGS } from '@/constants/nutritionLogging';

export interface MealLogData {
  id: string;
  mealType?: string | null;
  mealTitle?: string | null;
  loggedAt: string;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatsG?: number | null;
  supplements?: string[] | null;
  mealTime?: string | null;
  digestionNotes?: string | null;
  micros?: Record<string, number> | null;
  dataSource?: string | null;
  dataConfidence?: string | null;
}

interface MealLogCardProps {
  meal: MealLogData;
  onEdit?: (mealId: string) => void;
  onDelete?: (mealId: string) => void;
}

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
  lunch: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
  dinner: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  snack: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
  pre_workout: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
  post_workout: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
};

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  pre_workout: 'Pre-Workout',
  post_workout: 'Post-Workout',
};

const SOURCE_BADGE: Record<string, { label: string; cls: string; icon: typeof ShieldCheck }> = {
  database: { label: 'Verified', cls: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30', icon: ShieldCheck },
  ai: { label: 'Hammer Estimated', cls: 'text-amber-600 bg-amber-500/10 border-amber-500/30', icon: Bot },
  mixed: { label: 'Mixed', cls: 'text-amber-600 bg-amber-500/10 border-amber-500/30', icon: Bot },
};

const CONFIDENCE_LABEL: Record<string, { text: string; cls: string }> = {
  high: { text: 'High confidence', cls: 'text-emerald-600' },
  medium: { text: 'Estimated', cls: 'text-amber-600' },
  low: { text: 'Low confidence', cls: 'text-destructive' },
};

// Set of known tag values for chip rendering
const KNOWN_TAG_VALUES = new Set(DIGESTION_TAGS.map(t => t.value));

export function MealLogCard({ meal, onEdit, onDelete }: MealLogCardProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const mealTypeKey = meal.mealType?.toLowerCase().replace('-', '_') || 'snack';
  const mealTypeColor = MEAL_TYPE_COLORS[mealTypeKey] || MEAL_TYPE_COLORS.snack;
  const mealTypeLabel = MEAL_TYPE_LABELS[mealTypeKey] || meal.mealType || 'Meal';

  const hasMacros = meal.proteinG || meal.carbsG || meal.fatsG;
  const hasSupplements = meal.supplements && meal.supplements.length > 0;
  const hasMicros = meal.micros && Object.keys(meal.micros).length > 0;

  // Data source badge
  const sourceKey = meal.dataSource || 'manual';
  const sourceBadge = SOURCE_BADGE[sourceKey] || { label: 'Manual', cls: 'text-muted-foreground bg-muted/50 border-border', icon: FileQuestion };
  const SourceIcon = sourceBadge.icon;

  // Confidence label
  const confidenceKey = meal.dataConfidence || 'low';
  const confidence = CONFIDENCE_LABEL[confidenceKey] || CONFIDENCE_LABEL.low;

  // Parse digestion notes into chips (known tags) + freeform text
  const parsedDigestionNotes = meal.digestionNotes
    ? meal.digestionNotes.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const knownTags = parsedDigestionNotes.filter(n => KNOWN_TAG_VALUES.has(n));
  const freeformNotes = parsedDigestionNotes.filter(n => !KNOWN_TAG_VALUES.has(n)).join(', ');
  const hasDigestion = parsedDigestionNotes.length > 0;

  // Display time: prefer user-entered meal_time, fall back to logged-at
  const displayTime = meal.mealTime || format(new Date(meal.loggedAt), 'h:mm a');
  const isEatenTime = !!meal.mealTime;

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors">
            {/* Meal type icon */}
            <div className={cn("p-2 rounded-lg border", mealTypeColor)}>
              <Utensils className="h-4 w-4" />
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium truncate">
                  {meal.mealTitle || mealTypeLabel}
                </span>
                {meal.mealTitle && (
                  <Badge variant="outline" className={cn("text-xs", mealTypeColor)}>
                    {mealTypeLabel}
                  </Badge>
                )}
                {/* Data source badge */}
                <Badge variant="outline" className={cn("text-[10px] gap-0.5 py-0", sourceBadge.cls)}>
                  <SourceIcon className="h-2.5 w-2.5" />
                  {sourceBadge.label}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>
                  {isEatenTime ? (
                    <><span className="text-foreground/60">Eaten at</span> {displayTime}</>
                  ) : (
                    displayTime
                  )}
                </span>
                <span className="mx-0.5">·</span>
                <span className={cn("text-[10px]", confidence.cls)}>{confidence.text}</span>
              </div>
            </div>

            {/* Calories */}
            {meal.calories && (
              <div className="text-right">
                <span className="font-bold text-lg">{meal.calories}</span>
                <span className="text-xs text-muted-foreground ml-1">cal</span>
              </div>
            )}

            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 border-t pt-3">
            {/* Macros breakdown */}
            {hasMacros && (
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-muted-foreground">Protein</p>
                  <p className="font-bold text-blue-600 dark:text-blue-400">
                    {meal.proteinG || 0}g
                  </p>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-muted-foreground">Carbs</p>
                  <p className="font-bold text-amber-600 dark:text-amber-400">
                    {meal.carbsG || 0}g
                  </p>
                </div>
                <div className="text-center p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <p className="text-xs text-muted-foreground">Fats</p>
                  <p className="font-bold text-orange-600 dark:text-orange-400">
                    {meal.fatsG || 0}g
                  </p>
                </div>
              </div>
            )}

            {/* Supplements */}
            {hasSupplements && (
              <div className="flex flex-wrap gap-1">
                {meal.supplements!.map((supp, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {supp}
                  </Badge>
                ))}
              </div>
            )}

            {/* Digestion Notes */}
            {hasDigestion && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">How it felt</p>
                <div className="flex flex-wrap gap-1">
                  {knownTags.map((tag, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs bg-muted/50 border-border"
                    >
                      {DIGESTION_TAGS.find(t => t.value === tag)?.label ?? tag}
                    </Badge>
                  ))}
                  {freeformNotes && (
                    <span className="text-xs italic text-muted-foreground self-center">
                      {freeformNotes}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Micronutrient data — always visible */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Micronutrients</p>
              {hasMicros ? (
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(meal.micros!).map(([key, val]) => {
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/ Mcg$/, ' (mcg)').replace(/ Mg$/, ' (mg)');
                    return (
                      <div key={key} className="flex justify-between px-2 py-1 rounded bg-muted/50">
                        <span className="text-muted-foreground truncate">{label}</span>
                        <span className="font-medium">{Math.round((val as number) * 10) / 10}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic px-2 py-1.5 rounded bg-muted/30">
                  No micronutrient data
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(meal.id);
                  }}
                >
                  <Edit2 className="h-3 w-3" />
                  {t('common.edit', 'Edit')}
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(meal.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                  {t('common.delete', 'Delete')}
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
