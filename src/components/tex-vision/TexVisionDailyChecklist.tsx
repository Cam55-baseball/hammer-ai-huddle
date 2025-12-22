import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Clock, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TexVisionDailyChecklist as ChecklistType } from '@/hooks/useTexVisionProgress';
import { Badge } from '@/components/ui/badge';

interface TexVisionDailyChecklistProps {
  checklist: ChecklistType | null;
  onUpdateChecklist: (drillId: string, completed: boolean) => void;
  loading: boolean;
}

// Drill definitions for checklist
const DAILY_DRILLS = [
  { id: 'soft_focus', nameKey: 'texVision.drills.softFocus.title', defaultName: 'Soft Focus', icon: '👁️' },
  { id: 'pattern_search', nameKey: 'texVision.drills.patternSearch.title', defaultName: 'Pattern Search', icon: '🔍' },
  { id: 'peripheral_vision', nameKey: 'texVision.drills.peripheralVision.title', defaultName: 'Peripheral Vision', icon: '↔️' },
  { id: 'convergence', nameKey: 'texVision.drills.convergence.title', defaultName: 'Convergence', icon: '🎯' },
];

export default function TexVisionDailyChecklist({ checklist, onUpdateChecklist, loading }: TexVisionDailyChecklistProps) {
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
                ? 'bg-[hsl(var(--tex-vision-success))]/20 text-[hsl(var(--tex-vision-success))] border-[hsl(var(--tex-vision-success))]/50' 
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
                  <CheckCircle2 className="h-5 w-5 text-[hsl(var(--tex-vision-success))] flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-[hsl(var(--tex-vision-text-muted))] flex-shrink-0" />
                )}
                <span className="text-lg mr-2">{drill.icon}</span>
                <span className={`flex-1 text-sm font-medium ${
                  isCompleted 
                    ? 'text-[hsl(var(--tex-vision-success))]' 
                    : 'text-blue-900'
                }`}>
                  {t(drill.nameKey, drill.defaultName)}
                </span>
                {isCompleted && (
                  <span className="text-xs text-[hsl(var(--tex-vision-success))]">
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
