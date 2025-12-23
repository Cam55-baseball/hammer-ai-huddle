import { useTranslation } from 'react-i18next';
import { format, addDays } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Clock, Zap, Brain, ArrowRight, AlertTriangle, CalendarClock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TexVisionDailyChecklist as ChecklistType } from '@/hooks/useTexVisionProgress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { S2DiagnosticResult } from './S2CognitionDiagnostics';
import { Separator } from '@/components/ui/separator';

interface TexVisionDailyChecklistProps {
  checklist: ChecklistType | null;
  onUpdateChecklist: (drillId: string, completed: boolean) => void;
  loading: boolean;
  // S2 Diagnostic props
  s2DiagnosticResult?: S2DiagnosticResult | null;
  s2Loading?: boolean;
  canTakeS2Test?: boolean;
  nextS2TestDate?: Date | null;
  daysUntilNextS2?: number;
  onStartS2Assessment?: () => void;
}

// Drill definitions for checklist
const DAILY_DRILLS = [
  { id: 'soft_focus', nameKey: 'texVision.drills.softFocus.title', defaultName: 'Soft Focus', icon: '👁️' },
  { id: 'pattern_search', nameKey: 'texVision.drills.patternSearch.title', defaultName: 'Pattern Search', icon: '🔍' },
  { id: 'peripheral_vision', nameKey: 'texVision.drills.peripheralVision.title', defaultName: 'Peripheral Vision', icon: '↔️' },
  { id: 'convergence', nameKey: 'texVision.drills.convergence.title', defaultName: 'Convergence', icon: '🎯' },
];

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
  loading,
  s2DiagnosticResult,
  s2Loading,
  canTakeS2Test,
  daysUntilNextS2,
  nextS2TestDate,
  onStartS2Assessment,
}: TexVisionDailyChecklistProps) {
  const { t } = useTranslation();

  if (loading) {
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

  const completedCount = checklist 
    ? Object.values(checklist.checklist_items).filter(Boolean).length 
    : 0;
  const isComplete = completedCount >= 2;

  // S2 Section rendering
  const renderS2Section = () => {
    // If S2 data is still loading, show skeleton
    if (s2Loading) {
      return (
        <div className="space-y-3 mb-4">
          <Skeleton className="h-16 bg-[hsl(var(--tex-vision-primary-light))]/50 rounded-lg" />
        </div>
      );
    }

    // No baseline exists - prompt user to complete baseline
    if (!s2DiagnosticResult) {
      return (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-teal-600" />
              <span className="font-semibold text-blue-900">S2 Cognition Diagnostic</span>
            </div>
            <Badge variant="outline" className="bg-teal-500/10 text-teal-700 border-teal-500/30 text-xs">
              16-Week Tracking
            </Badge>
          </div>
          
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 font-medium mb-1">
                  Complete your baseline assessment
                </p>
                <p className="text-xs text-blue-900/70 mb-3">
                  Start tracking your cognitive development with an initial assessment
                </p>
                <Button 
                  size="sm" 
                  onClick={onStartS2Assessment}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
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

    // Baseline exists - show countdown and progress
    const cycleProgress = calculateCycleProgress(daysUntilNextS2 || 0);
    const timeRemaining = formatWeeksAndDays(daysUntilNextS2 || 0);

    // When S2 test is completed and locked, show status instead of an action item
    if (!canTakeS2Test) {
      // S2 is locked - show status card with next test date
      const nextDateFormatted = nextS2TestDate 
        ? format(nextS2TestDate, 'MMMM d, yyyy')
        : 'in 16 weeks';

      return (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-teal-600" />
              <span className="font-semibold text-blue-900">S2 Cognition Diagnostic</span>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          </div>
          
          <div className="p-4 rounded-lg border bg-[hsl(var(--tex-vision-primary-dark))]/50 border-[hsl(var(--tex-vision-primary-light))]/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold ${getScoreColor(s2DiagnosticResult.overall_score)}`}>
                  {s2DiagnosticResult.overall_score || '—'}
                </div>
                <span className="text-xs text-blue-900/70">Current Score</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Progress 
                value={cycleProgress} 
                className="h-2 bg-[hsl(var(--tex-vision-primary-light))]/30"
              />
              <div className="flex justify-between text-xs text-blue-900/60">
                <span>{Math.round(cycleProgress)}% through cycle</span>
                <span>16 weeks</span>
              </div>
            </div>

            <div className="mt-3 p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-teal-700 flex-shrink-0" />
              <span className="text-xs text-teal-800">
                <strong>Next assessment:</strong> {nextDateFormatted}
              </span>
            </div>
          </div>
          
          <Separator className="my-4 bg-[hsl(var(--tex-vision-primary-light))]/30" />
        </div>
      );
    }

    // S2 test is available - show action button
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-teal-600" />
            <span className="font-semibold text-blue-900">S2 Cognition Diagnostic</span>
          </div>
          <Badge variant="outline" className="bg-teal-500/10 text-teal-700 border-teal-500/30 text-xs">
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
              <span className="text-xs text-blue-900/70">Previous Score</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-700" />
              <span className="text-sm font-medium text-green-700">Ready for next assessment</span>
            </div>
          </div>
          
          <Button 
            size="sm" 
            className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white"
          >
            Take Assessment
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
        
        <Separator className="my-4 bg-[hsl(var(--tex-vision-primary-light))]/30" />
      </div>
    );
  };

  return (
    <Card className="bg-[hsl(var(--tex-vision-primary))]/50 border-[hsl(var(--tex-vision-primary-light))]/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
            <Zap className="h-5 w-5 text-[hsl(var(--tex-vision-feedback))]" />
            {t('texVision.checklist.title', 'Daily Vision Training')}
          </CardTitle>
          <Badge 
            variant="outline"
            className={`${
              isComplete 
                ? 'bg-[hsl(var(--tex-vision-success))]/20 text-green-700 border-[hsl(var(--tex-vision-success))]/50' 
                : 'bg-[hsl(var(--tex-vision-primary-light))]/20 text-blue-900 border-[hsl(var(--tex-vision-primary-light))]/30'
            }`}
          >
            {completedCount}/2+ {t('texVision.checklist.completed', 'completed')}
          </Badge>
        </div>
        <CardDescription className="text-blue-900">
          {t('texVision.checklist.description', 'Complete 2-4 drills for optimal neuro-visual development (8-15 min)')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* S2 Cognition Section */}
        {renderS2Section()}

        {/* Daily Drills */}
        <div className="space-y-2">
          {DAILY_DRILLS.map((drill) => {
            const isCompleted = checklist?.checklist_items?.[drill.id] || false;
            
            return (
              <div
                key={drill.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-150 cursor-pointer
                  ${isCompleted 
                    ? 'bg-[hsl(var(--tex-vision-success))]/10 border border-[hsl(var(--tex-vision-success))]/30' 
                    : 'bg-[hsl(var(--tex-vision-primary-dark))]/50 border border-[hsl(var(--tex-vision-primary-light))]/20 hover:border-[hsl(var(--tex-vision-feedback))]/50'
                  }`}
                onClick={() => onUpdateChecklist(drill.id, !isCompleted)}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-700 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-[hsl(var(--tex-vision-text-muted))] flex-shrink-0" />
                )}
                <span className="text-lg mr-2">{drill.icon}</span>
                <span className={`flex-1 text-sm font-medium ${
                  isCompleted 
                    ? 'text-green-700' 
                    : 'text-blue-900'
                }`}>
                  {t(drill.nameKey, drill.defaultName)}
                </span>
                {isCompleted && (
                  <span className="text-xs text-green-700">
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Session time indicator */}
        <div className="mt-4 flex items-center gap-2 text-xs text-blue-900">
          <Clock className="h-3.5 w-3.5" />
          <span>{t('texVision.checklist.sessionTime', 'Recommended: 8-15 minutes per session')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
