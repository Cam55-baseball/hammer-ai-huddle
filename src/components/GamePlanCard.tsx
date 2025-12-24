import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Reorder } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Check, Target, Clock, Trophy, Zap, Plus, ArrowUpDown, GripVertical } from 'lucide-react';
import { useGamePlan, GamePlanTask } from '@/hooks/useGamePlan';
import { QuickNutritionLogDialog } from '@/components/QuickNutritionLogDialog';
import { VaultFocusQuizDialog } from '@/components/vault/VaultFocusQuizDialog';
import { WeeklyWellnessQuizDialog } from '@/components/vault/WeeklyWellnessQuizDialog';
import { useVault } from '@/hooks/useVault';
import { useUserColors, hexToRgba } from '@/hooks/useUserColors';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GamePlanCardProps {
  selectedSport: 'baseball' | 'softball';
}

export function GamePlanCard({ selectedSport }: GamePlanCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tasks, completedCount, totalCount, daysUntilRecap, recapProgress, loading, refetch } = useGamePlan(selectedSport);
  const { getEffectiveColors } = useUserColors(selectedSport);
  const colors = useMemo(() => getEffectiveColors(), [getEffectiveColors]);
  const isSoftball = selectedSport === 'softball';
  const { saveFocusQuiz } = useVault();
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [wellnessQuizOpen, setWellnessQuizOpen] = useState(false);
  const [activeQuizType, setActiveQuizType] = useState<'pre_lift' | 'night' | 'morning'>('morning');
  const [autoSort, setAutoSort] = useState(() => localStorage.getItem('gameplan-sort') !== 'original');
  
  // State for ordered tasks per section
  const [orderedCheckin, setOrderedCheckin] = useState<GamePlanTask[]>([]);
  const [orderedTraining, setOrderedTraining] = useState<GamePlanTask[]>([]);
  const [orderedTracking, setOrderedTracking] = useState<GamePlanTask[]>([]);

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  }).toUpperCase();

  const allComplete = completedCount === totalCount && totalCount > 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Create stable dependency key to prevent infinite loops
  const tasksKey = JSON.stringify(tasks.map(t => ({ id: t.id, section: t.section, completed: t.completed })));

  // Sync ordered tasks with fetched tasks and restore saved order
  useEffect(() => {
    const checkinTasksList = tasks.filter(t => t.section === 'checkin');
    const trainingTasksList = tasks.filter(t => t.section === 'training');
    const trackingTasksList = tasks.filter(t => t.section === 'tracking');

    if (!autoSort) {
      // Restore saved orders
      const restoreOrder = (sectionTasks: GamePlanTask[], storageKey: string): GamePlanTask[] => {
        const savedOrder = localStorage.getItem(storageKey);
        if (savedOrder) {
          try {
            const orderIds = JSON.parse(savedOrder) as string[];
            return [...sectionTasks].sort((a, b) => {
              const aIdx = orderIds.indexOf(a.id);
              const bIdx = orderIds.indexOf(b.id);
              if (aIdx === -1 && bIdx === -1) return 0;
              if (aIdx === -1) return 1;
              if (bIdx === -1) return -1;
              return aIdx - bIdx;
            });
          } catch {
            return sectionTasks;
          }
        }
        return sectionTasks;
      };

      setOrderedCheckin(restoreOrder(checkinTasksList, 'gameplan-checkin-order'));
      setOrderedTraining(restoreOrder(trainingTasksList, 'gameplan-training-order'));
      setOrderedTracking(restoreOrder(trackingTasksList, 'gameplan-tracking-order'));
    } else {
      setOrderedCheckin(checkinTasksList);
      setOrderedTraining(trainingTasksList);
      setOrderedTracking(trackingTasksList);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksKey, autoSort]);

  const handleTaskClick = (task: GamePlanTask) => {
    // Handle mindfuel and healthtip - navigate directly
    if (task.id === 'mindfuel' || task.id === 'healthtip') {
      navigate(task.link);
      return;
    }

    // Handle Tex Vision - navigate directly
    if (task.id === 'texvision') {
      navigate(task.link);
      return;
    }

    // Handle quiz tasks - open dialog directly
    if (task.taskType === 'quiz') {
      if (task.id === 'quiz-morning') {
        setActiveQuizType('morning');
        setQuizDialogOpen(true);
      } else if (task.id === 'quiz-prelift') {
        setActiveQuizType('pre_lift');
        setQuizDialogOpen(true);
      } else if (task.id === 'quiz-night') {
        setActiveQuizType('night');
        setQuizDialogOpen(true);
      }
      return;
    }

    // Handle tracking tasks - navigate to vault with section param or open dialog
    if (task.taskType === 'tracking') {
      if (task.id === 'tracking-wellness-goals') {
        setWellnessQuizOpen(true);
        return;
      }
      navigate(task.link);
      return;
    }

    // Handle nutrition task - navigate to vault with nutrition section
    if (task.taskType === 'nutrition') {
      navigate('/vault?openSection=nutrition');
      return;
    }

    // Default: navigate to task link
    navigate(task.link);
  };

  const handleQuickLogClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickLogOpen(true);
  };

  const handleQuizSubmit = async (data: any) => {
    const result = await saveFocusQuiz(activeQuizType, data);
    if (result.success) {
      toast.success(t('vault.quiz.saved'));
      refetch();
    } else {
      toast.error(t('vault.quiz.error'));
    }
    return result;
  };

  // Sort helper: incomplete tasks first, completed tasks at bottom
  const sortByCompletion = (tasksList: GamePlanTask[]) => 
    [...tasksList].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));

  const toggleAutoSort = () => {
    const newValue = !autoSort;
    setAutoSort(newValue);
    localStorage.setItem('gameplan-sort', newValue ? 'auto' : 'original');
  };

  const handleReorderCheckin = (newOrder: GamePlanTask[]) => {
    setOrderedCheckin(newOrder);
    localStorage.setItem('gameplan-checkin-order', JSON.stringify(newOrder.map(t => t.id)));
  };

  const handleReorderTraining = (newOrder: GamePlanTask[]) => {
    setOrderedTraining(newOrder);
    localStorage.setItem('gameplan-training-order', JSON.stringify(newOrder.map(t => t.id)));
  };

  const handleReorderTracking = (newOrder: GamePlanTask[]) => {
    setOrderedTracking(newOrder);
    localStorage.setItem('gameplan-tracking-order', JSON.stringify(newOrder.map(t => t.id)));
  };

  // Get display tasks based on sort mode
  const checkinTasks = autoSort ? sortByCompletion(orderedCheckin) : orderedCheckin;
  const trainingTasks = autoSort ? sortByCompletion(orderedTraining) : orderedTraining;
  const trackingTasks = autoSort ? sortByCompletion(orderedTracking) : orderedTracking;

  const renderTask = (task: GamePlanTask) => {
    const Icon = task.icon;
    const isIncomplete = !task.completed;
    const isTracking = task.section === 'tracking';
    const isTexVision = task.specialStyle === 'tex-vision';
    
    // Get dynamic colors based on task type
    const pendingColors = colors.gamePlan.pending;
    const trackingColors = colors.gamePlan.tracking;
    const texVisionColors = colors.gamePlan.texVision;
    
    // Determine which color set to use for pending tasks
    const activeColors = isTexVision ? texVisionColors : isTracking ? trackingColors : pendingColors;
    
    return (
      <div
        className={cn(
          "w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all duration-200",
          "border-2",
          task.completed && "bg-green-500/20 border-green-500/50"
        )}
        style={!task.completed ? {
          backgroundColor: activeColors.background,
          borderColor: activeColors.border,
          animation: 'game-plan-pulse-custom 2s ease-in-out infinite',
        } : undefined}
      >
        {/* Drag handle - only visible in manual mode */}
        {!autoSort && (
          <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-white/60 hover:text-white">
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        
        {/* Clickable main area */}
        <button
          onClick={() => handleTaskClick(task)}
          className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
        >
          {/* Icon */}
          <div 
            className={cn(
              "flex-shrink-0 p-2 sm:p-2.5 rounded-lg",
              task.completed && "bg-green-500"
            )}
            style={!task.completed ? { backgroundColor: activeColors.icon } : undefined}
          >
            <Icon className={cn(
              "h-5 w-5 sm:h-6 sm:w-6",
              task.completed ? "text-white" : "text-white"
            )} />
          </div>
          
          {/* Content */}
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={cn(
                "text-sm sm:text-base truncate",
                task.completed 
                  ? "font-semibold text-white/50 line-through" 
                  : "font-black text-white"
              )}>
                {t(task.titleKey)}
              </h3>
              {task.badge && !task.completed && (
                <span 
                  className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                  style={{
                    backgroundColor: hexToRgba(activeColors.icon, 0.3),
                    color: activeColors.text,
                  }}
                >
                  {t(task.badge)}
                </span>
              )}
            </div>
            <p className={cn(
              "text-xs sm:text-sm truncate",
              task.completed ? "text-white/40" : "text-white/70"
            )}>
              {t(task.descriptionKey)}
            </p>
          </div>
        </button>
        
        {/* Status indicator */}
        <div 
          className={cn(
            "flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center",
            task.completed && "bg-green-500 text-white"
          )}
          style={!task.completed ? { 
            border: `3px dashed ${activeColors.border}`,
          } : undefined}
        >
          {task.completed ? (
            <Check className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <Zap 
              className="h-3 w-3 sm:h-4 sm:w-4 animate-pulse"
              style={{ color: activeColors.icon }}
            />
          )}
        </div>

        {/* Urgency indicator for incomplete tasks */}
        {isIncomplete && (
          <div 
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full border"
            style={{
              backgroundColor: hexToRgba(activeColors.icon, 0.2),
              borderColor: hexToRgba(activeColors.icon, 0.4),
            }}
          >
            <span 
              className="text-[10px] font-black uppercase tracking-wider"
              style={{ color: activeColors.text }}
            >
              {t('gamePlan.doIt')}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderTaskSection = (
    sectionTasks: GamePlanTask[], 
    orderedTasks: GamePlanTask[],
    onReorder: (newOrder: GamePlanTask[]) => void,
    title: string,
    titleColor: string,
    lineColor: string,
    showQuickAction?: boolean
  ) => {
    if (sectionTasks.length === 0) return null;

    return (
      <div className="space-y-2">
        <h3 className={`text-xs font-black ${titleColor} uppercase tracking-widest flex items-center gap-2`}>
          <span className={`h-px flex-1 ${lineColor}`} />
          {title}
          <span className={`h-px flex-1 ${lineColor}`} />
        </h3>
        
        {showQuickAction && (
          <div className="flex justify-center pb-1">
            <Button
              size="sm"
              onClick={handleQuickLogClick}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              <Plus className="h-4 w-4" />
              {t('gamePlan.quickActions.logMeal')}
            </Button>
          </div>
        )}
        
        {autoSort ? (
          <div className="space-y-2">
            {sectionTasks.map((task) => (
              <div key={task.id}>
                {renderTask(task)}
              </div>
            ))}
          </div>
        ) : (
          <Reorder.Group axis="y" values={orderedTasks} onReorder={onReorder} className="space-y-2">
            {orderedTasks.map((task) => (
              <Reorder.Item key={task.id} value={task}>
                {renderTask(task)}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="relative overflow-hidden border-3 border-primary/50 bg-secondary">
        <CardContent className="p-4 sm:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-56 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="space-y-3">
              <div className="h-14 bg-muted rounded-lg" />
              <div className="h-14 bg-muted rounded-lg" />
              <div className="h-14 bg-muted rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-3 border-primary bg-secondary shadow-2xl">
      {/* Athletic diagonal stripe accent */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 transform rotate-45 translate-x-20 -translate-y-20" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 transform -rotate-45 -translate-x-16 translate-y-16" />
      
      <CardContent className="relative p-4 sm:p-6 space-y-4">
        {/* Bold Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary">
              <Target className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                {t('gamePlan.title')}
              </h2>
                <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-primary tracking-wide">{today}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                  {t('gamePlan.subtitle')}
                </span>
              </div>
            </div>
          </div>
          
          {/* Auto-sort toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAutoSort}
            className="flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {autoSort ? t('gamePlan.autoSort', 'Auto') : t('gamePlan.manualSort', 'Manual')}
          </Button>
          
          {/* Progress Ring */}
          <div className="flex items-center gap-3 bg-background/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-primary/30">
            {allComplete ? (
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-green-500">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-black text-green-400 uppercase tracking-wide">
                  {t('gamePlan.allComplete')}
                </span>
              </div>
            ) : (
              <>
                <div className="relative h-12 w-12">
                  <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      className="stroke-muted/30"
                      strokeWidth="4"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      className="stroke-primary"
                      strokeWidth="4"
                      strokeDasharray={`${progressPercent * 0.88} 88`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">
                    {completedCount}/{totalCount}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white/70 uppercase tracking-wider">
                    {t('gamePlan.tasksLabel')}
                  </span>
                  <span className="text-sm font-black text-white">
                    {t('gamePlan.tasksCompleted', { completed: completedCount, total: totalCount })}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 6-Week Recap Countdown - Compact Box */}
        <div className="flex items-center gap-3 bg-background/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-primary/30">
          <Clock className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/70 uppercase tracking-wide">
                {t('gamePlan.recapCountdown.title')}
              </span>
              <Progress value={recapProgress} className="h-1.5 flex-1 bg-muted/20 max-w-24" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 border border-primary/30 flex-shrink-0">
            <span className="text-sm font-black text-primary">
              {daysUntilRecap}
            </span>
            <span className="text-[10px] font-bold text-white/70 uppercase">
              {t('gamePlan.recapCountdown.days')}
            </span>
          </div>
        </div>

        {/* Task Sections */}
        <div className="space-y-4">
          {/* Daily Check-ins Section */}
          {renderTaskSection(
            checkinTasks,
            orderedCheckin,
            handleReorderCheckin,
            t('gamePlan.sections.dailyCheckins'),
            'text-primary',
            'bg-primary/30',
            true
          )}

          {/* Training Section */}
          {renderTaskSection(
            trainingTasks,
            orderedTraining,
            handleReorderTraining,
            t('gamePlan.sections.training'),
            'text-primary',
            'bg-primary/30'
          )}

          {/* Cycle Tracking Section */}
          {renderTaskSection(
            trackingTasks,
            orderedTracking,
            handleReorderTracking,
            t('gamePlan.sections.cycleTracking'),
            'text-purple-400',
            'bg-purple-500/30'
          )}
        </div>

      </CardContent>
      
      {/* Quick Nutrition Log Dialog */}
      <QuickNutritionLogDialog
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
        onSuccess={refetch}
      />
      
      {/* Focus Quiz Dialog */}
      <VaultFocusQuizDialog
        open={quizDialogOpen}
        onOpenChange={setQuizDialogOpen}
        quizType={activeQuizType}
        onSubmit={handleQuizSubmit}
      />
      
      {/* Weekly Wellness Goals Dialog */}
      <WeeklyWellnessQuizDialog
        open={wellnessQuizOpen}
        onOpenChange={setWellnessQuizOpen}
        onComplete={refetch}
      />
      
      {/* Pulsing animation for incomplete tasks */}
      <style>{`
        @keyframes game-plan-pulse-custom {
          0%, 100% {
            box-shadow: 0 0 0 0 ${hexToRgba(colors.gamePlan.pending.icon, 0.4)};
          }
          50% {
            box-shadow: 0 0 0 6px ${hexToRgba(colors.gamePlan.pending.icon, 0.1)};
          }
        }
      `}</style>
    </Card>
  );
}