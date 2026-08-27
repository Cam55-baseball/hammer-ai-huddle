import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Coach dashboard §9.5 — per-athlete scannable summary.
 *
 * Honesty rules:
 *  - Official grades ONLY (grade_source = 'coach_evaluated' | 'cv_measured').
 *    Self-reported grades are athlete-private and are never requested here;
 *    RLS also blocks them for coaches.
 *  - Missing stays missing. No imputation, no derived "estimated" grades.
 */

export const OFFICIAL_GRADE_SOURCES = ['coach_evaluated', 'cv_measured'] as const;

export const GRADE_METRICS = [
  { key: 'hitting_grade', label: 'Hitting' },
  { key: 'power_grade', label: 'Power' },
  { key: 'speed_grade', label: 'Speed' },
  { key: 'throwing_grade', label: 'Throwing' },
  { key: 'defense_grade', label: 'Defense' },
  { key: 'fastball_grade', label: 'Fastball' },
  { key: 'control_grade', label: 'Control' },
] as const;

export type GradeMetricKey = (typeof GRADE_METRICS)[number]['key'];

export interface GradeReading {
  metric: GradeMetricKey;
  label: string;
  current: number;
  previous: number | null;
  delta: number | null;
  gradedAt: string;
  source: string;
}

export interface AthleteSummary {
  athleteId: string;
  grades: GradeReading[];
  lastEvaluatedAt: string | null;
  sessions30d: number;
  lastSessionAt: string | null;
  lastSessionModule: string | null;
  videos30d: number;
  lastVideoAt: string | null;
  games30d: number;
  lastGame: { date: string; opponent: string | null; myScore: number | null; oppScore: number | null } | null;
}

interface GradeRow {
  user_id: string;
  graded_at: string;
  grade_source: string;
  [k: string]: unknown;
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function useCoachAthleteSummaries(athleteIds: string[]) {
  const ids = [...athleteIds].sort();

  return useQuery({
    queryKey: ['coach-athlete-summaries', ids],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, AthleteSummary>> => {
      const since30 = daysAgoIso(30);

      const [gradesRes, sessionsRes, videosRes, gamesRes] = await Promise.all([
        supabase
          .from('vault_scout_grades')
          .select(
            'user_id, graded_at, grade_source, hitting_grade, power_grade, speed_grade, throwing_grade, defense_grade, fastball_grade, control_grade',
          )
          .in('user_id', ids)
          .in('grade_source', OFFICIAL_GRADE_SOURCES as unknown as string[])
          .order('graded_at', { ascending: false })
          .limit(600),
        supabase
          .from('performance_sessions')
          .select('user_id, module, session_date, created_at')
          .in('user_id', ids)
          .gte('created_at', since30)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('videos')
          .select('user_id, created_at, module')
          .in('user_id', ids)
          .gte('created_at', since30)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('gp_games')
          .select('user_id, game_date, opponent_team, my_score, opp_score')
          .in('user_id', ids)
          .gte('game_date', since30.slice(0, 10))
          .order('game_date', { ascending: false })
          .limit(300),
      ]);

      const out: Record<string, AthleteSummary> = {};
      ids.forEach((id) => {
        out[id] = {
          athleteId: id,
          grades: [],
          lastEvaluatedAt: null,
          sessions30d: 0,
          lastSessionAt: null,
          lastSessionModule: null,
          videos30d: 0,
          lastVideoAt: null,
          games30d: 0,
          lastGame: null,
        };
      });

      // Grades — newest first per athlete; trend = newest vs. previous reading
      // that actually carried a value for that metric.
      const gradeRows = (gradesRes.data ?? []) as GradeRow[];
      for (const id of ids) {
        const rows = gradeRows.filter((r) => r.user_id === id);
        if (rows.length === 0) continue;
        out[id].lastEvaluatedAt = rows[0].graded_at;

        for (const { key, label } of GRADE_METRICS) {
          const withValue = rows.filter((r) => typeof r[key] === 'number' && r[key] !== null);
          if (withValue.length === 0) continue;
          const latest = withValue[0];
          const prior = withValue[1];
          const current = latest[key] as number;
          const previous = prior ? (prior[key] as number) : null;
          out[id].grades.push({
            metric: key,
            label,
            current,
            previous,
            delta: previous === null ? null : current - previous,
            gradedAt: latest.graded_at,
            source: latest.grade_source,
          });
        }
      }

      for (const s of sessionsRes.data ?? []) {
        const a = out[s.user_id];
        if (!a) continue;
        a.sessions30d += 1;
        if (!a.lastSessionAt) {
          a.lastSessionAt = s.created_at;
          a.lastSessionModule = s.module ?? null;
        }
      }

      for (const v of videosRes.data ?? []) {
        const a = out[v.user_id];
        if (!a) continue;
        a.videos30d += 1;
        if (!a.lastVideoAt) a.lastVideoAt = v.created_at;
      }

      for (const g of gamesRes.data ?? []) {
        const a = out[g.user_id];
        if (!a) continue;
        a.games30d += 1;
        if (!a.lastGame) {
          a.lastGame = {
            date: g.game_date,
            opponent: g.opponent_team ?? null,
            myScore: g.my_score ?? null,
            oppScore: g.opp_score ?? null,
          };
        }
      }

      return out;
    },
  });
}
