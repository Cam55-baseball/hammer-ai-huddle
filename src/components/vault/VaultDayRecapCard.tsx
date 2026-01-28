import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sun, Moon, Dumbbell, Apple, NotebookPen, 
  Sparkles, Activity, Camera, Star, Droplets,
  Zap, Heart, Brain, Target, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  VaultFocusQuiz, VaultFreeNote, VaultWorkoutNote, 
  VaultPerformanceTest, VaultProgressPhoto, VaultScoutGrade, VaultNutritionLog 
} from '@/hooks/useVault';
import { CustomActivityLog } from '@/types/customActivity';

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
    <ScrollArea className="max-h-[500px]">
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
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground">{t('vault.quiz.pain', 'Pain')}:</span>
                      {preWorkoutQuiz.pain_location.map((loc, i) => (
                        <Badge key={i} variant="destructive" className="text-xs py-0">
                          {loc}
                        </Badge>
                      ))}
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

        {/* Custom Activities */}
        {historyData.customActivities && historyData.customActivities.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
              <Target className="h-4 w-4" />
              {t('vault.pastDays.activitiesCompleted', 'Activities Completed')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {historyData.customActivities.map((activity) => (
                <Badge 
                  key={activity.id} 
                  variant="secondary"
                  className="gap-1"
                  style={{ 
                    backgroundColor: `${activity.template?.color || '#6366f1'}20`,
                    borderColor: activity.template?.color || '#6366f1',
                  }}
                >
                  <span>{activity.template?.title || 'Activity'}</span>
                  {activity.actual_duration_minutes && (
                    <span className="text-muted-foreground">
                      ({activity.actual_duration_minutes}m)
                    </span>
                  )}
                </Badge>
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
    </ScrollArea>
  );
}
