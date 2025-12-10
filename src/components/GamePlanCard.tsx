import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Check, Target, Clock, Trophy, Zap, Plus } from 'lucide-react';
import { useGamePlan, GamePlanTask } from '@/hooks/useGamePlan';
import { QuickNutritionLogDialog } from '@/components/QuickNutritionLogDialog';
import { VaultFocusQuizDialog } from '@/components/vault/VaultFocusQuizDialog';
import { useVault } from '@/hooks/useVault';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GamePlanCardProps {
  selectedSport: 'baseball' | 'softball';
}

export function GamePlanCard({ selectedSport }: GamePlanCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tasks, completedCount, totalCount, daysUntilRecap, recapProgress, loading, refetch } = useGamePlan(selectedSport);
  const { saveFocusQuiz } = useVault();
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [activeQuizType, setActiveQuizType] = useState<'pre_lift' | 'night' | 'morning'>('morning');

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  }).toUpperCase();

  const allComplete = completedCount === totalCount && totalCount > 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleTaskClick = (task: GamePlanTask) => {
    // Handle mindfuel and healthtip - navigate directly
    if (task.id === 'mindfuel' || task.id === 'healthtip') {
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

    // Handle tracking tasks - navigate to vault with section param
    if (task.taskType === 'tracking') {
      if (task.id === 'tracking-performance') {
        navigate('/vault?openSection=performance-tests');
      } else if (task.id === 'tracking-photos') {
        navigate('/vault?openSection=progress-photos');
      } else if (task.id === 'tracking-grades') {
        navigate('/vault?openSection=scout-grades');
      }
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

  // Group tasks by section
  const checkinTasks = tasks.filter(t => t.section === 'checkin');
  const trainingTasks = tasks.filter(t => t.section === 'training');
  const trackingTasks = tasks.filter(t => t.section === 'tracking');

  const renderTask = (task: GamePlanTask) => {
    const Icon = task.icon;
    const isIncomplete = !task.completed;
    const isTracking = task.section === 'tracking';
    
    return (
      <div
        key={task.id}
        className={cn(
          "w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all duration-200",
          "border-2",
          task.completed
            ? "bg-green-500/20 border-green-500/50"
            : isTracking
              ? "bg-purple-500/10 border-purple-500/60 game-plan-pulse-purple"
              : "bg-amber-500/10 border-amber-500/60 game-plan-pulse"
        )}
      >
        {/* Clickable main area */}
        <button
          onClick={() => handleTaskClick(task)}
          className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
        >
          {/* Icon */}
          <div className={cn(
            "flex-shrink-0 p-2 sm:p-2.5 rounded-lg",
            task.completed 
              ? "bg-green-500" 
              : isTracking
                ? "bg-purple-500"
                : "bg-amber-500"
          )}>
            <Icon className={cn(
              "h-5 w-5 sm:h-6 sm:w-6",
              task.completed ? "text-white" : isTracking ? "text-white" : "text-secondary"
            )} />
          </div>
          
          {/* Content */}
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={cn(
                "text-sm sm:text-base truncate",
                task.completed 
                  ? "font-semibold text-muted-foreground line-through" 
                  : "font-black text-primary-foreground"
              )}>
                {t(task.titleKey)}
              </h3>
              {task.badge && !task.completed && (
                <span className={cn(
                  "flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                  isTracking ? "bg-purple-500/30 text-purple-300" : "bg-amber-500/30 text-amber-300"
                )}>
                  {t(task.badge)}
                </span>
              )}
            </div>
            <p className={cn(
              "text-xs sm:text-sm truncate",
              task.completed ? "text-muted-foreground/60" : "text-muted-foreground"
            )}>
              {t(task.descriptionKey)}
            </p>
          </div>
        </button>
        
        {/* Status indicator */}
        <div className={cn(
          "flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center",
          task.completed
            ? "bg-green-500 text-white"
            : isTracking
              ? "border-3 border-dashed border-purple-500/70"
              : "border-3 border-dashed border-amber-500/70"
        )}>
          {task.completed ? (
            <Check className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <Zap className={cn(
              "h-3 w-3 sm:h-4 sm:w-4 animate-pulse",
              isTracking ? "text-purple-500" : "text-amber-500"
            )} />
          )}
        </div>

        {/* Urgency indicator for incomplete tasks */}
        {isIncomplete && (
          <div className={cn(
            "hidden sm:flex items-center gap-1 px-2 py-1 rounded-full border",
            isTracking 
              ? "bg-purple-500/20 border-purple-500/40" 
              : "bg-amber-500/20 border-amber-500/40"
          )}>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-wider",
              isTracking ? "text-purple-400" : "text-amber-400"
            )}>
              {t('gamePlan.doIt')}
            </span>
          </div>
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
              <h2 className="text-xl sm:text-2xl font-black text-primary-foreground tracking-tight uppercase">
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
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-primary-foreground">
                    {completedCount}/{totalCount}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {t('gamePlan.tasksLabel')}
                  </span>
                  <span className="text-sm font-black text-primary-foreground">
                    {t('gamePlan.tasksCompleted', { completed: completedCount, total: totalCount })}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Task Sections */}
        <div className="space-y-4">
          {/* Daily Check-ins Section */}
          {checkinTasks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                <span className="h-px flex-1 bg-primary/30" />
                {t('gamePlan.sections.dailyCheckins')}
                <span className="h-px flex-1 bg-primary/30" />
              </h3>
              
              {/* Quick Action Button - Always visible */}
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
              
              <div className="space-y-2">
                {checkinTasks.map(renderTask)}
              </div>
            </div>
          )}

          {/* Training Section */}
          {trainingTasks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                <span className="h-px flex-1 bg-primary/30" />
                {t('gamePlan.sections.training')}
                <span className="h-px flex-1 bg-primary/30" />
              </h3>
              <div className="space-y-2">
                {trainingTasks.map(renderTask)}
              </div>
            </div>
          )}

          {/* Cycle Tracking Section (only shown when items are due) */}
          {trackingTasks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                <span className="h-px flex-1 bg-purple-500/30" />
                {t('gamePlan.sections.cycleTracking')}
                <span className="h-px flex-1 bg-purple-500/30" />
              </h3>
              <div className="space-y-2">
                {trackingTasks.map(renderTask)}
              </div>
            </div>
          )}
        </div>

        {/* 6-Week Recap Countdown */}
        <div className="pt-3 border-t border-primary/30">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-primary-foreground uppercase tracking-wide">
                {t('gamePlan.recapCountdown.title')}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30">
              <span className="text-sm font-black text-primary">
                {daysUntilRecap}
              </span>
              <span className="text-xs font-bold text-muted-foreground uppercase">
                {t('gamePlan.recapCountdown.days')}
              </span>
            </div>
          </div>
          <Progress value={recapProgress} className="h-2.5 bg-muted/20" />
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
      
      {/* Pulsing animation for incomplete tasks */}
      <style>{`
        @keyframes game-plan-pulse {
          0%, 100% { 
            box-shadow: 0 0 0 0 hsl(45 93% 47% / 0.4);
          }
          50% { 
            box-shadow: 0 0 0 4px hsl(45 93% 47% / 0.1);
          }
        }
        .game-plan-pulse {
          animation: game-plan-pulse 2s ease-in-out infinite;
        }
        @keyframes game-plan-pulse-purple {
          0%, 100% { 
            box-shadow: 0 0 0 0 hsl(270 70% 50% / 0.4);
          }
          50% { 
            box-shadow: 0 0 0 4px hsl(270 70% 50% / 0.1);
          }
        }
        .game-plan-pulse-purple {
          animation: game-plan-pulse-purple 2s ease-in-out infinite;
        }
      `}</style>
    </Card>
  );
}