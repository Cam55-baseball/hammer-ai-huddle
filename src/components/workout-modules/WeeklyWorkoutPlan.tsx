import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lock, Unlock, ChevronDown, ChevronUp, ChevronRight, CheckCircle2, Dumbbell, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DayWorkoutDetailDialog } from './DayWorkoutDetailDialog';
import { FullScreenWorkoutMode } from './FullScreenWorkoutMode';
import { Exercise, ExperienceLevel, isExerciseObject } from '@/types/workout';

interface WeekData {
  week: number;
  title: string;
  focus: string;
  days: { day: string; title: string; exercises: (string | Exercise)[] }[];
}

interface WeeklyWorkoutPlanProps {
  weeks: WeekData[];
  currentWeek: number;
  weekProgress: { [week: string]: { [day: string]: boolean } };
  onDayComplete: (week: number, day: string, completed: boolean) => void;
  onWeekSelect: (week: number) => void;
  canUnlockWeek: (week: number) => boolean;
  getWeekCompletionPercent: (week: number) => number;
  getExerciseProgress: (week: number, day: string, totalExercises: number) => boolean[];
  onExerciseComplete: (week: number, day: string, exerciseIndex: number, completed: boolean, totalExercises: number) => void;
  getWeightLog: (week: number, day: string) => { [exerciseIndex: number]: number[] };
  onWeightUpdate: (week: number, day: string, exerciseIndex: number, setIndex: number, weight: number) => void;
  experienceLevel: ExperienceLevel;
  loopsCompleted?: number;
  currentCycle?: number;
}

