import { useTranslation } from 'react-i18next';
import { Reorder } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Crown, ChevronRight, GraduationCap, Brain, BookOpen, Moon, Shield, ArrowUpDown, GripVertical } from 'lucide-react';
import { useMindFuelDailyTasks, DailyTask, TaskId } from '@/hooks/useMindFuelDailyTasks';
import { useMindFuelEducationProgress, EducationType, EducationItem } from '@/hooks/useMindFuelEducationProgress';
import { cn } from '@/lib/utils';
import { WellnessModule } from './wellness-hub/WellnessHubNav';
import { useEffect, useState } from 'react';

interface MindFuelDailyChecklistProps {
  onModuleChange: (module: WellnessModule) => void;
  onScrollToLesson?: () => void;
  onScrollToChallenge?: () => void;
}

const EDUCATION_ICONS: Record<EducationType, typeof Brain> = {
  basics: Brain,
  topics: BookOpen,
  sleep: Moon,
  boundaries: Shield,
};

const EDUCATION_COLORS: Record<EducationType, { bg: string; border: string; text: string }> = {
  basics: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-400' },
  topics: { bg: 'bg-indigo-500/20', border: 'border-indigo-500/50', text: 'text-indigo-400' },
  sleep: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400' },
  boundaries: { bg: 'bg-teal-500/20', border: 'border-teal-500/50', text: 'text-teal-400' },
};

