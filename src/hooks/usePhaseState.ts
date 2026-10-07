/**
 * usePhaseState — ONE SYSTEM, ONE PHASE. The device never works a phase out:
 * it asks the server's one resolver (phase-state) and shows that answer.
 * Today's built plan wins on the server side. The last answer is kept on the
 * device only to paint instantly; it is replaced by this visit's answer.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PhaseState {
  version: string;
  date: string;
  season: 'off_season' | 'preseason' | 'in_season' | 'post_season';
  season_label: string;
  sub_block: 'os_q1' | 'os_q2' | 'os_q3' | 'os_q4' | 'in_season' | 'post_season';
  sub_block_label: string;
  ramp_up: boolean;
  lighter_week: 'none' | 'planned' | 'trend';
  growth: boolean;
  days_in: number | null;
  days_left: number | null;
  source: string;
}

const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const cacheKey = (uid: string) => `phase-state:${uid}`;

export function usePhaseState() {
  const { user } = useAuth();
  const date = localDay();
  const q = useQuery({
    queryKey: ['phase-state', user?.id, date],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<PhaseState | null> => {
      const { data, error } = await supabase.functions.invoke('phase-state', { body: { date } });
      if (error) throw error;
      const ps = (data as any)?.phase_state ?? null;
      try { if (ps && user?.id) localStorage.setItem(cacheKey(user.id), JSON.stringify(ps)); } catch { /* ignore */ }
      return ps;
    },
    placeholderData: () => {
      try {
        const raw = user?.id ? localStorage.getItem(cacheKey(user.id)) : null;
        const ps = raw ? (JSON.parse(raw) as PhaseState) : null;
        return ps && ps.date === date ? ps : undefined;
      } catch { return undefined; }
    },
  });
  return { phaseState: q.data ?? null, isLoading: q.isLoading };
}
