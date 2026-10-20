import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Video } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useFeatureSwitches } from '@/hooks/useFeatureSwitches';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { localIso } from '@/hooks/usePitcherSchedule';
import { supabase } from '@/integrations/supabase/client';
import { priorityAccess } from '@/lib/hammer/priorityAccess';
import { delaycamDue, DELAYCAM_PROMPT, DELAYCAM_WHY } from '@/lib/hammer/toolPromptRules';
import { Button } from '@/components/ui/button';

export function DelaycamReminderCard() {
  const navigate = useNavigate();
  const { sport } = useSportTheme();
  return <section className="space-y-3 border-b border-border py-4" aria-label="Delaycam reminder">
    <h3 className="flex items-center gap-2 text-sm font-semibold"><Video className="h-5 w-5 shrink-0 text-primary" />{DELAYCAM_PROMPT}</h3>
    <p className="text-sm leading-relaxed text-muted-foreground">{DELAYCAM_WHY}</p>
    <Button size="sm" onClick={() => navigate(`/delaycam/hitting?sport=${sport}`)}>Open Delaycam</Button>
  </section>;
}

/** Canonical recordings, never inferred completion or another skill's history. */
export function DelaycamReminder({ skillToday, offSeason, majorMechanicalFlag = false, mechanicsGoal = false }: {
  skillToday: boolean; offSeason: boolean; majorMechanicalFlag?: boolean; mechanicsGoal?: boolean;
}) {
  const { user } = useAuth();
  const { modules, loading: subscriptionLoading } = useSubscription();
  const { sport } = useSportTheme();
  const switches = useFeatureSwitches();
  const hasHitting = priorityAccess(modules, sport).hasHitting;
  const enabled = !switches.loading && switches.isEnabled('plan_prompts_v2') && !subscriptionLoading && hasHitting && skillToday;
  const history = useQuery({
    queryKey: ['delaycam-reminder', user?.id, sport, 'hitting'],
    enabled: enabled && Boolean(user),
    queryFn: async () => {
      if (!user) throw new Error('Sign in first');
      const result = await supabase.from('delaycam_sessions').select('ended_at')
        .eq('user_id', user.id).eq('sport', sport).eq('module', 'hitting').not('ended_at', 'is', null);
      if (result.error) throw result.error;
      return result.data.map(row => row.ended_at ?? 'unknown');
    },
  });
  if (!enabled) return null;
  if (history.error) return <p role="alert" className="text-sm text-destructive">Couldn't check your Delaycam recordings.</p>;
  if (!history.data || !delaycamDue({ enabled, today: localIso(), skillToday, uses: history.data, offSeason, majorMechanicalFlag, mechanicsGoal })) return null;
  return <DelaycamReminderCard />;
}