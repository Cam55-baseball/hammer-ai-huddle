import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdversarialLog {
  id: string;
  run_at: string;
  scenario: string;
  user_id: string;
  expected_state: string;
  forbidden_states: string[];
  actual_state: string | null;
  pass: boolean;
  failure_reason: string | null;
  inputs: Record<string, unknown>;
  engine_output: Record<string, unknown>;
}

export function useAdversarialHealth() {
  const { data, isLoading } = useQuery({
    queryKey: ['adversarial-health'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data: rows } = await (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            gte: (c: string, v: string) => {
              order: (c: string, o: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: AdversarialLog[] | null }>;
              };
            };
          };
        };
      })
        .from('engine_adversarial_logs')
        .select('*')
        .gte('run_at', since)
        .order('run_at', { ascending: false })
        .limit(500);

      const list = (rows ?? []) as AdversarialLog[];
      const total = list.length;
      const passed = list.filter((r) => r.pass).length;
      const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

      const failuresByScenario: Record<string, number> = {};
      for (const r of list) {
        if (!r.pass) failuresByScenario[r.scenario] = (failuresByScenario[r.scenario] ?? 0) + 1;
      }

      const lastFailure = list.find((r) => !r.pass) ?? null;
      const recent = list.slice(0, 30);

      return { total, passed, passRate, failuresByScenario, lastFailure, recent };
    },
  });

  return {
    loading: isLoading,
    runsToday: data?.total ?? 0,
    passRate24h: data?.passRate ?? 0,
    failuresByScenario: data?.failuresByScenario ?? {},
    lastFailure: data?.lastFailure ?? null,
    recent: data?.recent ?? [],
  };
}
