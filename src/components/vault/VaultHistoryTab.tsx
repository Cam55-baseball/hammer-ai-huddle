import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarIcon, ChevronLeft, ChevronRight, 
  Dumbbell, Brain, Apple, NotebookPen, Sparkles 
} from 'lucide-react';
import { format, subDays, addDays, isSameDay, startOfDay } from 'date-fns';
import { VaultFocusQuiz, VaultFreeNote, VaultWorkoutNote } from '@/hooks/useVault';

interface HistoryEntry {
  date: string;
  quizzes: VaultFocusQuiz[];
  notes: VaultFreeNote[];
  workouts: VaultWorkoutNote[];
  nutritionLogged: boolean;
}

interface VaultHistoryTabProps {
  fetchHistoryForDate: (date: string) => Promise<HistoryEntry>;
  entriesWithData: string[]; // dates that have data
}

export function VaultHistoryTab({ fetchHistoryForDate, entriesWithData }: VaultHistoryTabProps) {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [historyData, setHistoryData] = useState<HistoryEntry | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const data = await fetchHistoryForDate(dateStr);
      setHistoryData(data);
      setLoading(false);
    };
    loadData();
  }, [selectedDate, fetchHistoryForDate]);

  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  
  const isToday = isSameDay(selectedDate, new Date());
  const isFuture = startOfDay(selectedDate) > startOfDay(new Date());

  const hasDataForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entriesWithData.includes(dateStr);
  };

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
      ) : !historyData || (
        historyData.quizzes.length === 0 && 
        historyData.notes.length === 0 && 
        historyData.workouts.length === 0 &&
        !historyData.nutritionLogged
      ) ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>{t('vault.history.noEntries')}</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3">
            {/* Focus Quizzes */}
            {historyData.quizzes.map((quiz) => (
              <Card key={quiz.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {t(`vault.quiz.${quiz.quiz_type}`)}
                    <Badge variant="outline" className="ml-auto text-xs">
                      {format(new Date(quiz.created_at), 'h:mm a')}
                    </Badge>
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
            {historyData.notes.map((note) => (
              <Card key={note.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <NotebookPen className="h-4 w-4 text-primary" />
                    {t('vault.freeNote.title')}
                    <Badge variant="outline" className="ml-auto text-xs">
                      {format(new Date(note.created_at), 'h:mm a')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm">{note.note_text}</p>
                </CardContent>
              </Card>
            ))}

            {/* Workout Notes */}
            {historyData.workouts.map((workout) => (
              <Card key={workout.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-orange-500" />
                    {t('vault.workoutNotes.title')}
                    <div className="flex gap-1 ml-auto">
                      <Badge variant="secondary" className="text-xs">
                        {t('workoutModules.week')} {workout.week_number}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {t('workoutModules.day')} {workout.day_number}
                      </Badge>
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

            {/* Nutrition Logged */}
            {historyData.nutritionLogged && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Apple className="h-5 w-5 text-green-500" />
                  <span className="text-sm">{t('vault.history.nutritionLogged')}</span>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
