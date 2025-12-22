import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Brain, Zap, Target, Shield, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TexVisionMetrics, TexVisionProgressData } from '@/hooks/useTexVisionProgress';

interface TexVisionProgressMetricsProps {
  metrics: TexVisionMetrics | null;
  progress: TexVisionProgressData | null;
  loading: boolean;
}

export default function TexVisionProgressMetrics({ metrics, progress, loading }: TexVisionProgressMetricsProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className="bg-[hsl(var(--tex-vision-primary))]/50 border-[hsl(var(--tex-vision-primary-light))]/30">
        <CardHeader>
          <Skeleton className="h-6 w-40 bg-[hsl(var(--tex-vision-primary-light))]/50" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 bg-[hsl(var(--tex-vision-primary-light))]/50 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default values for display when no data
  const metricItems = [
    {
      icon: Brain,
      label: t('texVision.metrics.neuroReaction', 'Neuro Reaction Index'),
      value: metrics?.neuro_reaction_index || 0,
      maxValue: 100,
      color: 'hsl(var(--tex-vision-feedback))',
    },
    {
      icon: Zap,
      label: t('texVision.metrics.visualSpeed', 'Visual Processing Speed'),
      value: metrics?.visual_processing_speed || 0,
      maxValue: 100,
      color: 'hsl(var(--tex-vision-timing))',
    },
    {
      icon: Target,
      label: t('texVision.metrics.anticipation', 'Anticipation Quotient'),
      value: metrics?.anticipation_quotient || 0,
      maxValue: 100,
      color: 'hsl(var(--tex-vision-success))',
    },
    {
      icon: Activity,
      label: t('texVision.metrics.coordination', 'Coordination Efficiency'),
      value: metrics?.coordination_efficiency || 0,
      maxValue: 100,
      color: 'hsl(var(--tex-vision-feedback))',
    },
    {
      icon: Shield,
      label: t('texVision.metrics.stressResilience', 'Stress Resilience'),
      value: metrics?.stress_resilience_score || 0,
      maxValue: 100,
      color: 'hsl(var(--tex-vision-success))',
    },
  ];

  const hasAnyData = metrics && Object.values(metrics).some(v => v !== null && v !== 0);

  return (
    <Card className="bg-[hsl(var(--tex-vision-primary))]/50 border-[hsl(var(--tex-vision-primary-light))]/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-[hsl(var(--tex-vision-text))] flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[hsl(var(--tex-vision-success))]" />
          {t('texVision.metrics.title', 'Performance Metrics')}
        </CardTitle>
        <CardDescription className="text-[hsl(var(--tex-vision-text-muted))]">
          {hasAnyData
            ? t('texVision.metrics.description', 'Your neuro-visual performance scores')
            : t('texVision.metrics.noData', 'Complete drills to start building your performance profile')
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasAnyData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metricItems.map((item, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-[hsl(var(--tex-vision-primary-dark))]/50 border border-[hsl(var(--tex-vision-primary-light))]/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className="h-4 w-4" style={{ color: item.color }} />
                  <span className="text-xs text-[hsl(var(--tex-vision-text-muted))] truncate">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span 
                    className="text-2xl font-bold"
                    style={{ color: item.color }}
                  >
                    {item.value.toFixed(1)}
                  </span>
                  <span className="text-xs text-[hsl(var(--tex-vision-text-muted))] mb-1">
                    / {item.maxValue}
                  </span>
                </div>
                <Progress 
                  value={(item.value / item.maxValue) * 100} 
                  className="h-1.5 bg-[hsl(var(--tex-vision-primary-light))]/20"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Brain className="h-12 w-12 text-[hsl(var(--tex-vision-text-muted))] mb-3 opacity-50" />
            <p className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
              {t('texVision.metrics.startTraining', 'Start training to see your metrics here')}
            </p>
          </div>
        )}

        {/* Tier Progress */}
        {progress && (
          <div className="mt-6 pt-4 border-t border-[hsl(var(--tex-vision-primary-light))]/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[hsl(var(--tex-vision-text))]">
                {t('texVision.metrics.currentTier', 'Current Tier')}
              </span>
              <span className="text-sm font-semibold text-[hsl(var(--tex-vision-feedback))] capitalize">
                {progress.current_tier}
              </span>
            </div>
            <div className="flex gap-1">
              {['beginner', 'advanced', 'chaos'].map((tier, idx) => (
                <div
                  key={tier}
                  className={`flex-1 h-2 rounded-full transition-all duration-200 ${
                    ['beginner', 'advanced', 'chaos'].indexOf(progress.current_tier) >= idx
                      ? 'bg-[hsl(var(--tex-vision-success))]'
                      : 'bg-[hsl(var(--tex-vision-primary-light))]/20'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-[hsl(var(--tex-vision-text-muted))]">Beginner</span>
              <span className="text-[10px] text-[hsl(var(--tex-vision-text-muted))]">Advanced</span>
              <span className="text-[10px] text-[hsl(var(--tex-vision-text-muted))]">Chaos</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
