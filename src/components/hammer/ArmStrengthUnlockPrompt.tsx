import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { localIso } from '@/hooks/usePitcherSchedule';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { armStrengthUnlockPrompt } from '@/lib/hammer/armStrengthUnlock';
import { CATCH_PLAY_SETTING_KEY, catchPlayStandardsFrom } from '../../../supabase/functions/_shared/wic/throwing/catchPlay';

/** Read-only: never changes the plan; regular throwing continues while arm-strength days wait. */
export function ArmStrengthUnlockPrompt({ throwingToday }: { throwingToday: boolean }) {
  const { user } = useAuth();
  const { sport } = useSportTheme();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ['arm-strength-unlock', user?.id, sport], enabled: throwingToday && Boolean(user),
    queryFn: async () => {
      const [v, s] = await Promise.all([
        supabase.from('videos').select('created_at').eq('user_id', user!.id).eq('sport', sport)
          .in('module', ['throwing', 'pitching']).not('analysis_public', 'is', null)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        (supabase as any).from('app_settings').select('setting_value').eq('setting_key', CATCH_PLAY_SETTING_KEY).maybeSingle(),
      ]);
      if (v.error) throw v.error;
      return { last: (v.data?.created_at as string | undefined) ?? null, freshDays: catchPlayStandardsFrom(s.data?.setting_value).analysisFreshDays };
    },
  });
  if (!q.data) return null; // failed lookups stay quiet for players
  const text = armStrengthUnlockPrompt({ throwingToday, lastThrowingClipIso: q.data.last, today: localIso(), freshDays: q.data.freshDays });
  if (!text) return null;
  return <div className="flex flex-wrap items-center gap-3 border-b border-border py-3">
    <Camera className="h-5 w-5 shrink-0 text-primary" />
    <p className="min-w-0 flex-1 text-sm font-semibold">{text}</p>
    <Button size="sm" onClick={() => navigate(`/analyze/throwing?sport=${sport}`)}>Record clip</Button>
  </div>;
}