export default function MindFuelDailyChecklist({
  onModuleChange,
  onScrollToLesson,
  onScrollToChallenge,
}: MindFuelDailyChecklistProps) {
  const { t } = useTranslation();
  const { tasks, loading, toggleTask, completedCount, totalCount, progress, allComplete } = useMindFuelDailyTasks();
  const { getEducationItems, totalEducationProgress, loading: educationLoading } = useMindFuelEducationProgress();
  const [showConfetti, setShowConfetti] = useState(false);
  const [autoSort, setAutoSort] = useState(() => localStorage.getItem('mindfuel-sort') !== 'original');
  const [orderedTasks, setOrderedTasks] = useState<DailyTask[]>([]);
  const [orderedEducation, setOrderedEducation] = useState<EducationItem[]>([]);

  const educationItems = getEducationItems();
  const { completed: eduCompleted, total: eduTotal, allComplete: eduAllComplete } = totalEducationProgress();

  // Sync ordered tasks with fetched tasks and restore saved order
  useEffect(() => {
    if (tasks.length > 0) {
      const savedOrder = localStorage.getItem('mindfuel-tasks-order');
      if (savedOrder && !autoSort) {
        try {
          const orderIds = JSON.parse(savedOrder) as string[];
          const sorted = [...tasks].sort((a, b) => {
            const aIdx = orderIds.indexOf(a.id);
            const bIdx = orderIds.indexOf(b.id);
            if (aIdx === -1 && bIdx === -1) return 0;
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
          });
          setOrderedTasks(sorted);
        } catch {
          setOrderedTasks(tasks);
        }
      } else {
        setOrderedTasks(tasks);
      }
    }
  }, [tasks, autoSort]);

  // Sync ordered education items
  useEffect(() => {
    if (educationItems.length > 0) {
      const savedOrder = localStorage.getItem('mindfuel-education-order');
      if (savedOrder && !autoSort) {
        try {
          const orderIds = JSON.parse(savedOrder) as string[];
          const sorted = [...educationItems].sort((a, b) => {
            const aIdx = orderIds.indexOf(a.id);
            const bIdx = orderIds.indexOf(b.id);
            if (aIdx === -1 && bIdx === -1) return 0;
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
          });
          setOrderedEducation(sorted);
        } catch {
          setOrderedEducation(educationItems);
        }
      } else {
        setOrderedEducation(educationItems);
      }
    }
  }, [educationItems, autoSort]);

  const toggleAutoSort = () => {
    const newValue = !autoSort;
    setAutoSort(newValue);
    localStorage.setItem('mindfuel-sort', newValue ? 'auto' : 'original');
  };

  const handleReorderTasks = (newOrder: DailyTask[]) => {
    setOrderedTasks(newOrder);
    localStorage.setItem('mindfuel-tasks-order', JSON.stringify(newOrder.map(t => t.id)));
  };

  const handleReorderEducation = (newOrder: EducationItem[]) => {
    setOrderedEducation(newOrder);
    localStorage.setItem('mindfuel-education-order', JSON.stringify(newOrder.map(e => e.id)));
  };

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

  const handleEducationClick = (type: EducationType) => {
    onModuleChange('education');
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

  // Get display items based on sort mode
  const displayTasks = autoSort
    ? [...orderedTasks].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1))
    : orderedTasks;

  const displayEducation = autoSort
    ? [...orderedEducation].sort((a, b) => {
        const aComplete = a.completedItems >= a.totalItems;
        const bComplete = b.completedItems >= b.totalItems;
        return aComplete === bComplete ? 0 : aComplete ? 1 : -1;
      })
    : orderedEducation;

  const renderTaskItem = (task: DailyTask) => {
    const Icon = task.icon;
    const colorClasses = getTaskColorClasses(task);

    return (
      <div
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
        {/* Drag handle - only visible in manual mode */}
        {!autoSort && (
          <div 
            className="flex-shrink-0 cursor-grab active:cursor-grabbing text-violet-300/50 hover:text-violet-300"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}
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
  };

  const renderEducationItem = (item: EducationItem) => {
    const Icon = EDUCATION_ICONS[item.type];
    const colors = EDUCATION_COLORS[item.type];
    const isComplete = item.completedItems >= item.totalItems;

    return (
      <div
        className={cn(
          "group flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer",
          "border",
          isComplete
            ? "bg-cyan-500/10 border-cyan-500/30"
            : `${colors.bg} ${colors.border} hover:scale-[1.005]`
        )}
        onClick={() => handleEducationClick(item.type)}
      >
        {/* Drag handle - only visible in manual mode */}
        {!autoSort && (
          <div 
            className="flex-shrink-0 cursor-grab active:cursor-grabbing text-cyan-300/50 hover:text-cyan-300"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}
        <div className={cn(
          "flex-shrink-0 p-2 rounded-lg",
          isComplete ? "bg-cyan-500/30" : `${colors.bg}`
        )}>
          <Icon className={cn("h-4 w-4", isComplete ? "text-cyan-400" : colors.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "text-sm font-semibold",
            isComplete ? "text-cyan-400" : "text-primary-foreground"
          )}>
            {t(item.titleKey)}
          </h4>
          <p className="text-xs text-muted-foreground truncate">
            {t(item.descriptionKey)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-medium px-1.5 py-0.5 rounded",
            isComplete ? "bg-cyan-500/20 text-cyan-400" : `${colors.bg} ${colors.text}`
          )}>
            {item.completedItems}/{item.totalItems}
          </span>
          {isComplete && <Check className="h-4 w-4 text-cyan-400" />}
        </div>
        <ChevronRight className={cn(
          "h-4 w-4 transition-all opacity-0 group-hover:opacity-100",
          isComplete ? "text-cyan-400" : colors.text
        )} />
      </div>
    );
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
          
          {/* Auto-sort toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAutoSort}
            className="flex items-center gap-1.5 text-xs font-medium text-violet-300/70 hover:text-violet-200"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {autoSort ? t('mindFuel.autoSort', 'Auto') : t('mindFuel.manualSort', 'Manual')}
          </Button>

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

        {/* Task List - conditionally sorted or reorderable based on autoSort preference */}
        {autoSort ? (
          <div className="space-y-2.5">
            {displayTasks.map((task) => (
              <div key={task.id}>
                {renderTaskItem(task)}
              </div>
            ))}
          </div>
        ) : (
          <Reorder.Group axis="y" values={orderedTasks} onReorder={handleReorderTasks} className="space-y-2.5">
            {orderedTasks.map((task) => (
              <Reorder.Item key={task.id} value={task}>
                {renderTaskItem(task)}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}

        {/* Motivational footer */}
        {!allComplete && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="text-xs text-violet-300/70 font-medium">
              {t('mindFuel.dailyChecklist.motivation', 'Complete all tasks for streak bonus!')}
            </span>
            <Sparkles className="h-3 w-3 text-violet-400 animate-pulse" />
          </div>
        )}

        {/* Learning Journey Section */}
        <div className="pt-4 border-t border-violet-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30">
              <GraduationCap className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-primary-foreground">
                {t('mindFuel.dailyChecklist.learningJourney.title', 'Learning Journey')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('mindFuel.dailyChecklist.learningJourney.subtitle', 'Your path to mental wellness mastery')}
              </p>
            </div>
            {eduAllComplete ? (
              <span className="px-2 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-xs font-bold text-cyan-400">
                {t('mindFuel.dailyChecklist.learningJourney.allComplete', 'Wellness Scholar!')}
              </span>
            ) : (
              <span className="text-xs text-cyan-400/70 font-medium">
                {eduCompleted}/{eduTotal}
              </span>
            )}
          </div>

          {autoSort ? (
            <div className="space-y-2">
              {displayEducation.map((item) => (
                <div key={item.id}>
                  {renderEducationItem(item)}
                </div>
              ))}
            </div>
          ) : (
            <Reorder.Group axis="y" values={orderedEducation} onReorder={handleReorderEducation} className="space-y-2">
              {orderedEducation.map((item) => (
                <Reorder.Item key={item.id} value={item}>
                  {renderEducationItem(item)}
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}

          <p className="text-center text-xs text-muted-foreground/60 mt-3">
            {t('mindFuel.dailyChecklist.learningJourney.encouragement', 'Keep learning at your own pace')}
          </p>
        </div>
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
