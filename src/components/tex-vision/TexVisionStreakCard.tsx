import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Target, Eye, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TexVisionProgressData, TexVisionDailyChecklist } from '@/hooks/useTexVisionProgress';

interface TexVisionStreakCardProps {
  progress: TexVisionProgressData | null;
  dailyChecklist: TexVisionDailyChecklist | null;
  loading: boolean;
}

export default function TexVisionStreakCard({ progress, dailyChecklist, loading }: TexVisionStreakCardProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className="bg-[hsl(var(--tex-vision-primary))]/50 border-[hsl(var(--tex-vision-primary-light))]/30">
        <CardHeader>
          <Skeleton className="h-6 w-32 bg-[hsl(var(--tex-vision-primary-light))]/50" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 bg-[hsl(var(--tex-vision-primary-light))]/50 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      icon: Flame,
      label: t('texVision.streak.current', 'Current Streak'),
      value: progress?.streak_current || 0,
      suffix: t('texVision.streak.days', 'days'),
      color: 'text-[hsl(var(--tex-vision-timing))]',
    },
    {
      icon: TrendingUp,
      label: t('texVision.streak.longest', 'Longest Streak'),
      value: progress?.streak_longest || 0,
      suffix: t('texVision.streak.days', 'days'),
      color: 'text-[hsl(var(--tex-vision-success))]',
    },
    {
      icon: Target,
      label: t('texVision.streak.sessions', 'Total Sessions'),
      value: progress?.total_sessions_completed || 0,
      suffix: '',
      color: 'text-[hsl(var(--tex-vision-feedback))]',
    },
    {
      icon: Eye,
      label: t('texVision.streak.todayDrills', 'Today\'s Drills'),
      value: dailyChecklist ? Object.values(dailyChecklist.checklist_items).filter(Boolean).length : 0,
      suffix: `/ 2+`,
      color: dailyChecklist?.all_complete ? 'text-[hsl(var(--tex-vision-success))]' : 'text-[hsl(var(--tex-vision-text))]',
    },
  ];

  return (
    <Card className="bg-[hsl(var(--tex-vision-primary))]/50 border-[hsl(var(--tex-vision-primary-light))]/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-[hsl(var(--tex-vision-text))] flex items-center gap-2">
          <Flame className="h-5 w-5 text-[hsl(var(--tex-vision-timing))]" />
          {t('texVision.streak.title', 'Training Progress')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="flex flex-col items-center justify-center p-4 rounded-lg bg-[hsl(var(--tex-vision-primary-dark))]/50 border border-[hsl(var(--tex-vision-primary-light))]/20"
            >
              <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
              <span className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
                {stat.suffix && <span className="text-sm font-normal text-[hsl(var(--tex-vision-text-muted))]"> {stat.suffix}</span>}
              </span>
              <span className="text-xs text-[hsl(var(--tex-vision-text-muted))] text-center mt-1">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
