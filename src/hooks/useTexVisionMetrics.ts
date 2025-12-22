import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';
export interface TexVisionMetricsData {
  id: string;
  user_id: string;
  sport: string;
  neuro_reaction_index: number | null;
  visual_processing_speed: number | null;
  anticipation_quotient: number | null;
  coordination_efficiency: number | null;
  stress_resilience_score: number | null;
  left_right_bias: number | null;
  early_late_bias: number | null;
  metrics_history: MetricsHistoryEntry[] | null;
  plateau_detected_at: string | null;
  updated_at: string | null;
}

export interface MetricsHistoryEntry {
  date: string;
  neuro_reaction_index: number | null;
  visual_processing_speed: number | null;
  anticipation_quotient: number | null;
  coordination_efficiency: number | null;
  stress_resilience_score: number | null;
}

export interface BiasAnalysis {
  left_right_bias: number; // -1 = left heavy, 0 = balanced, 1 = right heavy
  early_late_bias: number; // -1 = early, 0 = on-time, 1 = late
  left_right_description: string;
  early_late_description: string;
}

export interface PlateauStatus {
  detected: boolean;
  detected_at: string | null;
  metric_stagnant: string | null;
  recommendation: string;
}

export const useTexVisionMetrics = (sport: string = 'baseball') => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<TexVisionMetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current metrics
  const fetchMetrics = useCallback(async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('tex_vision_metrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sport)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const metricsData = {
          ...data,
          metrics_history: (data.metrics_history as unknown as MetricsHistoryEntry[]) || null,
        } as TexVisionMetricsData;
        setMetrics(metricsData);
        return metricsData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching Tex Vision metrics:', error);
      return null;
    }
  }, [user, sport]);

  // Calculate composite metrics from drill results
  const calculateMetricsFromResults = useCallback(async () => {
    if (!user) return null;

    try {
      // Fetch recent drill results (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: results, error } = await supabase
        .from('tex_vision_drill_results')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', thirtyDaysAgo.toISOString());

      if (error) throw error;
      if (!results || results.length === 0) return null;

      // Calculate Neuro Reaction Index (average reaction time, normalized to 0-100)
      const reactionTimes = results
        .filter(r => r.reaction_time_ms !== null)
        .map(r => r.reaction_time_ms as number);
      const avgReactionTime = reactionTimes.length > 0 
        ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length 
        : 0;
      // Convert to score (faster = higher, 200ms = 100, 800ms = 0)
      const neuroReactionIndex = Math.max(0, Math.min(100, 100 - ((avgReactionTime - 200) / 6)));

      // Calculate Visual Processing Speed (based on pattern_search, follow_target)
      const visualDrills = results.filter(r => 
        ['pattern_search', 'follow_target'].includes(r.drill_type)
      );
      const visualAccuracies = visualDrills
        .filter(r => r.accuracy_percent !== null)
        .map(r => r.accuracy_percent as number);
      const visualProcessingSpeed = visualAccuracies.length > 0
        ? visualAccuracies.reduce((a, b) => a + b, 0) / visualAccuracies.length
        : null;

      // Calculate Anticipation Quotient (meter_timing, convergence_divergence)
      const anticipationDrills = results.filter(r =>
        ['meter_timing', 'convergence_divergence'].includes(r.drill_type)
      );
      const anticipationAccuracies = anticipationDrills
        .filter(r => r.accuracy_percent !== null)
        .map(r => r.accuracy_percent as number);
      const anticipationQuotient = anticipationAccuracies.length > 0
        ? anticipationAccuracies.reduce((a, b) => a + b, 0) / anticipationAccuracies.length
        : null;

      // Calculate Coordination Efficiency (whack_a_mole, near_far_sight)
      const coordDrills = results.filter(r =>
        ['whack_a_mole', 'near_far_sight'].includes(r.drill_type)
      );
      const coordAccuracies = coordDrills
        .filter(r => r.accuracy_percent !== null)
        .map(r => r.accuracy_percent as number);
      const coordinationEfficiency = coordAccuracies.length > 0
        ? coordAccuracies.reduce((a, b) => a + b, 0) / coordAccuracies.length
        : null;

      // Calculate Stress Resilience Score (performance consistency)
      const allAccuracies = results
        .filter(r => r.accuracy_percent !== null)
        .map(r => r.accuracy_percent as number);
      let stressResilienceScore: number | null = null;
      if (allAccuracies.length >= 5) {
        const mean = allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length;
        const variance = allAccuracies.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allAccuracies.length;
        const stdDev = Math.sqrt(variance);
        // Lower std dev = higher resilience (max 100)
        stressResilienceScore = Math.max(0, Math.min(100, 100 - stdDev * 2));
      }

      // Calculate biases from peripheral vision results
      const peripheralResults = results.filter(r => r.drill_type === 'peripheral_vision');
      let leftRightBias = 0;
      peripheralResults.forEach(r => {
        const metrics = r.drill_metrics as Record<string, unknown> | null;
        if (metrics?.left_hits !== undefined && metrics?.right_hits !== undefined) {
          const leftHits = metrics.left_hits as number;
          const rightHits = metrics.right_hits as number;
          const total = leftHits + rightHits;
          if (total > 0) {
            leftRightBias += (rightHits - leftHits) / total;
          }
        }
      });
      leftRightBias = peripheralResults.length > 0 ? leftRightBias / peripheralResults.length : 0;

      // Calculate early/late bias from meter timing results
      const meterResults = results.filter(r => r.drill_type === 'meter_timing');
      let earlyLateBias = 0;
      meterResults.forEach(r => {
        const metrics = r.drill_metrics as Record<string, unknown> | null;
        if (metrics?.average_timing_offset !== undefined) {
          earlyLateBias += metrics.average_timing_offset as number;
        }
      });
      earlyLateBias = meterResults.length > 0 ? earlyLateBias / meterResults.length : 0;
      // Normalize to -1 to 1 range
      earlyLateBias = Math.max(-1, Math.min(1, earlyLateBias / 100));

      return {
        neuro_reaction_index: neuroReactionIndex,
        visual_processing_speed: visualProcessingSpeed,
        anticipation_quotient: anticipationQuotient,
        coordination_efficiency: coordinationEfficiency,
        stress_resilience_score: stressResilienceScore,
        left_right_bias: leftRightBias,
        early_late_bias: earlyLateBias,
      };
    } catch (error) {
      console.error('Error calculating metrics:', error);
      return null;
    }
  }, [user]);

  // Update metrics in database
  const updateMetrics = useCallback(async (newMetrics: Partial<TexVisionMetricsData>) => {
    if (!user) return null;

    try {
      const today = new Date().toISOString().split('T')[0];
      const currentHistory = metrics?.metrics_history || [];
      
      // Add today's entry to history
      const historyEntry: MetricsHistoryEntry = {
        date: today,
        neuro_reaction_index: newMetrics.neuro_reaction_index ?? null,
        visual_processing_speed: newMetrics.visual_processing_speed ?? null,
        anticipation_quotient: newMetrics.anticipation_quotient ?? null,
        coordination_efficiency: newMetrics.coordination_efficiency ?? null,
        stress_resilience_score: newMetrics.stress_resilience_score ?? null,
      };

      // Keep last 90 days of history
      const updatedHistory = [historyEntry, ...currentHistory.filter(h => h.date !== today)].slice(0, 90);

      // Check if record exists first
      const { data: existing } = await supabase
        .from('tex_vision_metrics')
        .select('id')
        .eq('user_id', user.id)
        .eq('sport', sport)
        .maybeSingle();

      let data;
      let error;

      if (existing) {
        const result = await supabase
          .from('tex_vision_metrics')
          .update({
            neuro_reaction_index: newMetrics.neuro_reaction_index,
            visual_processing_speed: newMetrics.visual_processing_speed,
            anticipation_quotient: newMetrics.anticipation_quotient,
            coordination_efficiency: newMetrics.coordination_efficiency,
            stress_resilience_score: newMetrics.stress_resilience_score,
            left_right_bias: newMetrics.left_right_bias,
            early_late_bias: newMetrics.early_late_bias,
            metrics_history: JSON.parse(JSON.stringify(updatedHistory)) as Json,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .from('tex_vision_metrics')
          .insert({
            user_id: user.id,
            sport,
            neuro_reaction_index: newMetrics.neuro_reaction_index,
            visual_processing_speed: newMetrics.visual_processing_speed,
            anticipation_quotient: newMetrics.anticipation_quotient,
            coordination_efficiency: newMetrics.coordination_efficiency,
            stress_resilience_score: newMetrics.stress_resilience_score,
            left_right_bias: newMetrics.left_right_bias,
            early_late_bias: newMetrics.early_late_bias,
            metrics_history: JSON.parse(JSON.stringify(updatedHistory)) as Json,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      
      const metricsData = {
        ...data,
        metrics_history: (data.metrics_history as unknown as MetricsHistoryEntry[]) || null,
      } as TexVisionMetricsData;
      setMetrics(metricsData);
      return metricsData;
    } catch (error) {
      console.error('Error updating metrics:', error);
      return null;
    }
  }, [user, sport, metrics]);

  // Analyze biases
  const analyzeBiases = useCallback((): BiasAnalysis => {
    const leftRightBias = metrics?.left_right_bias ?? 0;
    const earlyLateBias = metrics?.early_late_bias ?? 0;

    let leftRightDescription = 'Balanced - good field coverage';
    if (leftRightBias < -0.2) {
      leftRightDescription = 'Left-side dominant - practice right-field tracking';
    } else if (leftRightBias > 0.2) {
      leftRightDescription = 'Right-side dominant - practice left-field tracking';
    }

    let earlyLateDescription = 'On-time reactions - excellent timing';
    if (earlyLateBias < -0.2) {
      earlyLateDescription = 'Early reactions - work on patience at the plate';
    } else if (earlyLateBias > 0.2) {
      earlyLateDescription = 'Late reactions - focus on earlier read recognition';
    }

    return {
      left_right_bias: leftRightBias,
      early_late_bias: earlyLateBias,
      left_right_description: leftRightDescription,
      early_late_description: earlyLateDescription,
    };
  }, [metrics]);

  // Check for plateau
  const checkForPlateau = useCallback((): PlateauStatus => {
    if (!metrics?.metrics_history || metrics.metrics_history.length < 14) {
      return {
        detected: false,
        detected_at: null,
        metric_stagnant: null,
        recommendation: 'Keep training to build a performance baseline',
      };
    }

    const recentHistory = metrics.metrics_history.slice(0, 14);
    const metricKeys: (keyof MetricsHistoryEntry)[] = [
      'neuro_reaction_index',
      'visual_processing_speed',
      'anticipation_quotient',
      'coordination_efficiency',
    ];

    for (const key of metricKeys) {
      const values = recentHistory
        .map(h => h[key])
        .filter((v): v is number => v !== null);
      
      if (values.length < 7) continue;

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // If standard deviation is very low (<2), consider it a plateau
      if (stdDev < 2 && mean < 90) {
        return {
          detected: true,
          detected_at: new Date().toISOString(),
          metric_stagnant: key,
          recommendation: `Your ${key.replace(/_/g, ' ')} has plateaued. Try increasing difficulty or trying new drill variations.`,
        };
      }
    }

    return {
      detected: false,
      detected_at: null,
      metric_stagnant: null,
      recommendation: 'Great progress! Keep up the consistent training.',
    };
  }, [metrics]);

  // Get metrics history for charting
  const getMetricsHistory = useCallback((days: number = 30): MetricsHistoryEntry[] => {
    if (!metrics?.metrics_history) return [];
    return metrics.metrics_history.slice(0, days);
  }, [metrics]);

  // Initial fetch
  useEffect(() => {
    const initialize = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await fetchMetrics();
      setLoading(false);
    };

    initialize();
  }, [user, fetchMetrics]);

  return {
    metrics,
    loading,
    fetchMetrics,
    calculateMetricsFromResults,
    updateMetrics,
    analyzeBiases,
    checkForPlateau,
    getMetricsHistory,
    refetch: fetchMetrics,
  };
};
