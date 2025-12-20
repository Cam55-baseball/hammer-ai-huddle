import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Crown, ChevronRight } from 'lucide-react';
import { useMindFuelDailyTasks, DailyTask, TaskId } from '@/hooks/useMindFuelDailyTasks';
import { cn } from '@/lib/utils';
import { WellnessModule } from './wellness-hub/WellnessHubNav';
import { useEffect, useState } from 'react';

interface MindFuelDailyChecklistProps {
  onModuleChange: (module: WellnessModule) => void;
  onScrollToLesson?: () => void;
  onScrollToChallenge?: () => void;
}

export default function MindFuelDailyChecklist({
  onModuleChange,
  onScrollToLesson,
  onScrollToChallenge,
}: MindFuelDailyChecklistProps) {
  const { t } = useTranslation();
  const { tasks, loading, toggleTask, completedCount, totalCount, progress, allComplete } = useMindFuelDailyTasks();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (allComplete && !loading) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [allComplete, loading]);

  const handleTaskClick = (task: DailyTask) => {
    if (task.targetModule === 'lesson') {
      onScrollToLesson?.();
    } else if (task.targetModule === 'challenge') {
      onScrollToChallenge?.();
    } else {
      onModuleChange(task.targetModule as WellnessModule);
    }
  };

  const handleToggle = async (e: React.MouseEvent, taskId: TaskId) => {
    e.stopPropagation();
    await toggleTask(taskId);
  };

  const getTaskColorClasses = (task: DailyTask) => {
    const colors: Record<string, { bg: string; border: string; icon: string; text: string }> = {
      violet: { bg: 'bg-violet-500/20', border: 'border-violet-500/50', icon: 'bg-violet-500', text: 'text-violet-400' },
      pink: { bg: 'bg-pink-500/20', border: 'border-pink-500/50', icon: 'bg-pink-500', text: 'text-pink-400' },
      blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', icon: 'bg-blue-500', text: 'text-blue-400' },
      amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', icon: 'bg-amber-500', text: 'text-amber-400' },
      emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', icon: 'bg-emerald-500', text: 'text-emerald-400' },
    };
    return colors[task.color] || colors.violet;
  };

  if (loading) {
    return (
      <Card className="relative overflow-hidden border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-fuchsia-500/10">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-violet-500/20 rounded" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-violet-500/10 rounded-xl" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-2 border-violet-500/40 bg-gradient-to-br from-violet-600/15 via-purple-600/10 to-fuchsia-600/10 shadow-xl shadow-violet-500/10">
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNhNzhjZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      
      {/* Glow effect */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-fuchsia-500/20 rounded-full blur-2xl" />

      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-[confetti_1.5s_ease-out_forwards]"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                backgroundColor: ['#a78bfa', '#f0abfc', '#818cf8', '#c084fc'][Math.floor(Math.random() * 4)],
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      <CardContent className="relative p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-primary-foreground tracking-tight">
                {t('mindFuel.dailyChecklist.title', 'Mental Fuel+')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('mindFuel.dailyChecklist.subtitle', 'Your daily mental training checklist')}
              </p>
            </div>
          </div>

          {/* Progress Ring */}
          <div className="flex items-center gap-3 bg-background/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-violet-500/30">
            {allComplete ? (
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/40 animate-pulse">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-black text-amber-400 uppercase tracking-wide">
                  {t('mindFuel.dailyChecklist.allComplete', 'Champion!')}
                </span>
              </div>
            ) : (
              <>
                <div className="relative h-14 w-14">
                  <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      className="stroke-violet-500/20"
                      strokeWidth="4"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      className="stroke-violet-400"
                      strokeWidth="4"
                      strokeDasharray={`${progress * 0.88} 88`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-violet-300">
                    {completedCount}/{totalCount}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-violet-300/80 uppercase tracking-wider">
                    {t('mindFuel.dailyChecklist.tasksLabel', 'Tasks')}
                  </span>
                  <span className="text-sm font-black text-primary-foreground">
                    {t('mindFuel.dailyChecklist.progress', '{{completed}} of {{total}}', { completed: completedCount, total: totalCount })}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2.5">
          {tasks.map((task) => {
            const Icon = task.icon;
            const colorClasses = getTaskColorClasses(task);

            return (
              <div
                key={task.id}
                className={cn(
                  "group relative flex items-center gap-3 p-3.5 rounded-xl transition-all duration-300 cursor-pointer",
                  "border-2",
                  task.completed
                    ? "bg-green-500/15 border-green-500/40"
                    : `${colorClasses.bg} ${colorClasses.border} hover:scale-[1.01] hover:shadow-lg`,
                  !task.completed && "mind-fuel-task-pulse"
                )}
                onClick={() => handleTaskClick(task)}
              >
                {/* Icon */}
                <div className={cn(
                  "flex-shrink-0 p-2.5 rounded-lg transition-all duration-300",
                  task.completed ? "bg-green-500" : colorClasses.icon
                )}>
                  <Icon className="h-5 w-5 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "text-sm sm:text-base font-bold transition-all",
                    task.completed ? "text-muted-foreground line-through" : "text-primary-foreground"
                  )}>
                    {t(task.titleKey)}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {t(task.descriptionKey)}
                  </p>
                </div>

                {/* Checkbox */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleToggle(e, task.id)}
                  className={cn(
                    "flex-shrink-0 h-8 w-8 p-0 rounded-full border-2 transition-all duration-300",
                    task.completed
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-violet-400/50 hover:border-violet-400 hover:bg-violet-500/20"
                  )}
                >
                  {task.completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-violet-400/50 group-hover:scale-125 transition-transform" />
                  )}
                </Button>

                {/* Arrow indicator */}
                <ChevronRight className={cn(
                  "h-4 w-4 transition-all duration-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0",
                  task.completed ? "text-green-400" : colorClasses.text
                )} />
              </div>
            );
          })}
        </div>

        {/* Motivational footer */}
        {!allComplete && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="text-xs text-violet-300/70 font-medium">
              {t('mindFuel.dailyChecklist.motivation', 'Complete all tasks for streak bonus!')}
            </span>
            <Sparkles className="h-3 w-3 text-violet-400 animate-pulse" />
          </div>
        )}
      </CardContent>

      {/* Animations */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(400px) rotate(720deg);
            opacity: 0;
          }
        }
        
        @keyframes mind-fuel-task-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.3);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
          }
        }
        
        .mind-fuel-task-pulse {
          animation: mind-fuel-task-pulse 2.5s ease-in-out infinite;
        }
      `}</style>
    </Card>
  );
}
