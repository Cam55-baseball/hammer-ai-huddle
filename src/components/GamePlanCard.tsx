import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Reorder } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Check, Target, Clock, Trophy, Zap, Plus, ArrowUpDown, GripVertical, Star, Pencil, Utensils } from 'lucide-react';
import { useGamePlan, GamePlanTask } from '@/hooks/useGamePlan';
import { useCustomActivities } from '@/hooks/useCustomActivities';
import { QuickNutritionLogDialog } from '@/components/QuickNutritionLogDialog';
import { VaultFocusQuizDialog } from '@/components/vault/VaultFocusQuizDialog';
import { WeeklyWellnessQuizDialog } from '@/components/vault/WeeklyWellnessQuizDialog';
import { CustomActivityBuilderDialog, QuickAddFavoritesDrawer, getActivityIcon } from '@/components/custom-activities';
import { useVault } from '@/hooks/useVault';
import { useUserColors, hexToRgba } from '@/hooks/useUserColors';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CustomActivityTemplate } from '@/types/customActivity';

interface GamePlanCardProps {
  selectedSport: 'baseball' | 'softball';
}

export function GamePlanCard({ selectedSport }: GamePlanCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tasks, customActivities, completedCount, totalCount, daysUntilRecap, recapProgress, loading, refetch } = useGamePlan(selectedSport);
  const { getFavorites, toggleComplete, addToToday, templates } = useCustomActivities(selectedSport);
  const { getEffectiveColors } = useUserColors(selectedSport);
  const colors = useMemo(() => getEffectiveColors(), [getEffectiveColors]);
  const isSoftball = selectedSport === 'softball';
  const { saveFocusQuiz } = useVault();
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [wellnessQuizOpen, setWellnessQuizOpen] = useState(false);
  const [activeQuizType, setActiveQuizType] = useState<'pre_lift' | 'night' | 'morning'>('morning');
  const [sortMode, setSortMode] = useState<'auto' | 'manual' | 'timeline'>(() => {
    const stored = localStorage.getItem('gameplan-sort-mode');
    if (stored === 'manual' || stored === 'timeline') return stored;
    return 'auto';
  });
  const autoSort = sortMode === 'auto';
  
  // Custom activity state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [favoritesDrawerOpen, setFavoritesDrawerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CustomActivityTemplate | null>(null);
  const [presetActivityType, setPresetActivityType] = useState<'meal' | null>(null);
  
  // State for ordered tasks per section
  const [orderedCheckin, setOrderedCheckin] = useState<GamePlanTask[]>([]);
  const [orderedTraining, setOrderedTraining] = useState<GamePlanTask[]>([]);
  const [orderedTracking, setOrderedTracking] = useState<GamePlanTask[]>([]);
  const [orderedCustom, setOrderedCustom] = useState<GamePlanTask[]>([]);
  
  // Timeline mode: single unified list for complete control
  const [timelineTasks, setTimelineTasks] = useState<GamePlanTask[]>([]);
  
  const favorites = useMemo(() => getFavorites(), [getFavorites, templates]);

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
    const customTasksList = tasks.filter(t => t.section === 'custom');

    // Restore saved orders helper
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

    if (sortMode === 'timeline') {
      // Timeline mode: single unified list
      const savedTimelineOrder = localStorage.getItem('gameplan-timeline-order');
      if (savedTimelineOrder) {
        try {
          const orderIds = JSON.parse(savedTimelineOrder) as string[];
          const allTasks = [...tasks].sort((a, b) => {
            const aIdx = orderIds.indexOf(a.id);
            const bIdx = orderIds.indexOf(b.id);
            if (aIdx === -1 && bIdx === -1) return 0;
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
          });
          setTimelineTasks(allTasks);
        } catch {
          setTimelineTasks([...tasks]);
        }
      } else {
        setTimelineTasks([...tasks]);
      }
    } else if (sortMode === 'manual') {
      setOrderedCheckin(restoreOrder(checkinTasksList, 'gameplan-checkin-order'));
      setOrderedTraining(restoreOrder(trainingTasksList, 'gameplan-training-order'));
      setOrderedTracking(restoreOrder(trackingTasksList, 'gameplan-tracking-order'));
      setOrderedCustom(restoreOrder(customTasksList, 'gameplan-custom-order'));
    } else {
      setOrderedCheckin(checkinTasksList);
      setOrderedTraining(trainingTasksList);
      setOrderedTracking(trackingTasksList);
      setOrderedCustom(customTasksList);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksKey, sortMode]);

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

  const cycleSortMode = () => {
    const modes: ('auto' | 'manual' | 'timeline')[] = ['auto', 'manual', 'timeline'];
    const currentIdx = modes.indexOf(sortMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    setSortMode(nextMode);
    localStorage.setItem('gameplan-sort-mode', nextMode);
  };

  const handleReorderTimeline = (newOrder: GamePlanTask[]) => {
    setTimelineTasks(newOrder);
    localStorage.setItem('gameplan-timeline-order', JSON.stringify(newOrder.map(t => t.id)));
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

  const handleReorderCustom = (newOrder: GamePlanTask[]) => {
    setOrderedCustom(newOrder);
    localStorage.setItem('gameplan-custom-order', JSON.stringify(newOrder.map(t => t.id)));
  };

  // Custom activity handlers
  const handleCustomActivityToggle = async (task: GamePlanTask) => {
    if (task.customActivityData) {
      const success = await toggleComplete(task.customActivityData.template.id);
      if (success) {
        refetch();
        toast.success(task.completed ? t('customActivity.unmarkedComplete') : t('customActivity.markedComplete'));
      }
    }
  };

  const handleCustomActivityEdit = (task: GamePlanTask) => {
    if (task.customActivityData) {
      setEditingTemplate(task.customActivityData.template);
      setBuilderOpen(true);
    }
  };

  const handleAddFavoriteToToday = async (templateId: string) => {
    const success = await addToToday(templateId);
    if (success) {
      refetch();
      toast.success(t('customActivity.addedToToday'));
    }
  };

  // Get display tasks based on sort mode
  const checkinTasks = autoSort ? sortByCompletion(orderedCheckin) : orderedCheckin;
  const trainingTasks = autoSort ? sortByCompletion(orderedTraining) : orderedTraining;
  const trackingTasks = autoSort ? sortByCompletion(orderedTracking) : orderedTracking;
  const customTasks = autoSort ? sortByCompletion(orderedCustom) : orderedCustom;

  const renderTask = (task: GamePlanTask, index?: number) => {
    const Icon = task.icon;
    const isIncomplete = !task.completed;
    const isTracking = task.section === 'tracking';
    const isTexVision = task.specialStyle === 'tex-vision';
    const isCustom = task.specialStyle === 'custom';
    const showTimelineNumber = sortMode === 'timeline' && typeof index === 'number';
    
    // Get dynamic colors based on task type
    const pendingColors = colors.gamePlan.pending;
    const trackingColors = colors.gamePlan.tracking;
    const texVisionColors = colors.gamePlan.texVision;
    
    // Custom activity uses its own color
    const customColor = task.customActivityData?.template.color || '#10b981';
    const customColors = {
      background: hexToRgba(customColor, 0.15),
      border: hexToRgba(customColor, 0.5),
      icon: customColor,
      text: '#fff',
    };
    
    // Determine which color set to use for pending tasks
    const activeColors = isCustom ? customColors : isTexVision ? texVisionColors : isTracking ? trackingColors : pendingColors;
    
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
        {/* Timeline number badge */}
        {showTimelineNumber && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-sm font-black text-primary-foreground">{index + 1}</span>
          </div>
        )}
        
        {/* Drag handle - visible in manual and timeline modes */}
        {(sortMode === 'manual' || sortMode === 'timeline') && (
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
                {task.taskType === 'custom' ? task.titleKey : t(task.titleKey)}
              </h3>
              {isCustom && !task.completed && (
                <span 
                  className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-white animate-pulse"
                >
                  {t('customActivity.badge')}
                </span>
              )}
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
              {task.taskType === 'custom' ? (task.descriptionKey || t(`customActivity.types.${task.customActivityData?.template.activity_type}`)) : t(task.descriptionKey)}
            </p>
          </div>
        </button>
        
        {/* Edit button for custom activities */}
        {isCustom && (
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
            onClick={(e) => { e.stopPropagation(); handleCustomActivityEdit(task); }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        
        {/* Status indicator - clickable for custom activities */}
        <button
          onClick={(e) => { e.stopPropagation(); if (isCustom) handleCustomActivityToggle(task); }}
          disabled={!isCustom}
          className={cn(
            "flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center transition-all",
            task.completed && "bg-green-500 text-white",
            isCustom && !task.completed && "hover:scale-110 cursor-pointer"
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
        </button>

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
        
        {sortMode === 'auto' ? (
          <div className="space-y-2">
            {sectionTasks.map((task) => (
              <div key={task.id}>
                {renderTask(task)}
              </div>
            ))}
          </div>
        ) : sortMode === 'manual' ? (
          <Reorder.Group axis="y" values={orderedTasks} onReorder={onReorder} className="space-y-2">
            {orderedTasks.map((task) => (
              <Reorder.Item key={task.id} value={task}>
                {renderTask(task)}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        ) : null}
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
          
          {/* Sort mode toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={cycleSortMode}
            className="flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortMode === 'auto' ? t('gamePlan.autoSort', 'Auto') : sortMode === 'manual' ? t('gamePlan.manualSort', 'Manual') : t('gamePlan.timelineSort', 'Timeline')}
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
          {/* Timeline Mode - Unified list with full control */}
          {sortMode === 'timeline' ? (
            <div className="space-y-2">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                <span className="h-px flex-1 bg-primary/30" />
                {t('gamePlan.sections.timeline', 'Your Timeline')}
                <span className="h-px flex-1 bg-primary/30" />
              </h3>
              <p className="text-xs text-muted-foreground text-center mb-2">
                {t('gamePlan.timelineHint', 'Drag to reorder your day. No restrictions.')}
              </p>
              <Reorder.Group axis="y" values={timelineTasks} onReorder={handleReorderTimeline} className="space-y-2">
                {timelineTasks.map((task, index) => (
                  <Reorder.Item key={task.id} value={task}>
                    {renderTask(task, index)}
                  </Reorder.Item>
                ))}
              </Reorder.Group>
              
              {/* Quick add buttons for timeline mode */}
              <div className="flex flex-wrap gap-2 justify-center pt-4">
                <Button
                  size="sm"
                  onClick={() => { setEditingTemplate(null); setPresetActivityType(null); setBuilderOpen(true); }}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <Plus className="h-4 w-4" />
                  {t('customActivity.createNew')}
                </Button>
                {favorites.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFavoritesDrawerOpen(true)}
                    className="gap-2 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                  >
                    <Star className="h-4 w-4 fill-yellow-500" />
                    {t('customActivity.quickAdd')}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Daily Check-ins Section */}
              {renderTaskSection(
                checkinTasks,
                orderedCheckin,
                handleReorderCheckin,
                t('gamePlan.sections.dailyCheckins'),
                'text-primary',
                'bg-primary/30'
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

              {/* Custom Activities Section - Always visible */}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="h-px flex-1 bg-emerald-500/30" />
                  {t('gamePlan.sections.customActivities')}
                  <span className="h-px flex-1 bg-emerald-500/30" />
                </h3>
                
                <div className="flex flex-wrap gap-2 justify-center pb-2">
                  <Button
                    size="sm"
                    onClick={() => { setEditingTemplate(null); setPresetActivityType(null); setBuilderOpen(true); }}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <Plus className="h-4 w-4" />
                    {t('customActivity.createNew')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { setEditingTemplate(null); setPresetActivityType('meal'); setBuilderOpen(true); }}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    <Utensils className="h-4 w-4" />
                    {t('customActivity.logMeal')}
                  </Button>
                  {favorites.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFavoritesDrawerOpen(true)}
                      className="gap-2 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                    >
                      <Star className="h-4 w-4 fill-yellow-500" />
                      {t('customActivity.quickAdd')}
                    </Button>
                  )}
                </div>
                
                {customTasks.length > 0 && renderTaskSection(
                  customTasks,
                  orderedCustom,
                  handleReorderCustom,
                  '',
                  'text-emerald-400',
                  'bg-emerald-500/30'
                )}
              </div>
            </>
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
      
      {/* Custom Activity Builder Dialog */}
      <CustomActivityBuilderDialog
        open={builderOpen}
        onOpenChange={(open) => {
          setBuilderOpen(open);
          if (!open) setPresetActivityType(null);
        }}
        template={editingTemplate}
        presetActivityType={presetActivityType}
        onSave={async (data) => {
          // Note: createTemplate and updateTemplate are handled within useCustomActivities
          // The builder calls onSave which we'll handle via the hook
          if (editingTemplate) {
            toast.success(t('customActivity.saved'));
          } else {
            toast.success(t('customActivity.saved'));
          }
          refetch();
          setEditingTemplate(null);
        }}
        onDelete={async () => {
          toast.success(t('customActivity.deleted'));
          refetch();
          return true;
        }}
        selectedSport={selectedSport}
      />

      {/* Quick Add Favorites Drawer */}
      <QuickAddFavoritesDrawer
        open={favoritesDrawerOpen}
        onOpenChange={setFavoritesDrawerOpen}
        favorites={favorites}
        onAddToToday={async (templateId) => {
          const success = await addToToday(templateId);
          if (success) {
            toast.success(t('customActivity.addedToToday'));
            refetch();
          }
        }}
        onEdit={(template) => {
          setEditingTemplate(template);
          setBuilderOpen(true);
        }}
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