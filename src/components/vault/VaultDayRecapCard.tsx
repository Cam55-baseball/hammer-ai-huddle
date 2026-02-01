import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Sun, Moon, Dumbbell, Apple, NotebookPen, 
  Sparkles, Activity, Camera, Star, Droplets,
  Zap, Heart, Brain, Target, Clock, ChevronDown,
  Pill, Coffee, Utensils, CheckSquare, Timer, Footprints
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  VaultFocusQuiz, VaultFreeNote, VaultWorkoutNote, 
  VaultPerformanceTest, VaultProgressPhoto, VaultScoutGrade, VaultNutritionLog 
} from '@/hooks/useVault';
import { CustomActivityLog, MealData, Exercise, CustomField, RunningInterval } from '@/types/customActivity';
import { getBodyAreaLabel } from './quiz/body-maps/bodyAreaDefinitions';
import { getFasciaConnection } from './quiz/body-maps/fasciaConnectionMappings';

interface HistoryEntry {
  date: string;
  quizzes: VaultFocusQuiz[];
  notes: VaultFreeNote[];
  workouts: VaultWorkoutNote[];
  nutritionLogged: boolean;
  nutritionLog: VaultNutritionLog | null;
  performanceTests: VaultPerformanceTest[];
  progressPhotos: VaultProgressPhoto[];
  scoutGrades: VaultScoutGrade[];
  customActivities?: CustomActivityLog[];
}

interface VaultDayRecapCardProps {
  historyData: HistoryEntry;
  isLoading?: boolean;
}

