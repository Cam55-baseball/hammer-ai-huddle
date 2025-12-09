import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  CalendarIcon, ChevronLeft, ChevronRight, 
  Dumbbell, Brain, Apple, NotebookPen, Sparkles,
  Activity, Camera, Star, Droplets, Trash2
} from 'lucide-react';
import { format, subDays, addDays, isSameDay, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { 
  VaultFocusQuiz, VaultFreeNote, VaultWorkoutNote, 
  VaultPerformanceTest, VaultProgressPhoto, VaultScoutGrade, VaultNutritionLog 
} from '@/hooks/useVault';

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
}

interface DeleteTarget {
  type: 'quiz' | 'note' | 'workout' | 'nutrition' | 'performanceTest' | 'photo' | 'scoutGrade';
  id: string;
  name: string;
}

interface VaultHistoryTabProps {
  fetchHistoryForDate: (date: string) => Promise<HistoryEntry>;
  entriesWithData: string[];
  onDeleteQuiz?: (id: string) => Promise<void>;
  onDeleteNote?: (id: string) => Promise<void>;
  onDeleteWorkout?: (id: string) => Promise<void>;
  onDeleteNutrition?: (id: string) => Promise<void>;
  onDeletePerformanceTest?: (id: string) => Promise<void>;
  onDeletePhoto?: (id: string) => Promise<void>;
  onDeleteGrade?: (id: string) => Promise<void>;
}

