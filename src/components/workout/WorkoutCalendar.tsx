import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Circle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";

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
  onWorkoutClick: (workout: Workout) => void;
}

export function WorkoutCalendar({ workouts, currentMonth, onWorkoutClick }: WorkoutCalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getWorkoutForDay = (day: Date) => {
    return workouts.find(w => isSameDay(parseISO(w.scheduled_date), day));
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
      <div className="flex items-center gap-2 mb-4">
        <CalendarIcon className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
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

          return (
            <div
              key={day.toISOString()}
              className={`aspect-square p-1 rounded-lg border transition-colors ${
                isToday ? 'border-primary bg-primary/5' : 'border-border'
              } ${workout ? 'cursor-pointer hover:bg-accent' : ''}`}
              onClick={() => workout && onWorkoutClick(workout)}
            >
              <div className="h-full flex flex-col items-center justify-center gap-1">
                <span className="text-xs sm:text-sm font-medium">{format(day, 'd')}</span>
                {workout && (
                  <>
                    <div className={`w-2 h-2 rounded-full ${workout.workout_templates.workout_type === 'strength' ? 'bg-blue-500' : 'bg-green-500'}`} />
                    {getStatusIcon(workout.status)}
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