// Sub-component for detailed activity card
function ActivityDetailCard({ activity }: { activity: CustomActivityLog }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const template = activity.template;
  if (!template) return null;

  const meals = template.meals as MealData | null;
  const exercises = (template.exercises as Exercise[]) || [];
  const customFields = (template.custom_fields as CustomField[]) || [];
  const intervals = (template.intervals as RunningInterval[]) || [];
  const performanceData = activity.performance_data as Record<string, any> | null;
  
  const hasDetails = 
    (meals?.items && meals.items.length > 0) ||
    (meals?.supplements && meals.supplements.length > 0) ||
    (meals?.vitamins && meals.vitamins.length > 0) ||
    (meals?.hydration) ||
    exercises.length > 0 ||
    customFields.length > 0 ||
    activity.notes ||
    template.description ||
    (performanceData && Object.keys(performanceData).length > 0) ||
    (intervals.length > 0) ||
    template.distance_value ||
    template.pace_value;

  const activityColor = template.color || '#6366f1';

  return (
    <Card 
      className="border overflow-hidden"
      style={{ 
        borderColor: `${activityColor}40`,
        background: `linear-gradient(135deg, ${activityColor}08 0%, transparent 50%)`
      }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${activityColor}20` }}
                >
                  <Target className="h-3.5 w-3.5" style={{ color: activityColor }} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{template.title}</span>
                  {template.description && (
                    <span className="text-xs text-muted-foreground font-normal truncate">
                      {template.description}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                {activity.actual_duration_minutes && (
                  <Badge variant="outline" className="text-xs">
                    <Timer className="h-3 w-3 mr-1" />
                    {activity.actual_duration_minutes}m
                  </Badge>
                )}
                {template.intensity && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {template.intensity}
                  </Badge>
                )}
                {activity.completed_at && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {format(new Date(activity.completed_at), 'h:mm a')}
                  </Badge>
                )}
                {hasDetails && (
                  <ChevronDown 
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                  />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        {hasDetails && (
          <CollapsibleContent>
            <CardContent className="pb-3 px-4 pt-0 space-y-3">
              {/* Meal Items */}
              {meals?.items && meals.items.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Utensils className="h-3 w-3" />
                    <span>{t('vault.pastDays.items', 'Items')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {meals.items.map((item) => (
                      <Badge 
                        key={item.id} 
                        variant="secondary" 
                        className="text-xs py-0.5 px-2"
                      >
                        {item.name}
                        {item.quantity && item.unit && (
                          <span className="text-muted-foreground ml-1">
                            ({item.quantity} {item.unit})
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Supplements */}
              {meals?.supplements && meals.supplements.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Pill className="h-3 w-3" />
                    <span>{t('vault.pastDays.supplements', 'Supplements')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {meals.supplements.map((supp) => (
                      <Badge 
                        key={supp.id} 
                        variant="secondary" 
                        className="text-xs py-0.5 px-2 bg-green-500/10 text-green-700 dark:text-green-300"
                      >
                        {supp.name}
                        {supp.dosage && (
                          <span className="text-muted-foreground ml-1">({supp.dosage})</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Vitamins */}
              {meals?.vitamins && meals.vitamins.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    <span>{t('vault.pastDays.vitamins', 'Vitamins')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {meals.vitamins.map((vit) => (
                      <Badge 
                        key={vit.id} 
                        variant="secondary" 
                        className="text-xs py-0.5 px-2 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      >
                        {vit.name}
                        {vit.dosage && (
                          <span className="text-muted-foreground ml-1">({vit.dosage})</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Hydration */}
              {meals?.hydration && meals.hydration.amount > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Droplets className="h-3 w-3 text-blue-500" />
                  <span className="text-muted-foreground">{t('vault.pastDays.hydration', 'Hydration')}:</span>
                  <span className="font-medium">{meals.hydration.amount} {meals.hydration.unit}</span>
                </div>
              )}

              {/* Custom Fields (checkboxes, etc.) */}
              {customFields.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <CheckSquare className="h-3 w-3" />
                    <span>{t('vault.pastDays.customFields', 'Logged')}</span>
                  </div>
                  <div className="space-y-1">
                    {customFields.map((field) => (
                      <div key={field.id} className="flex flex-col">
                        <Badge 
                          variant="outline" 
                          className="text-xs py-0.5 px-2 w-fit"
                        >
                          {field.label}
                          {field.value && field.type !== 'checkbox' && (
                            <span className="text-muted-foreground ml-1">: {field.value}</span>
                          )}
                        </Badge>
                        {field.notes && (
                          <span className="text-muted-foreground text-[10px] italic ml-2 mt-0.5 whitespace-pre-line">
                            "{field.notes}"
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exercises */}
              {exercises.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Dumbbell className="h-3 w-3" />
                    <span>{t('vault.pastDays.exercises', 'Exercises')}</span>
                  </div>
                  <div className="space-y-1">
                    {exercises.map((ex) => (
                      <div key={ex.id} className="flex flex-col">
                        <Badge 
                          variant="secondary" 
                          className="text-xs py-0.5 px-2 bg-orange-500/10 text-orange-700 dark:text-orange-300 w-fit"
                        >
                          {ex.name}
                          {ex.sets && ex.reps && (
                            <span className="text-muted-foreground ml-1">
                              ({ex.sets}×{ex.reps})
                            </span>
                          )}
                          {ex.duration && !ex.sets && (
                            <span className="text-muted-foreground ml-1">
                              ({Math.floor(ex.duration / 60)}:{String(ex.duration % 60).padStart(2, '0')})
                            </span>
                          )}
                          {ex.weight && (
                            <span className="text-muted-foreground ml-1">
                              @ {ex.weight}{ex.weightUnit || 'lbs'}
                            </span>
                          )}
                        </Badge>
                        {ex.notes && (
                          <span className="text-muted-foreground text-[10px] italic ml-2 mt-0.5">
                            "{ex.notes}"
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Running Details */}
              {template.activity_type === 'running' && (template.distance_value || template.pace_value || intervals.length > 0) && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Footprints className="h-3 w-3" />
                    <span>{t('vault.pastDays.runningDetails', 'Running Details')}</span>
                  </div>
                  {template.distance_value && (
                    <div className="text-xs">
                      {t('vault.pastDays.distance', 'Distance')}: {template.distance_value} {template.distance_unit || 'miles'}
                    </div>
                  )}
                  {template.pace_value && (
                    <div className="text-xs">
                      {t('vault.pastDays.paceGoal', 'Pace Goal')}: {template.pace_value}
                    </div>
                  )}
                  {intervals.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {intervals.map((interval, i) => (
                        <Badge key={i} variant="secondary" className="text-xs capitalize">
                          {interval.type}
                          {interval.duration && ` - ${Math.floor(interval.duration / 60)}:${String(interval.duration % 60).padStart(2, '0')}`}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Performance Data Logged */}
              {performanceData && Object.keys(performanceData).length > 0 && (
                <div className="space-y-1 border-t pt-2 mt-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Activity className="h-3 w-3" />
                    <span>{t('vault.pastDays.performanceLogged', 'Performance Logged')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(performanceData).map(([key, value]) => (
                      <div key={key} className="flex justify-between bg-muted/50 rounded p-1.5">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Notes */}
              {activity.notes && (
                <div className="text-xs text-muted-foreground italic border-t pt-2 mt-2">
                  "{activity.notes}"
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        )}
      </Collapsible>
    </Card>
  );
}

export function VaultDayRecapCard({ historyData, isLoading }: VaultDayRecapCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground animate-pulse">
        {t('common.loading')}
      </div>
    );
  }

  const hasAnyEntries = 
    historyData.quizzes.length > 0 || 
    historyData.notes.length > 0 || 
    historyData.workouts.length > 0 ||
    historyData.nutritionLogged ||
    historyData.performanceTests.length > 0 ||
    historyData.progressPhotos.length > 0 ||
    historyData.scoutGrades.length > 0 ||
    (historyData.customActivities && historyData.customActivities.length > 0);

  if (!hasAnyEntries) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <NotebookPen className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>{t('vault.pastDays.noEntries', 'No entries for this day')}</p>
      </div>
    );
  }

  // Group quizzes by type
  const morningQuiz = historyData.quizzes.find(q => q.quiz_type === 'morning');
  const preWorkoutQuiz = historyData.quizzes.find(q => q.quiz_type === 'pre_lift');
  const nightQuiz = historyData.quizzes.find(q => q.quiz_type === 'night');

  return (
    <div className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
      <div className="space-y-4 p-1">
        {/* Daily Wellness Overview */}
        {(morningQuiz || preWorkoutQuiz || nightQuiz) && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
              <Heart className="h-4 w-4" />
              {t('vault.pastDays.wellnessOverview', 'Daily Wellness')}
            </h4>

            {/* Morning Check-In */}
            {morningQuiz && (
              <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sun className="h-4 w-4 text-amber-500" />
                    {t('vault.pastDays.morningCheckin', 'Morning Check-In')}
                    <Badge variant="outline" className="ml-auto text-xs">
                      {format(new Date(morningQuiz.created_at), 'h:mm a')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {morningQuiz.mood_level && (
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">{t('vault.quiz.mood', 'Mood')}</p>
                        <p className="font-bold">{morningQuiz.mood_level}/5</p>
                      </div>
                    )}
                    {morningQuiz.discipline_level && (
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">{t('vault.quiz.discipline', 'Discipline')}</p>
                        <p className="font-bold">{morningQuiz.discipline_level}/5</p>
                      </div>
                    )}
                    {morningQuiz.hours_slept && (
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">{t('vault.quiz.sleep', 'Sleep')}</p>
                        <p className="font-bold">{morningQuiz.hours_slept}h</p>
                      </div>
                    )}
                  </div>
                  {morningQuiz.weight_lbs && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">{t('vault.quiz.weight', 'Weight')}:</span> {morningQuiz.weight_lbs} lbs
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pre-Workout Check-In */}
            {preWorkoutQuiz && (
              <Card className="border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-500" />
                    {t('vault.pastDays.preWorkout', 'Pre-Workout')}
                    <Badge variant="outline" className="ml-auto text-xs">
                      {format(new Date(preWorkoutQuiz.created_at), 'h:mm a')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground">{t('vault.quiz.mental', 'Mental')}</p>
                      <p className="font-bold">{preWorkoutQuiz.mental_readiness}/5</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground">{t('vault.quiz.physical', 'Physical')}</p>
                      <p className="font-bold">{preWorkoutQuiz.physical_readiness}/5</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground">{t('vault.quiz.emotional', 'Emotional')}</p>
                      <p className="font-bold">{preWorkoutQuiz.emotional_state}/5</p>
                    </div>
                  </div>
                  {preWorkoutQuiz.pain_location && preWorkoutQuiz.pain_location.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <span className="text-xs text-muted-foreground font-medium">
                        {t('vault.quiz.pain', 'Pain')}:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {preWorkoutQuiz.pain_location.map((loc, i) => {
                          // Use per-area pain_scales if available, fall back to global pain_scale
                          const painScales = (preWorkoutQuiz as any).pain_scales as Record<string, number> | undefined;
                          const level = painScales?.[loc] || preWorkoutQuiz.pain_scale || 0;
                          const connection = getFasciaConnection(loc);
                          return (
                            <Badge key={i} variant="destructive" className="text-xs py-0">
                              {connection?.primaryLine.emoji} {getBodyAreaLabel(loc)}: {level}/10
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Night Check-In */}
            {nightQuiz && (
              <Card className="border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-transparent">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Moon className="h-4 w-4 text-indigo-500" />
                    {t('vault.pastDays.nightReflection', 'Night Reflection')}
                    <Badge variant="outline" className="ml-auto text-xs">
                      {format(new Date(nightQuiz.created_at), 'h:mm a')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  {nightQuiz.reflection_did_well && (
                    <p className="text-xs text-muted-foreground mb-1">
                      <span className="font-medium text-foreground">{t('vault.quiz.didWell', 'Did well')}:</span> {nightQuiz.reflection_did_well}
                    </p>
                  )}
                  {nightQuiz.reflection_improve && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{t('vault.quiz.improve', 'Improve')}:</span> {nightQuiz.reflection_improve}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Custom Activities - Enhanced with Details */}
        {historyData.customActivities && historyData.customActivities.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
              <Target className="h-4 w-4" />
              {t('vault.pastDays.activitiesCompleted', 'Activities Completed')}
              <Badge variant="secondary" className="ml-1 text-xs">
                {historyData.customActivities.length}
              </Badge>
            </h4>
            <div className="space-y-2">
              {historyData.customActivities.map((activity) => (
                <ActivityDetailCard key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        )}

        {/* Workout Notes */}
        {historyData.workouts.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-orange-500">
              <Dumbbell className="h-4 w-4" />
              {t('vault.pastDays.training', 'Training')}
            </h4>
            {historyData.workouts.map((workout) => (
              <Card key={workout.id} className="border-orange-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {t('workoutModules.week')} {workout.week_number}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {t('workoutModules.day')} {workout.day_number}
                    </Badge>
                    {workout.total_weight_lifted > 0 && (
                      <Badge className="bg-orange-500/20 text-orange-600 text-xs">
                        {workout.total_weight_lifted.toLocaleString()} lbs
                      </Badge>
                    )}
                  </div>
                  {workout.notes && (
                    <p className="text-xs text-muted-foreground mt-2">{workout.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Nutrition */}
        {historyData.nutritionLog && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-green-500">
              <Apple className="h-4 w-4" />
              {t('vault.pastDays.nutrition', 'Nutrition')}
            </h4>
            <Card className="border-green-500/20">
              <CardContent className="p-3">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {historyData.nutritionLog.calories && (
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground">{t('vault.nutrition.cal', 'Cal')}</p>
                      <p className="font-bold">{historyData.nutritionLog.calories}</p>
                    </div>
                  )}
                  {historyData.nutritionLog.protein_g && (
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground">{t('vault.nutrition.prot', 'Prot')}</p>
                      <p className="font-bold">{historyData.nutritionLog.protein_g}g</p>
                    </div>
                  )}
                  {historyData.nutritionLog.carbs_g && (
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground">{t('vault.nutrition.carb', 'Carb')}</p>
                      <p className="font-bold">{historyData.nutritionLog.carbs_g}g</p>
                    </div>
                  )}
                  {historyData.nutritionLog.hydration_oz && (
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-muted-foreground"><Droplets className="h-3 w-3 inline" /></p>
                      <p className="font-bold">{historyData.nutritionLog.hydration_oz}oz</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Free Notes */}
        {historyData.notes.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
              <NotebookPen className="h-4 w-4" />
              {t('vault.pastDays.notes', 'Journal Notes')}
            </h4>
            {historyData.notes.map((note) => (
              <Card key={note.id}>
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                  <Badge variant="outline" className="text-xs mt-2">
                    {format(new Date(note.created_at), 'h:mm a')}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Performance Tests */}
        {historyData.performanceTests.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-blue-500">
              <Activity className="h-4 w-4" />
              {t('vault.pastDays.performanceTests', 'Performance Tests')}
            </h4>
            {historyData.performanceTests.map((test) => (
              <Card key={test.id} className="border-blue-500/20">
                <CardContent className="p-3">
                  <Badge variant="outline" className="text-xs capitalize mb-2">
                    {test.test_type.replace('_', ' ')}
                  </Badge>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {Object.entries(test.results).slice(0, 3).map(([key, value]) => (
                      <div key={key} className="text-center p-1.5 bg-muted/50 rounded">
                        <p className="text-muted-foreground capitalize">{key.replace('_', ' ')}</p>
                        <p className="font-bold">{value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Progress Photos */}
        {historyData.progressPhotos.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-violet-500">
              <Camera className="h-4 w-4" />
              {t('vault.pastDays.progressPhotos', 'Progress Photos')}
            </h4>
            <Card className="border-violet-500/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Camera className="h-4 w-4" />
                  <span>
                    {historyData.progressPhotos.reduce((sum, p) => sum + (p.photo_urls?.length || 0), 0)} {t('vault.pastDays.photosLogged', 'photos logged')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Scout Grades */}
        {historyData.scoutGrades.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-amber-500">
              <Star className="h-4 w-4" />
              {t('vault.pastDays.scoutGrades', 'Scout Self-Grades')}
            </h4>
            {historyData.scoutGrades.map((grade) => (
              <Card key={grade.id} className="border-amber-500/20">
                <CardContent className="p-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {grade.hitting_grade && (
                      <Badge variant="secondary">{t('vault.scoutGrades.hitting')}: {grade.hitting_grade}</Badge>
                    )}
                    {grade.power_grade && (
                      <Badge variant="secondary">{t('vault.scoutGrades.power')}: {grade.power_grade}</Badge>
                    )}
                    {grade.speed_grade && (
                      <Badge variant="secondary">{t('vault.scoutGrades.speed')}: {grade.speed_grade}</Badge>
                    )}
                    {grade.defense_grade && (
                      <Badge variant="secondary">{t('vault.scoutGrades.fielding')}: {grade.defense_grade}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
