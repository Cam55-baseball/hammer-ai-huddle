import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Reorder } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Clock, Zap, Brain, ArrowRight, AlertTriangle, ArrowUpDown, GripVertical, Play, Sparkles, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TexVisionDailyChecklist as ChecklistType } from '@/hooks/useTexVisionProgress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { S2DiagnosticResult } from './S2CognitionDiagnostics';
import { Separator } from '@/components/ui/separator';
import { useDailyDrillSelection, ScoredDrill } from '@/hooks/useDailyDrillSelection';
import { DrillTier } from '@/constants/texVisionDrills';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TexVisionDailyChecklistProps {
  checklist: ChecklistType | null;
  onUpdateChecklist: (drillId: string, completed: boolean) => void;
  onDrillStart: (drillId: string, tier: string) => void;
  loading: boolean;
  currentTier?: string;
  sport?: string;
  // S2 Diagnostic props
  s2DiagnosticResult?: S2DiagnosticResult | null;
  s2Loading?: boolean;
  canTakeS2Test?: boolean;
  nextS2TestDate?: Date | null;
  daysUntilNextS2?: number;
  onStartS2Assessment?: () => void;
}

// Reason badge colors and labels
const REASON_CONFIG: Record<string, { color: string; label: string }> = {
  never_done: { color: 'bg-purple-500/20 text-purple-700 border-purple-500/30', label: 'New!' },
  needs_practice: { color: 'bg-amber-500/20 text-amber-700 border-amber-500/30', label: 'Practice' },
  due_review: { color: 'bg-blue-500/20 text-blue-700 border-blue-500/30', label: 'Review' },
  tier_challenge: { color: 'bg-teal-500/20 text-teal-700 border-teal-500/30', label: 'Challenge' },
  variety: { color: 'bg-slate-500/20 text-slate-700 border-slate-500/30', label: 'Balance' },
};

