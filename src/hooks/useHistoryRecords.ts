/**
 * History data hooks — read-only queries for records that have no video and
 * therefore do not belong in Players Club.
 *
 * Each hook is independently gated by `enabled` so a collapsed History section
 * costs nothing until the athlete opens it.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PracticeRecord {
  id: string;
  session_date: string;
  module: string | null;
  session_type: string | null;
  effective_grade: number | null;
  coach_grade: number | null;
  drill_blocks: unknown;
  notes: string | null;
  sport: string | null;
}

export interface GameRecord {
  id: string;
  game_date: string;
  opponent_team: string | null;
  game_type: string | null;
  venue: string | null;
  status: string;
  sport: string;
  my_score: number | null;
  opp_score: number | null;
}

export interface ReportRecord {
  id: string;
  created_at: string;
  title: string;
  subtitle: string | null;
  report_kind: string;
  game_id: string | null;
  share_token: string | null;
  share_expires_at: string | null;
  share_revoked: boolean;
}

export interface RecapRecord {
  id: string;
  created_at: string | null;
  report_period_start: string;
  report_period_end: string;
  status: string;
}

const dayBounds = (date: string) => ({
  from: `${date}T00:00:00.000Z`,
  to: `${date}T23:59:59.999Z`,
});

export function usePracticeHistory(userId: string | null, enabled: boolean, limit = 100) {
  return useQuery({
    queryKey: ['history-practices', userId, limit],
    enabled: enabled && !!userId,
    queryFn: async (): Promise<PracticeRecord[]> => {
      const { data, error } = await supabase
        .from('performance_sessions')
        .select('id, session_date, module, session_type, effective_grade, coach_grade, drill_blocks, notes, sport')
        .eq('user_id', userId!)
        .is('deleted_at', null)
        .order('session_date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as PracticeRecord[];
    },
  });
}

export function useGameHistory(userId: string | null, enabled: boolean, limit = 100) {
  return useQuery({
    queryKey: ['history-games', userId, limit],
    enabled: enabled && !!userId,
    queryFn: async (): Promise<GameRecord[]> => {
      const { data, error } = await supabase
        .from('gp_games')
        .select('id, game_date, opponent_team, game_type, venue, status, sport, my_score, opp_score')
        .is("deleted_at", null)
        .eq('user_id', userId!)
        .order('game_date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as GameRecord[];
    },
  });
}

export function useReportHistory(userId: string | null, enabled: boolean, limit = 100) {
  return useQuery({
    queryKey: ['history-reports', userId, limit],
    enabled: enabled && !!userId,
    queryFn: async (): Promise<ReportRecord[]> => {
      const { data, error } = await supabase
        .from('gp_reports')
        .select('id, created_at, title, subtitle, report_kind, game_id, share_token, share_expires_at, share_revoked')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ReportRecord[];
    },
  });
}

export function useRecapHistory(userId: string | null, enabled: boolean, limit = 60) {
  return useQuery({
    queryKey: ['history-recaps', userId, limit],
    enabled: enabled && !!userId,
    queryFn: async (): Promise<RecapRecord[]> => {
      const { data, error } = await supabase
        .from('monthly_reports')
        .select('id, created_at, report_period_start, report_period_end, status')
        .eq('user_id', userId!)
        .order('report_period_end', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as RecapRecord[];
    },
  });
}

export interface DayRecord {
  id: string;
  kind: 'game' | 'report' | 'recap' | 'video';
  title: string;
  detail?: string | null;
  href: string;
}

/**
 * Every record dated on a single day (excluding practice sessions, which the
 * day sheet already renders through DaySessionsList).
 */
export function useDayRecords(date: string | null) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: ['day-records', userId, date],
    enabled: !!userId && !!date,
    staleTime: 30_000,
    queryFn: async (): Promise<DayRecord[]> => {
      const { from, to } = dayBounds(date!);
      const [games, reports, recaps, videos] = await Promise.all([
        supabase
          .from('gp_games')
          .select('id, game_date, opponent_team, my_score, opp_score, status')
          .is("deleted_at", null)
          .eq('user_id', userId!)
          .eq('game_date', date!),
        supabase
          .from('gp_reports')
          .select('id, title, subtitle, created_at, game_id')
          .eq('user_id', userId!)
          .gte('created_at', from)
          .lte('created_at', to),
        supabase
          .from('monthly_reports')
          .select('id, report_period_start, report_period_end, created_at')
          .eq('user_id', userId!)
          .gte('created_at', from)
          .lte('created_at', to),
        supabase
          .from('videos')
          .select('id, library_title, module, sport, session_date')
          .eq('user_id', userId!)
          .eq('saved_to_library', true)
          .eq('session_date', date!),
      ]);

      const out: DayRecord[] = [];

      for (const g of games.data ?? []) {
        const score =
          g.my_score != null && g.opp_score != null ? `${g.my_score}–${g.opp_score}` : g.status;
        out.push({
          id: g.id,
          kind: 'game',
          title: g.opponent_team ? `vs ${g.opponent_team}` : 'Game',
          detail: score,
          href: `/games/${g.id}/report`,
        });
      }
      for (const r of reports.data ?? []) {
        out.push({
          id: r.id,
          kind: 'report',
          title: r.title,
          detail: r.subtitle,
          href: r.game_id ? `/games/${r.game_id}/report` : '/games/reports',
        });
      }
      for (const r of recaps.data ?? []) {
        out.push({
          id: r.id,
          kind: 'recap',
          title: 'Progress recap',
          detail: `${r.report_period_start} → ${r.report_period_end}`,
          href: '/progress',
        });
      }
      for (const v of videos.data ?? []) {
        out.push({
          id: v.id,
          kind: 'video',
          title: v.library_title || `${v.sport ?? ''} ${v.module ?? 'video'}`.trim(),
          detail: 'Players Club',
          href: '/players-club',
        });
      }

      return out;
    },
  });
}
