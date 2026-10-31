import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useFeatureSwitches } from '@/hooks/useFeatureSwitches';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { localIso } from '@/hooks/usePitcherSchedule';
import { supabase } from '@/integrations/supabase/client';
import { royalTimingDue } from '@/lib/hammer/toolPromptRules';
import { Button } from '@/components/ui/button';
import { RoyalTimingExplanation } from '@/components/royal-timing/RoyalTimingExplanation';

export function RoyalTimingReminderCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return <details className="rounded-md border border-border/60 bg-card p-3" aria-label="Royal timing reminder">
    <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold"><Crown className="h-5 w-5 shrink-0 text-primary" />{t('royalTiming.reminder')}</summary>
    <div className="space-y-3 pt-2">
      <RoyalTimingExplanation />
      <Button size="sm" onClick={() => navigate('/royal-timing')}>{t('royalTiming.open')}</Button>
    </div>
  </details>;
}

/** Unavailable history never becomes a due reminder or a new training day. */
export function RoyalTimingReminder({ skillToday }: { skillToday: boolean }) {
  const { user } = useAuth();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const { sport } = useSportTheme();
  const switches = useFeatureSwitches();
  const enabled = !switches.loading && switches.isEnabled('plan_prompts_v2') && !subscriptionLoading && subscribed && skillToday;
  const history = useQuery({
    queryKey: ['royal-timing-reminder', user?.id, sport],
    enabled: enabled && Boolean(user),
    queryFn: async () => {
      if (!user) throw new Error('Sign in first');
      const result = await supabase.from('royal_timing_sessions').select('updated_at, created_at')
        .eq('user_id', user.id).eq('sport', sport);
      if (result.error) throw result.error;
      return result.data.map(row => row.updated_at ?? row.created_at ?? 'unknown');
    },
  });
  if (!enabled) return null;
  if (history.error) return <p role="alert" className="text-sm text-destructive">Couldn't check your Royal timing sessions.</p>;
  if (!history.data || !royalTimingDue({ enabled, today: localIso(), skillToday, uses: history.data })) return null;
  return <RoyalTimingReminderCard />;
}