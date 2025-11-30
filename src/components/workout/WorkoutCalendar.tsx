import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Circle, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from "date-fns";

interface Workout {
  id: string;
  scheduled_date: string;
  status: string;
  workout_templates: {
    title: string;
    workout_type: string;
  };
}

interface WorkoutCalendarProps {
  workouts: Workout[];
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  onWorkoutClick: (workout: Workout) => void;
}

export function WorkoutCalendar({ workouts, currentMonth, onMonthChange, onWorkoutClick }: WorkoutCalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getWorkoutForDay = (day: Date) => {
    return workouts.find(w => isSameDay(parseISO(w.scheduled_date), day));
  };

  // Find the next scheduled workout after today
  const getNextScheduledWorkout = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureScheduled = workouts
      .filter(w => {
        const workoutDate = parseISO(w.scheduled_date);
        return workoutDate > today && w.status === 'scheduled';
      })
      .sort((a, b) => parseISO(a.scheduled_date).getTime() - parseISO(b.scheduled_date).getTime());
    
    return futureScheduled[0] || null;
  };

  // Determine if a workout is clickable
  const isWorkoutClickable = (workout: Workout, day: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const workoutDate = parseISO(workout.scheduled_date);
    
    // Past or today workouts are always clickable
    if (workoutDate <= today) return true;
    
    // Future workouts: only the NEXT scheduled one is clickable
    const nextScheduled = getNextScheduledWorkout();
    if (nextScheduled && workout.id === nextScheduled.id) return true;
    
    return false;
  };

  const handlePreviousMonth = () => {
    onMonthChange(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(addMonths(currentMonth, 1));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'missed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'scheduled':
        return <Circle className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getWorkoutTypeColor = (type: string) => {
    return type === 'strength' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20';
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs sm:text-sm text-muted-foreground">Strength</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs sm:text-sm text-muted-foreground">Speed</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
            {day}
          </div>
        ))}
        
        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {daysInMonth.map(day => {
          const workout = getWorkoutForDay(day);
          const isToday = isSameDay(day, new Date());
          const isClickable = workout ? isWorkoutClickable(workout, day) : false;

          return (
            <div
              key={day.toISOString()}
              className={`aspect-square p-1 rounded-lg border transition-colors ${
                isToday ? 'border-primary bg-primary/5' : 'border-border'
              } ${workout && isClickable ? 'cursor-pointer hover:bg-accent' : ''} ${
                workout && !isClickable ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => workout && isClickable && onWorkoutClick(workout)}
            >
              <div className="h-full flex flex-col items-center justify-center gap-1 relative">
                <span className="text-xs sm:text-sm font-medium">{format(day, 'd')}</span>
                {workout && (
                  <>
                    <div className={`w-2 h-2 rounded-full ${workout.workout_templates.workout_type === 'strength' ? 'bg-blue-500' : 'bg-green-500'}`} />
                    {getStatusIcon(workout.status)}
                    {!isClickable && (
                      <Lock className="h-3 w-3 text-muted-foreground absolute top-0 right-0" />
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}