export function WeeklyWorkoutPlan({
  weeks,
  currentWeek,
  weekProgress,
  onDayComplete,
  onWeekSelect,
  canUnlockWeek,
  getWeekCompletionPercent,
  getExerciseProgress,
  onExerciseComplete,
  getWeightLog,
  onWeightUpdate,
  experienceLevel,
  loopsCompleted = 0,
  currentCycle = 1,
}: WeeklyWorkoutPlanProps) {
  const { t } = useTranslation();
  const [expandedWeek, setExpandedWeek] = useState<number | null>(currentWeek);
  const [selectedDay, setSelectedDay] = useState<{
    weekData: WeekData;
    day: { day: string; title: string; exercises: (string | Exercise)[] };
  } | null>(null);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [fullScreenData, setFullScreenData] = useState<{
    weekData: WeekData;
    day: { day: string; title: string; exercises: (string | Exercise)[] };
  } | null>(null);

  const isWeekUnlocked = (week: number) => {
    if (week === 1) return true;
    return canUnlockWeek(week) && week <= currentWeek;
  };

  const isDayCompleted = (week: number, day: string) => {
    return weekProgress[week]?.[day] || false;
  };

  const hasStrengthExercises = (exercises: (string | Exercise)[]): boolean => {
    return exercises.some(e => isExerciseObject(e) && e.type === 'strength');
  };

  const hasIsometricExercises = (exercises: (string | Exercise)[]): boolean => {
    return exercises.some(e => isExerciseObject(e) && e.type === 'isometric');
  };

  const getExercisePreview = (exercises: (string | Exercise)[]): string => {
    return exercises.slice(0, 2).map(e => isExerciseObject(e) ? e.name : e).join(' • ');
  };

  return (
    <>
      {loopsCompleted > 0 && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary font-medium flex items-center gap-2">
          🔄 Loop {loopsCompleted + 1} — Cycle {currentCycle}
        </div>
      )}
      <div className="space-y-3">
        {weeks.map((weekData) => {
          const unlocked = isWeekUnlocked(weekData.week);
          const completionPercent = getWeekCompletionPercent(weekData.week);
          const isExpanded = expandedWeek === weekData.week;
          const isCurrentWeek = weekData.week === currentWeek;

          return (
            <Card
              key={weekData.week}
              className={cn(
                'transition-all duration-200',
                !unlocked && 'opacity-60',
                isCurrentWeek && 'ring-2 ring-primary'
              )}
            >
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    {unlocked ? (
                      <Unlock className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm sm:text-base flex items-center gap-2 flex-wrap">
                        <span className="truncate">{t('workoutModules.week')} {weekData.week}</span>
                        {isCurrentWeek && (
                          <Badge variant="default" className="text-xs">
                            {t('workoutModules.current')}
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {weekData.title}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedWeek(isExpanded ? null : weekData.week)}
                    disabled={!unlocked}
                    className="flex-shrink-0"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {unlocked && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{t('workoutModules.progress')}</span>
                      <span>{completionPercent}%</span>
                    </div>
                    <Progress value={completionPercent} className="h-1.5" />
                  </div>
                )}
                {!unlocked && (
                  <p className="text-xs text-amber-600 mt-2">
                    {t('workoutModules.completeWeekToUnlock', { percent: 70, week: weekData.week - 1 })}
                  </p>
                )}
              </CardHeader>

              {isExpanded && unlocked && (
                <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="space-y-2 mt-3">
                    <p className="text-xs sm:text-sm font-medium text-primary">
                      {t('workoutModules.weekFocus')}: {weekData.focus}
                    </p>
                    <div className="grid gap-2">
                      {weekData.days.map((day) => {
                        const completed = isDayCompleted(weekData.week, day.day);
                        const hasStrength = hasStrengthExercises(day.exercises);
                        const hasIsometric = hasIsometricExercises(day.exercises);

                        return (
                          <div
                            key={day.day}
                            onClick={() => setSelectedDay({ weekData, day })}
                            className={cn(
                              'p-2 sm:p-3 rounded-lg border transition-all cursor-pointer',
                              'hover:border-primary/50 hover:shadow-sm',
                              completed
                                ? 'bg-green-500/10 border-green-500/30'
                                : 'bg-muted/30 border-muted'
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    'h-6 w-6 p-0 rounded-full flex-shrink-0',
                                    completed && 'text-green-500'
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDayComplete(weekData.week, day.day, !completed);
                                  }}
                                >
                                  <CheckCircle2
                                    className={cn(
                                      'h-5 w-5',
                                      completed ? 'fill-green-500' : 'fill-none'
                                    )}
                                  />
                                </Button>
                                <div className="min-w-0">
                                  <p className="font-medium text-xs sm:text-sm truncate">
                                    {day.title}
                                  </p>
                                  <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {getExercisePreview(day.exercises)}
                                      {day.exercises.length > 2 && ' ...'}
                                    </p>
                                    {hasStrength && (
                                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-orange-500/10 text-orange-600 border-orange-500/30">
                                        <Dumbbell className="h-2.5 w-2.5" />
                                      </Badge>
                                    )}
                                    {hasIsometric && (
                                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-blue-500/10 text-blue-600 border-blue-500/30">
                                        <Timer className="h-2.5 w-2.5" />
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <DayWorkoutDetailDialog
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
        dayData={selectedDay?.day || null}
        weekNumber={selectedDay?.weekData.week || 0}
        weekTitle={selectedDay?.weekData.title || ''}
        weekFocus={selectedDay?.weekData.focus || ''}
        isCompleted={
          selectedDay
            ? isDayCompleted(selectedDay.weekData.week, selectedDay.day.day)
            : false
        }
        onToggleComplete={() => {
          if (selectedDay) {
            const completed = isDayCompleted(
              selectedDay.weekData.week,
              selectedDay.day.day
            );
            onDayComplete(selectedDay.weekData.week, selectedDay.day.day, !completed);
          }
        }}
        exerciseProgress={
          selectedDay
            ? getExerciseProgress(
                selectedDay.weekData.week,
                selectedDay.day.day,
                selectedDay.day.exercises.length
              )
            : []
        }
        onExerciseToggle={(index, completed) => {
          if (selectedDay) {
            onExerciseComplete(
              selectedDay.weekData.week,
              selectedDay.day.day,
              index,
              completed,
              selectedDay.day.exercises.length
            );
          }
        }}
        weightLog={
          selectedDay
            ? getWeightLog(selectedDay.weekData.week, selectedDay.day.day)
            : {}
        }
        onWeightUpdate={(exerciseIndex, setIndex, weight) => {
          if (selectedDay) {
            onWeightUpdate(
              selectedDay.weekData.week,
              selectedDay.day.day,
              exerciseIndex,
              setIndex,
              weight
            );
          }
        }}
        experienceLevel={experienceLevel}
        onEnterFullScreen={() => {
          if (selectedDay) {
            setFullScreenData(selectedDay);
            setSelectedDay(null);
            setShowFullScreen(true);
          }
        }}
      />

      {/* Full Screen Workout Mode - Rendered at page level via Portal */}
      {showFullScreen && fullScreenData && createPortal(
        <FullScreenWorkoutMode
          exercises={fullScreenData.day.exercises}
          experienceLevel={experienceLevel}
          exerciseProgress={getExerciseProgress(fullScreenData.weekData.week, fullScreenData.day.day, fullScreenData.day.exercises.length)}
          weightLog={getWeightLog(fullScreenData.weekData.week, fullScreenData.day.day)}
          onExerciseToggle={(index, completed) => onExerciseComplete(fullScreenData.weekData.week, fullScreenData.day.day, index, completed, fullScreenData.day.exercises.length)}
          onWeightUpdate={(exerciseIndex, setIndex, weight) => onWeightUpdate(fullScreenData.weekData.week, fullScreenData.day.day, exerciseIndex, setIndex, weight)}
          onComplete={() => {
            onDayComplete(fullScreenData.weekData.week, fullScreenData.day.day, true);
            setShowFullScreen(false);
            setFullScreenData(null);
          }}
          onExit={() => {
            setShowFullScreen(false);
            setSelectedDay(fullScreenData);
            setFullScreenData(null);
          }}
        />,
        document.body
      )}
    </>
  );
}
