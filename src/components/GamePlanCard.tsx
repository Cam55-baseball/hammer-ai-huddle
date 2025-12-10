import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Check, Target, Clock, Sparkles } from 'lucide-react';
import { useGamePlan, GamePlanTask } from '@/hooks/useGamePlan';
import { cn } from '@/lib/utils';

interface GamePlanCardProps {
  selectedSport: 'baseball' | 'softball';
}

export function GamePlanCard({ selectedSport }: GamePlanCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tasks, completedCount, totalCount, daysUntilRecap, recapProgress, loading } = useGamePlan(selectedSport);

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  const allComplete = completedCount === totalCount && totalCount > 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleTaskClick = (task: GamePlanTask) => {
    navigate(task.link);
  };

  if (loading) {
    return (
      <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10">
        <CardContent className="p-4 sm:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="space-y-3">
              <div className="h-16 bg-muted rounded-lg" />
              <div className="h-16 bg-muted rounded-lg" />
              <div className="h-16 bg-muted rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-accent/10 shadow-xl shadow-primary/10">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-accent/20 to-transparent rounded-tr-full" />
      
      <CardContent className="relative p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                {t('gamePlan.title')}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">{today}</p>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50">
            {allComplete ? (
              <>
                <Sparkles className="h-4 w-4 text-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-500">
                  {t('gamePlan.allComplete')}
                </span>
              </>
            ) : (
              <>
                <div className="relative h-8 w-8">
                  <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      className="stroke-muted"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      className="stroke-primary"
                      strokeWidth="3"
                      strokeDasharray={`${progressPercent * 0.88} 88`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                    {completedCount}
                  </span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {t('gamePlan.tasksCompleted', { completed: completedCount, total: totalCount })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-2 sm:space-y-3">
          {tasks.map((task) => {
            const Icon = task.icon;
            return (
              <button
                key={task.id}
                onClick={() => handleTaskClick(task)}
                className={cn(
                  "w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all duration-300",
                  "hover:scale-[1.02] active:scale-[0.98] cursor-pointer",
                  "border-2",
                  task.completed
                    ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/15"
                    : "bg-card/50 border-primary/20 hover:border-primary/40 hover:bg-card/80",
                  !task.completed && "animate-pulse-subtle"
                )}
              >
                {/* Icon */}
                <div className={cn(
                  "flex-shrink-0 p-2 sm:p-2.5 rounded-lg",
                  task.completed 
                    ? "bg-green-500/20" 
                    : "bg-primary/20"
                )}>
                  <Icon className={cn(
                    "h-4 w-4 sm:h-5 sm:w-5",
                    task.completed ? "text-green-500" : "text-primary"
                  )} />
                </div>
                
                {/* Content */}
                <div className="flex-1 text-left min-w-0">
                  <h3 className={cn(
                    "text-sm sm:text-base font-semibold truncate",
                    task.completed && "line-through text-muted-foreground"
                  )}>
                    {t(task.title)}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {t(task.description)}
                  </p>
                </div>
                
                {/* Status indicator */}
                <div className={cn(
                  "flex-shrink-0 h-6 w-6 sm:h-7 sm:w-7 rounded-full flex items-center justify-center",
                  task.completed
                    ? "bg-green-500 text-white"
                    : "border-2 border-dashed border-muted-foreground/30"
                )}>
                  {task.completed && <Check className="h-3 w-3 sm:h-4 sm:w-4" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* 6-Week Recap Countdown */}
        <div className="pt-3 sm:pt-4 border-t border-border/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="h-4 w-4 text-accent flex-shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">
                {t('gamePlan.recapCountdown.title')}
              </span>
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">
              {t('gamePlan.recapCountdown.daysRemaining', { days: daysUntilRecap })}
            </span>
          </div>
          <div className="mt-2">
            <Progress value={recapProgress} className="h-2" />
          </div>
        </div>
      </CardContent>
      
      {/* Subtle animation style */}
      <style>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }
      `}</style>
    </Card>
  );
}