export function VaultHistoryTab({ 
  fetchHistoryForDate, 
  entriesWithData,
  onDeleteQuiz,
  onDeleteNote,
  onDeleteWorkout,
  onDeleteNutrition,
  onDeletePerformanceTest,
  onDeletePhoto,
  onDeleteGrade,
}: VaultHistoryTabProps) {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [historyData, setHistoryData] = useState<HistoryEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const data = await fetchHistoryForDate(dateStr);
    setHistoryData(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, fetchHistoryForDate]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    
    try {
      switch (deleteTarget.type) {
        case 'quiz': await onDeleteQuiz?.(deleteTarget.id); break;
        case 'note': await onDeleteNote?.(deleteTarget.id); break;
        case 'workout': await onDeleteWorkout?.(deleteTarget.id); break;
        case 'nutrition': await onDeleteNutrition?.(deleteTarget.id); break;
        case 'performanceTest': await onDeletePerformanceTest?.(deleteTarget.id); break;
        case 'photo': await onDeletePhoto?.(deleteTarget.id); break;
        case 'scoutGrade': await onDeleteGrade?.(deleteTarget.id); break;
      }
      toast.success(t('vault.delete.success'));
      await loadData();
    } catch (error) {
      toast.error(t('common.error'));
    }
    
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  
  const isToday = isSameDay(selectedDate, new Date());
  const isFuture = startOfDay(selectedDate) > startOfDay(new Date());

  const hasDataForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entriesWithData.includes(dateStr);
  };

  const hasAnyEntries = historyData && (
    historyData.quizzes.length > 0 || 
    historyData.notes.length > 0 || 
    historyData.workouts.length > 0 ||
    historyData.nutritionLogged ||
    historyData.performanceTests.length > 0 ||
    historyData.progressPhotos.length > 0 ||
    historyData.scoutGrades.length > 0
  );

  const gradeCategories = [
    { key: 'hitting_grade', label: t('vault.scoutGrades.hitting') },
    { key: 'power_grade', label: t('vault.scoutGrades.power') },
    { key: 'speed_grade', label: t('vault.scoutGrades.speed') },
    { key: 'defense_grade', label: t('vault.scoutGrades.fielding') },
    { key: 'throwing_grade', label: t('vault.scoutGrades.arm') },
    { key: 'leadership_grade', label: t('vault.scoutGrades.leadership') },
    { key: 'self_efficacy_grade', label: t('vault.scoutGrades.selfEfficacy') },
  ];

  const DeleteButton = ({ onClick }: { onClick: () => void }) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-muted-foreground hover:text-destructive"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="font-medium">
                    {isToday ? t('vault.history.today') : format(selectedDate, 'MMM d, yyyy')}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date > new Date()}
                  modifiers={{
                    hasData: (date) => hasDataForDate(date),
                  }}
                  modifiersStyles={{
                    hasData: { 
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                      textDecorationColor: 'hsl(var(--primary))',
                    },
                  }}
                />
              </PopoverContent>
            </Popover>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToNextDay}
              disabled={isToday || isFuture}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Day's Entries */}
      {loading ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {t('common.loading')}
          </CardContent>
        </Card>
      ) : !hasAnyEntries ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>{t('vault.history.noEntries')}</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3">
            {/* Focus Quizzes */}
            {historyData?.quizzes.map((quiz) => (
              <Card key={quiz.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {t(`vault.quiz.${quiz.quiz_type}`)}
                    <div className="ml-auto flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(quiz.created_at), 'h:mm a')}
                      </Badge>
                      {onDeleteQuiz && (
                        <DeleteButton onClick={() => setDeleteTarget({ type: 'quiz', id: quiz.id, name: t(`vault.quiz.${quiz.quiz_type}`) })} />
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-xs text-muted-foreground">{t('vault.quiz.mentalReadiness')}</p>
                      <p className="font-bold">{quiz.mental_readiness}/5</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-xs text-muted-foreground">{t('vault.quiz.emotionalState')}</p>
                      <p className="font-bold">{quiz.emotional_state}/5</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-xs text-muted-foreground">{t('vault.quiz.physicalReadiness')}</p>
                      <p className="font-bold">{quiz.physical_readiness}/5</p>
                    </div>
                  </div>
                  {quiz.reflection_did_well && (
                    <p className="text-sm mt-2 text-muted-foreground">
                      <span className="font-medium text-foreground">{t('vault.quiz.reflectionPrompts.didWell')}:</span> {quiz.reflection_did_well}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Free Notes */}
            {historyData?.notes.map((note) => (
              <Card key={note.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <NotebookPen className="h-4 w-4 text-primary" />
                    {t('vault.freeNote.title')}
                    <div className="ml-auto flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(note.created_at), 'h:mm a')}
                      </Badge>
                      {onDeleteNote && (
                        <DeleteButton onClick={() => setDeleteTarget({ type: 'note', id: note.id, name: t('vault.freeNote.title') })} />
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm">{note.note_text}</p>
                </CardContent>
              </Card>
            ))}

            {/* Workout Notes */}
            {historyData?.workouts.map((workout) => (
              <Card key={workout.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-orange-500" />
                    {t('vault.workoutNotes.title')}
                    <div className="flex gap-1 ml-auto items-center">
                      <Badge variant="secondary" className="text-xs">
                        {t('workoutModules.week')} {workout.week_number}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {t('workoutModules.day')} {workout.day_number}
                      </Badge>
                      {onDeleteWorkout && (
                        <DeleteButton onClick={() => setDeleteTarget({ type: 'workout', id: workout.id, name: t('vault.workoutNotes.title') })} />
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {workout.total_weight_lifted > 0 && (
                    <Badge className="bg-orange-500/20 text-orange-600 mb-2">
                      {workout.total_weight_lifted.toLocaleString()} lbs lifted
                    </Badge>
                  )}
                  {workout.notes && (
                    <p className="text-sm text-muted-foreground">{workout.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Nutrition Log */}
            {historyData?.nutritionLog && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Apple className="h-4 w-4 text-green-500" />
                    {t('vault.nutrition.title')}
                    {onDeleteNutrition && (
                      <div className="ml-auto">
                        <DeleteButton onClick={() => setDeleteTarget({ type: 'nutrition', id: historyData.nutritionLog!.id, name: t('vault.nutrition.title') })} />
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {historyData.nutritionLog.calories && (
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <p className="text-xs text-muted-foreground">{t('vault.nutrition.calories')}</p>
                        <p className="font-bold">{historyData.nutritionLog.calories}</p>
                      </div>
                    )}
                    {historyData.nutritionLog.protein_g && (
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <p className="text-xs text-muted-foreground">{t('vault.nutrition.protein')}</p>
                        <p className="font-bold">{historyData.nutritionLog.protein_g}g</p>
                      </div>
                    )}
                    {historyData.nutritionLog.carbs_g && (
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <p className="text-xs text-muted-foreground">{t('vault.nutrition.carbs')}</p>
                        <p className="font-bold">{historyData.nutritionLog.carbs_g}g</p>
                      </div>
                    )}
                    {historyData.nutritionLog.hydration_oz && (
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <p className="text-xs text-muted-foreground">{t('vault.nutrition.hydration')}</p>
                        <p className="font-bold">{historyData.nutritionLog.hydration_oz}oz</p>
                      </div>
                    )}
                  </div>
                  {historyData.nutritionLog.energy_level && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t('vault.nutrition.energyLevel')}:</span>
                      <Badge variant="secondary">{historyData.nutritionLog.energy_level}/10</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Nutrition Logged (fallback if no full log) */}
            {historyData?.nutritionLogged && !historyData.nutritionLog && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Apple className="h-5 w-5 text-green-500" />
                  <span className="text-sm">{t('vault.history.nutritionLogged')}</span>
                </CardContent>
              </Card>
            )}

            {/* Performance Tests */}
            {historyData?.performanceTests.map((test) => (
              <Card key={test.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    {t('vault.history.performanceTestEntry')}
                    <div className="ml-auto flex items-center gap-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {test.test_type.replace('_', ' ')}
                      </Badge>
                      {onDeletePerformanceTest && (
                        <DeleteButton onClick={() => setDeleteTarget({ 
                          type: 'performanceTest', 
                          id: test.id, 
                          name: t('vault.history.performanceTestEntry') 
                        })} />
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(test.results).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span className="text-xs text-muted-foreground capitalize">{key.replace('_', ' ')}</span>
                        <div className="flex items-center gap-1">
                          <span className="font-bold">{value}</span>
                          {test.previous_results?.[key] && (
                            <span className={`text-xs ${value > test.previous_results[key] ? 'text-green-500' : value < test.previous_results[key] ? 'text-red-500' : 'text-muted-foreground'}`}>
                              ({value > test.previous_results[key] ? '+' : ''}{(value - test.previous_results[key]).toFixed(1)})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Progress Photos */}
            {historyData?.progressPhotos.map((photo) => (
              <Card key={photo.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Camera className="h-4 w-4 text-purple-500" />
                    {t('vault.history.progressPhotoEntry')}
                    {onDeletePhoto && (
                      <div className="ml-auto">
                        <DeleteButton onClick={() => setDeleteTarget({ 
                          type: 'photo', 
                          id: photo.id, 
                          name: t('vault.history.progressPhotoEntry') 
                        })} />
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    {photo.weight_lbs && (
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <p className="text-xs text-muted-foreground">{t('vault.photos.weight')}</p>
                        <p className="font-bold">{photo.weight_lbs} lbs</p>
                      </div>
                    )}
                    {photo.body_fat_percent && (
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <p className="text-xs text-muted-foreground">{t('vault.photos.bodyFat')}</p>
                        <p className="font-bold">{photo.body_fat_percent}%</p>
                      </div>
                    )}
                    {photo.arm_measurement && (
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <p className="text-xs text-muted-foreground">{t('vault.photos.arm')}</p>
                        <p className="font-bold">{photo.arm_measurement}"</p>
                      </div>
                    )}
                    {photo.chest_measurement && (
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <p className="text-xs text-muted-foreground">{t('vault.photos.chest')}</p>
                        <p className="font-bold">{photo.chest_measurement}"</p>
                      </div>
                    )}
                    {photo.waist_measurement && (
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <p className="text-xs text-muted-foreground">{t('vault.photos.waist')}</p>
                        <p className="font-bold">{photo.waist_measurement}"</p>
                      </div>
                    )}
                    {photo.leg_measurement && (
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <p className="text-xs text-muted-foreground">{t('vault.photos.leg')}</p>
                        <p className="font-bold">{photo.leg_measurement}"</p>
                      </div>
                    )}
                  </div>
                  {photo.notes && (
                    <p className="text-sm mt-2 text-muted-foreground">{photo.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Scout Grades */}
            {historyData?.scoutGrades.map((grade) => (
              <Card key={grade.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    {t('vault.history.scoutGradeEntry')}
                    <div className="ml-auto flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(grade.graded_at), 'h:mm a')}
                      </Badge>
                      {onDeleteGrade && (
                        <DeleteButton onClick={() => setDeleteTarget({ 
                          type: 'scoutGrade', 
                          id: grade.id, 
                          name: t('vault.history.scoutGradeEntry') 
                        })} />
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {gradeCategories.map(({ key, label }) => {
                      const value = grade[key as keyof VaultScoutGrade] as number | null;
                      if (!value) return null;
                      return (
                        <div key={key} className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-bold">{value}</p>
                        </div>
                      );
                    })}
                  </div>
                  {grade.notes && (
                    <p className="text-sm mt-2 text-muted-foreground">{grade.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('vault.delete.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('vault.delete.confirmMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? t('common.loading') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
