import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DrillResult {
  id: string;
  user_id: string;
  session_id: string;
  drill_type: string;
  tier: string;
  accuracy_percent: number | null;
  reaction_time_ms: number | null;
  false_positives: number | null;
  fatigue_score: number | null;
  difficulty_level: number | null;
  drill_metrics: Record<string, unknown> | null;
  completed_at: string | null;
}

export interface DrillStats {
  drill_type: string;
  total_completions: number;
  average_accuracy: number;
  best_accuracy: number;
  average_reaction_time: number;
  best_reaction_time: number;
  last_completed: string | null;
}

export interface RecommendedDrill {
  drill_type: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

const DRILL_TYPES = [
  'soft_focus',
  'pattern_search',
  'peripheral_vision',
  'convergence_divergence',
  'near_far_sight',
  'follow_target',
  'whack_a_mole',
  'meter_timing',
  'brock_string',
];

export const useTexVisionDrills = (sport: string = 'baseball') => {
  const { user } = useAuth();
  const [drillResults, setDrillResults] = useState<DrillResult[]>([]);
  const [drillStats, setDrillStats] = useState<DrillStats[]>([]);
  const [todaysDrills, setTodaysDrills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch drill results with optional filtering
  const fetchDrillResults = useCallback(async (drillType?: string, limit: number = 50) => {
    if (!user) return [];

    try {
      let query = supabase
        .from('tex_vision_drill_results')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (drillType) {
        query = query.eq('drill_type', drillType);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const results = (data || []).map(d => ({
        ...d,
        drill_metrics: d.drill_metrics as Record<string, unknown> | null,
      })) as DrillResult[];
      
      setDrillResults(results);
      return results;
    } catch (error) {
      console.error('Error fetching drill results:', error);
      return [];
    }
  }, [user]);

  // Calculate aggregate stats per drill type
  const calculateDrillStats = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('tex_vision_drill_results')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const statsByDrill: Record<string, DrillStats> = {};

      DRILL_TYPES.forEach(drillType => {
        statsByDrill[drillType] = {
          drill_type: drillType,
          total_completions: 0,
          average_accuracy: 0,
          best_accuracy: 0,
          average_reaction_time: 0,
          best_reaction_time: Infinity,
          last_completed: null,
        };
      });

      (data || []).forEach(result => {
        const stat = statsByDrill[result.drill_type];
        if (!stat) return;

        stat.total_completions++;
        
        if (result.accuracy_percent !== null) {
          stat.average_accuracy = 
            (stat.average_accuracy * (stat.total_completions - 1) + result.accuracy_percent) / 
            stat.total_completions;
          stat.best_accuracy = Math.max(stat.best_accuracy, result.accuracy_percent);
        }

        if (result.reaction_time_ms !== null) {
          stat.average_reaction_time = 
            (stat.average_reaction_time * (stat.total_completions - 1) + result.reaction_time_ms) / 
            stat.total_completions;
          stat.best_reaction_time = Math.min(stat.best_reaction_time, result.reaction_time_ms);
        }

        if (!stat.last_completed || (result.completed_at && result.completed_at > stat.last_completed)) {
          stat.last_completed = result.completed_at;
        }
      });

      // Clean up infinity values
      Object.values(statsByDrill).forEach(stat => {
        if (stat.best_reaction_time === Infinity) {
          stat.best_reaction_time = 0;
        }
      });

      const statsArray = Object.values(statsByDrill);
      setDrillStats(statsArray);
      return statsArray;
    } catch (error) {
      console.error('Error calculating drill stats:', error);
      return [];
    }
  }, [user]);

  // Get recommended drills based on weaknesses
  const getRecommendedDrills = useCallback((): RecommendedDrill[] => {
    const recommendations: RecommendedDrill[] = [];

    // Find drills never completed (high priority)
    const neverCompleted = drillStats.filter(s => s.total_completions === 0);
    neverCompleted.forEach(stat => {
      recommendations.push({
        drill_type: stat.drill_type,
        reason: 'Never attempted - try this drill!',
        priority: 'high',
      });
    });

    // Find drills with low accuracy (medium priority)
    const lowAccuracy = drillStats.filter(
      s => s.total_completions > 0 && s.average_accuracy < 70
    );
    lowAccuracy.forEach(stat => {
      recommendations.push({
        drill_type: stat.drill_type,
        reason: `Low accuracy (${stat.average_accuracy.toFixed(0)}%) - needs practice`,
        priority: 'medium',
      });
    });

    // Find drills not done recently (low priority)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const stale = drillStats.filter(s => {
      if (s.total_completions === 0) return false;
      if (!s.last_completed) return true;
      return new Date(s.last_completed) < oneWeekAgo;
    });
    
    stale.forEach(stat => {
      if (!recommendations.some(r => r.drill_type === stat.drill_type)) {
        recommendations.push({
          drill_type: stat.drill_type,
          reason: 'Not practiced recently',
          priority: 'low',
        });
      }
    });

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }, [drillStats]);

  // Get today's completed drills
  const fetchTodaysDrills = useCallback(async () => {
    if (!user) return [];

    const today = new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('tex_vision_drill_results')
        .select('drill_type')
        .eq('user_id', user.id)
        .gte('completed_at', `${today}T00:00:00`)
        .lt('completed_at', `${today}T23:59:59`);

      if (error) throw error;

      const drillTypes = [...new Set((data || []).map(d => d.drill_type))];
      setTodaysDrills(drillTypes);
      return drillTypes;
    } catch (error) {
      console.error('Error fetching today\'s drills:', error);
      return [];
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    const initialize = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await Promise.all([
        fetchDrillResults(),
        calculateDrillStats(),
        fetchTodaysDrills(),
      ]);
      setLoading(false);
    };

    initialize();
  }, [user, fetchDrillResults, calculateDrillStats, fetchTodaysDrills]);

  return {
    drillResults,
    drillStats,
    todaysDrills,
    loading,
    fetchDrillResults,
    calculateDrillStats,
    getRecommendedDrills,
    fetchTodaysDrills,
    refetch: async () => {
      await Promise.all([
        fetchDrillResults(),
        calculateDrillStats(),
        fetchTodaysDrills(),
      ]);
    },
  };
};
