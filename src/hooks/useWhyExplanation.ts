import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type WhySource = 'hie' | 'mpi' | 'hammer';

export interface WhyInput {
  table: string;
  field: string;
  value: string | number;
  capturedAt?: string;
}

export interface WhyExplanation {
  inputs: WhyInput[];
  thresholds: { key: string; value: string | number }[];
  logic: string;
  neuroTags: string[];
  confidence: number;
  loading: boolean;
}

/**
 * Builds a transparent explanation for any engine-surfaced recommendation.
 * Reads from snapshot tables + engine_settings.module_neuro_map.
 */
export function useWhyExplanation(sourceType: WhySource, sourceId?: string): WhyExplanation {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['why-explanation', sourceType, sourceId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const inputs: WhyInput[] = [];
      const thresholds: { key: string; value: string | number }[] = [];
      const neuroTags: string[] = [];
      let logic = '';
      let confidence = 0.5;

      const [neuroMapRes, settingsRes] = await Promise.all([
        (supabase as any).from('engine_settings').select('setting_value').eq('setting_key', 'module_neuro_map').maybeSingle(),
        (supabase as any).from('engine_settings').select('setting_key, setting_value').in('setting_key', [
          'hie_min_confidence', 'mpi_min_sessions', 'hammer_recover_threshold',
        ]),
      ]);

      const neuroMap = (neuroMapRes.data?.setting_value as any) ?? {};
      (settingsRes.data ?? []).forEach((s: any) =>
        thresholds.push({ key: s.setting_key, value: typeof s.setting_value === 'object' ? JSON.stringify(s.setting_value) : String(s.setting_value) })
      );

      if (sourceType === 'hie' && user) {
        const { data } = await (supabase as any)
          .from('hie_snapshots')
          .select('weakness_clusters, development_confidence, computed_at')
          .eq('user_id', user.id)
          .order('computed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const clusters = (data?.weakness_clusters as any[]) ?? [];
        const cluster = sourceId ? clusters.find((c: any) => c.id === sourceId) : clusters[0];
        if (cluster) {
          (cluster.data_points ?? []).slice(0, 6).forEach((dp: any) =>
            inputs.push({ table: dp.source_table ?? 'session', field: dp.metric ?? 'value', value: dp.value ?? '—', capturedAt: dp.captured_at })
          );
          logic = `Weakness "${cluster.weakness_area ?? cluster.name ?? 'cluster'}" exceeded threshold from ${(cluster.data_points ?? []).length} data points.`;
          neuroTags.push(...(cluster.neuro_tags ?? []));
        }
        confidence = (data?.development_confidence ?? 50) / 100;
      } else if (sourceType === 'mpi' && user) {
        const { data } = await (supabase as any)
          .from('mpi_scores')
          .select('scoring_inputs, development_status, calculation_date')
          .eq('user_id', user.id)
          .order('calculation_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        const si = (data?.scoring_inputs as any) ?? {};
        Object.entries(si).slice(0, 6).forEach(([k, v]: [string, any]) =>
          inputs.push({ table: 'mpi_scores', field: k, value: typeof v === 'object' ? JSON.stringify(v) : String(v) })
        );
        logic = `MPI compiled from ${Object.keys(si).length} scoring inputs (${data?.development_status ?? 'unknown'}).`;
        confidence = data?.development_status === 'mature' ? 0.85 : 0.5;
      } else if (sourceType === 'hammer' && user) {
        const { data } = await (supabase as any)
          .from('hammer_state_snapshots')
          .select('*')
          .eq('user_id', user.id)
          .order('computed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          ['arousal_inputs', 'recovery_inputs', 'motor_inputs', 'cognitive_inputs', 'dopamine_inputs'].forEach((k) => {
            const v = (data as any)[k];
            if (v && typeof v === 'object') {
              Object.entries(v).slice(0, 2).forEach(([field, val]: [string, any]) =>
                inputs.push({ table: 'hammer_state', field: `${k.replace('_inputs','')}.${field}`, value: typeof val === 'object' ? JSON.stringify(val) : String(val), capturedAt: data.computed_at })
              );
            }
          });
          logic = `Hammer State "${data.overall_state}" derived from arousal=${data.arousal_score ?? '—'}, recovery=${data.recovery_score ?? '—'}, motor=${data.motor_state ?? '—'}.`;
          confidence = 0.7;
        }
      }

      Object.entries(neuroMap).slice(0, 4).forEach(([mod, weights]: [string, any]) => {
        if (weights && typeof weights === 'object') {
          const top = Object.entries(weights).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
          if (top) neuroTags.push(`${mod}:${top[0]}`);
        }
      });

      return { inputs, thresholds, logic, neuroTags: Array.from(new Set(neuroTags)), confidence };
    },
  });

  return {
    inputs: query.data?.inputs ?? [],
    thresholds: query.data?.thresholds ?? [],
    logic: query.data?.logic ?? '',
    neuroTags: query.data?.neuroTags ?? [],
    confidence: query.data?.confidence ?? 0,
    loading: query.isLoading,
  };
}