// Helper to format days as weeks + days
const formatWeeksAndDays = (totalDays: number): string => {
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  
  if (weeks === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  if (days === 0) {
    return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  }
  return `${weeks} week${weeks !== 1 ? 's' : ''}, ${days} day${days !== 1 ? 's' : ''}`;
};

// Calculate progress through 16-week cycle
const calculateCycleProgress = (daysRemaining: number): number => {
  const totalDays = 112; // 16 weeks
  const daysPassed = totalDays - daysRemaining;
  return Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
};

// Get score color based on value
const getScoreColor = (score: number | null): string => {
  if (score === null) return 'text-blue-900/50';
  if (score >= 80) return 'text-green-700';
  if (score >= 60) return 'text-teal-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
};

export default function TexVisionDailyChecklist({ 
  checklist, 
  onUpdateChecklist,
  onDrillStart,
  loading,
  currentTier = 'beginner',
  sport = 'baseball',
  s2DiagnosticResult,
  s2Loading,
  canTakeS2Test,
  daysUntilNextS2,
  nextS2TestDate,
  onStartS2Assessment,
}: TexVisionDailyChecklistProps) {
  const { t } = useTranslation();
  const [autoSort, setAutoSort] = useState(() => localStorage.getItem('texvision-sort') !== 'original');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use the smart daily drill selection hook with sport for proper data isolation
  const { 
    dailyDrills, 
    loading: selectionLoading, 
    refreshSelection 
  } = useDailyDrillSelection(currentTier as DrillTier, sport);

  // Local state for ordered drills (for manual reordering)
  const [orderedDrills, setOrderedDrills] = useState<ScoredDrill[]>([]);

  // Sync ordered drills when daily drills change
  useEffect(() => {
    if (dailyDrills) {
      const savedOrder = localStorage.getItem('texvision-drills-order');
      if (savedOrder && !autoSort) {
        try {
          const orderIds = JSON.parse(savedOrder) as string[];
          const sorted = [...dailyDrills].sort((a, b) => {
            const aIdx = orderIds.indexOf(a.id);
            const bIdx = orderIds.indexOf(b.id);
            if (aIdx === -1 && bIdx === -1) return 0;
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
          });
          setOrderedDrills(sorted);
        } catch {
          setOrderedDrills(dailyDrills);
        }
      } else {
        setOrderedDrills(dailyDrills);
      }
    }
  }, [dailyDrills, autoSort]);

  const toggleAutoSort = () => {
    const newValue = !autoSort;
    setAutoSort(newValue);
    localStorage.setItem('texvision-sort', newValue ? 'auto' : 'original');
  };

  const handleReorder = (newOrder: ScoredDrill[]) => {
    setOrderedDrills(newOrder);
    localStorage.setItem('texvision-drills-order', JSON.stringify(newOrder.map(d => d.id)));
  };

  const handleRefreshSelection = async () => {
    setIsRefreshing(true);
    await refreshSelection();
    setIsRefreshing(false);
  };

  if (loading || selectionLoading) {
    return (
      <Card className="bg-[hsl(var(--tex-vision-primary))]/50 border-[hsl(var(--tex-vision-primary-light))]/30">
        <CardHeader>
          <Skeleton className="h-6 w-40 bg-[hsl(var(--tex-vision-primary-light))]/50" />
          <Skeleton className="h-4 w-64 bg-[hsl(var(--tex-vision-primary-light))]/50 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 bg-[hsl(var(--tex-vision-primary-light))]/50 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate completed count from today's selected drills
  const completedCount = dailyDrills 
    ? dailyDrills.filter(d => checklist?.checklist_items?.[d.id]).length
    : 0;
  const isComplete = completedCount >= 2;

  // Get display drills based on sort mode
  const displayDrills = autoSort
    ? [...orderedDrills].sort((a, b) => {
        const aCompleted = checklist?.checklist_items?.[a.id] || false;
        const bCompleted = checklist?.checklist_items?.[b.id] || false;
        return aCompleted === bCompleted ? 0 : aCompleted ? 1 : -1;
      })
    : orderedDrills;

  // S2 Section rendering - only show when user has an actionable test
  const renderS2Section = () => {
    // If S2 data is still loading, don't show anything (countdown is at bottom of page)
    if (s2Loading) {
      return null;
    }

    // No baseline exists - prompt user to complete baseline (actionable)
    if (!s2DiagnosticResult) {
      return (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[hsl(var(--tex-vision-accent))]" />
              <span className="font-semibold text-[hsl(var(--tex-vision-text))]">S2 Cognition Diagnostic</span>
            </div>
            <Badge variant="outline" className="bg-[hsl(var(--tex-vision-accent))]/10 text-[hsl(var(--tex-vision-accent))] border-[hsl(var(--tex-vision-accent))]/30 text-xs">
              16-Week Tracking
            </Badge>
          </div>
          
          <div className="p-4 bg-[hsl(var(--tex-vision-warning))]/10 border border-[hsl(var(--tex-vision-warning))]/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--tex-vision-warning))] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-[hsl(var(--tex-vision-text))] font-medium mb-1">
                  Complete your baseline assessment
                </p>
                <p className="text-xs text-[hsl(var(--tex-vision-text-muted))] mb-3">
                  Start tracking your cognitive development with an initial assessment
                </p>
                <Button 
                  size="sm" 
                  onClick={onStartS2Assessment}
                  className="bg-[hsl(var(--tex-vision-accent))] hover:bg-[hsl(var(--tex-vision-accent))]/90 text-white"
                >
                  Start Baseline
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
          
          <Separator className="my-4 bg-[hsl(var(--tex-vision-primary-light))]/30" />
        </div>
      );
    }

    // Baseline exists but test is locked - don't show in checklist
    // The countdown is already visible at the bottom of the Tex Vision page
    if (!canTakeS2Test) {
      return null;
    }

    // S2 test is available - show action button
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-[hsl(var(--tex-vision-accent))]" />
            <span className="font-semibold text-[hsl(var(--tex-vision-text))]">S2 Cognition Diagnostic</span>
          </div>
          <Badge variant="outline" className="bg-[hsl(var(--tex-vision-accent))]/10 text-[hsl(var(--tex-vision-accent))] border-[hsl(var(--tex-vision-accent))]/30 text-xs">
            16-Week Tracking
          </Badge>
        </div>
        
        <div 
          className="p-4 rounded-lg border transition-all bg-[hsl(var(--tex-vision-success))]/10 border-[hsl(var(--tex-vision-success))]/30 cursor-pointer hover:border-[hsl(var(--tex-vision-success))]/50"
          onClick={onStartS2Assessment}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${getScoreColor(s2DiagnosticResult.overall_score)}`}>
                {s2DiagnosticResult.overall_score || '—'}
              </div>
              <span className="text-xs text-[hsl(var(--tex-vision-text-muted))]">Previous Score</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--tex-vision-success))]" />
              <span className="text-sm font-medium text-[hsl(var(--tex-vision-success))]">Ready for next assessment</span>
            </div>
          </div>
          
          <Button 
            size="sm" 
            className="w-full mt-2 bg-[hsl(var(--tex-vision-accent))] hover:bg-[hsl(var(--tex-vision-accent))]/90 text-white"
          >
            Take Assessment
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
        
        <Separator className="my-4 bg-[hsl(var(--tex-vision-primary-light))]/30" />
      </div>
    );
  };

  const handleDrillClick = (drill: ScoredDrill) => {
    const isCompleted = checklist?.checklist_items?.[drill.id] || false;
    
    if (!isCompleted) {
      // Start the drill - completion will be handled when drill finishes
      onDrillStart(drill.id, drill.tier);
    }
    // If already completed, do nothing - user can replay from Drill Library
  };

  const renderDrillItem = (drill: ScoredDrill) => {
    const isCompleted = checklist?.checklist_items?.[drill.id] || false;
    const reasonConfig = REASON_CONFIG[drill.reason] || REASON_CONFIG.variety;
    
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-150 cursor-pointer
          ${isCompleted 
            ? 'bg-[hsl(var(--tex-vision-success))]/10 border border-[hsl(var(--tex-vision-success))]/30' 
            : 'bg-[hsl(var(--tex-vision-primary-dark))]/50 border border-[hsl(var(--tex-vision-primary-light))]/20 hover:border-[hsl(var(--tex-vision-feedback))]/50'
          }`}
        onClick={() => handleDrillClick(drill)}
      >
        {/* Drag handle - only visible in manual mode */}
        {!autoSort && (
          <div 
            className="flex-shrink-0 cursor-grab active:cursor-grabbing text-[hsl(var(--tex-vision-text))]/50 hover:text-[hsl(var(--tex-vision-text))]"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-[hsl(var(--tex-vision-success))] flex-shrink-0" />
        ) : (
          <Circle className="h-5 w-5 text-[hsl(var(--tex-vision-text-muted))] flex-shrink-0" />
        )}
        <span className="text-lg mr-2">{drill.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium truncate ${
              isCompleted 
                ? 'text-[hsl(var(--tex-vision-success))]' 
                : 'text-[hsl(var(--tex-vision-text))]'
            }`}>
              {t(drill.nameKey, drill.defaultName)}
            </span>
            {!isCompleted && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={`text-[9px] px-1.5 py-0 h-4 ${reasonConfig.color}`}
                    >
                      {drill.reason === 'tier_challenge' && <Sparkles className="h-2.5 w-2.5 mr-0.5" />}
                      {reasonConfig.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {drill.reasonText}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {!isCompleted && drill.tier !== 'beginner' && (
            <span className="text-[10px] text-[hsl(var(--tex-vision-text-muted))] capitalize">{drill.tier} tier</span>
          )}
        </div>
        {isCompleted ? (
          <span className="text-xs text-[hsl(var(--tex-vision-success))]">
            ✓
          </span>
        ) : (
          <div className="flex items-center gap-1 text-[10px] text-[hsl(var(--tex-vision-feedback))] font-medium">
            <Play className="h-3 w-3" />
            <span>Start</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="bg-[hsl(var(--tex-vision-primary))]/50 border-[hsl(var(--tex-vision-primary-light))]/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-[hsl(var(--tex-vision-text))] flex items-center gap-2">
            <Zap className="h-5 w-5 text-[hsl(var(--tex-vision-feedback))]" />
            {t('texVision.checklist.title', 'Daily Vision Training')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshSelection}
                    disabled={isRefreshing}
                    className="h-7 w-7 p-0 text-[hsl(var(--tex-vision-text))]/70 hover:text-[hsl(var(--tex-vision-text))]"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Regenerate today's drills</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAutoSort}
              className="flex items-center gap-1 text-xs font-medium text-[hsl(var(--tex-vision-text))]/70 hover:text-[hsl(var(--tex-vision-text))] px-2 py-1 h-auto"
            >
              <ArrowUpDown className="h-3 w-3" />
              {autoSort ? t('texVision.autoSort', 'Auto') : t('texVision.manualSort', 'Manual')}
            </Button>
            <Badge 
              variant="outline"
              className={`${
                isComplete 
                  ? 'bg-[hsl(var(--tex-vision-success))]/20 text-[hsl(var(--tex-vision-success))] border-[hsl(var(--tex-vision-success))]/50' 
                  : 'bg-[hsl(var(--tex-vision-primary-light))]/20 text-[hsl(var(--tex-vision-text))] border-[hsl(var(--tex-vision-primary-light))]/30'
              }`}
            >
              {completedCount}/2+ {t('texVision.checklist.completed', 'completed')}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-[hsl(var(--tex-vision-text))]">
          {t('texVision.checklist.description', 'Complete 2-4 drills for optimal neuro-visual development (8-15 min)')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* S2 Cognition Section */}
        {renderS2Section()}

        {/* Daily Drills - conditionally sorted or reorderable based on autoSort preference */}
        {autoSort ? (
          <div className="space-y-2">
            {displayDrills.map((drill) => (
              <div key={drill.id}>
                {renderDrillItem(drill)}
              </div>
            ))}
          </div>
        ) : (
          <Reorder.Group axis="y" values={orderedDrills} onReorder={handleReorder} className="space-y-2">
            {orderedDrills.map((drill) => (
              <Reorder.Item key={drill.id} value={drill}>
                {renderDrillItem(drill)}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}

        {/* Session time indicator */}
        <div className="mt-4 flex items-center gap-2 text-xs text-[hsl(var(--tex-vision-text))]">
          <Clock className="h-3.5 w-3.5" />
          <span>{t('texVision.checklist.sessionTime', 'Recommended: 8-15 minutes per session')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
