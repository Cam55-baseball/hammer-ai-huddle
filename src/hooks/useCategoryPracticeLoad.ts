import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { PracticeLoadRecord } from '@/lib/hammer/prescription/categoryPracticeLoad';

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const number = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;

export function useCategoryPracticeLoad(sport: string, today: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['category-practice-load', user?.id, sport, today],
    enabled: Boolean(user),
    queryFn: async (): Promise<PracticeLoadRecord[]> => {
      if (!user) throw new Error('Sign in first');
      const since = new Date(`${today}T12:00:00Z`);
      since.setUTCDate(since.getUTCDate() - 7);
      const from = since.toISOString().slice(0, 10);
      const [sessions, logs] = await Promise.all([
        supabase.from('performance_sessions').select('id,session_date,sport,module,session_type,deleted_at')
          .eq('user_id', user.id).eq('sport', sport).gte('session_date', from).lt('session_date', today).is('deleted_at', null),
        supabase.from('wk_session_logs').select('id,plan_date,duration_seconds_completed,rpe,metrics')
          .eq('user_id', user.id).gte('plan_date', from).lt('plan_date', today).contains('metrics', { kind: 'practice', sport }),
      ]);
      if (sessions.error) throw sessions.error;
      if (logs.error) throw logs.error;
      const types = new Set(['solo_work', 'team_session', 'lesson', 'live_abs']);
      return [
        ...sessions.data.filter(row => types.has(row.session_type)).map(row => ({ id: `performance:${row.id}`, date: row.session_date, sport: row.sport, category: row.module, minutes: null, intensity: null })),
        ...logs.data.map(row => {
          const metrics = object(row.metrics);
          return { id: `wk:${row.id}`, date: row.plan_date, sport, category: typeof metrics.modality === 'string' ? metrics.modality : null, minutes: row.duration_seconds_completed === null ? null : row.duration_seconds_completed / 60, intensity: number(row.rpe) };
        }),
      ];
    },
  });
}