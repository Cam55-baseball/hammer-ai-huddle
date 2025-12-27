import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { GoalType } from '@/utils/tdeeCalculations';

export interface AthleteBodyGoal {
  id: string;
  userId: string;
  goalType: GoalType;
  startingWeightLbs: number | null;
  targetWeightLbs: number | null;
  targetBodyFatPercent: number | null;
  weeklyChangeRate: number;
  startedAt: string;
  targetDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateGoalInput {
  goalType: GoalType;
  startingWeightLbs?: number;
  targetWeightLbs?: number;
  targetBodyFatPercent?: number;
  weeklyChangeRate?: number;
  targetDate?: string;
}

export function useAthleteGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<AthleteBodyGoal[]>([]);
  const [activeGoal, setActiveGoal] = useState<AthleteBodyGoal | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('athlete_body_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedGoals: AthleteBodyGoal[] = (data || []).map((g) => ({
        id: g.id,
        userId: g.user_id,
        goalType: g.goal_type as GoalType,
        startingWeightLbs: g.starting_weight_lbs,
        targetWeightLbs: g.target_weight_lbs,
        targetBodyFatPercent: g.target_body_fat_percent,
        weeklyChangeRate: g.weekly_change_rate || 1,
        startedAt: g.started_at,
        targetDate: g.target_date,
        isActive: g.is_active || false,
        createdAt: g.created_at
      }));

      setGoals(mappedGoals);
      setActiveGoal(mappedGoals.find(g => g.isActive) || null);
    } catch (error) {
      console.error('Error fetching athlete goals:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const createGoal = async (input: CreateGoalInput): Promise<AthleteBodyGoal | null> => {
    if (!user?.id) return null;

    try {
      // Deactivate any existing active goals
      await supabase
        .from('athlete_body_goals')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_active', true);

      const { data, error } = await supabase
        .from('athlete_body_goals')
        .insert({
          user_id: user.id,
          goal_type: input.goalType,
          starting_weight_lbs: input.startingWeightLbs,
          target_weight_lbs: input.targetWeightLbs,
          target_body_fat_percent: input.targetBodyFatPercent,
          weekly_change_rate: input.weeklyChangeRate || 1,
          target_date: input.targetDate,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      const newGoal: AthleteBodyGoal = {
        id: data.id,
        userId: data.user_id,
        goalType: data.goal_type as GoalType,
        startingWeightLbs: data.starting_weight_lbs,
        targetWeightLbs: data.target_weight_lbs,
        targetBodyFatPercent: data.target_body_fat_percent,
        weeklyChangeRate: data.weekly_change_rate || 1,
        startedAt: data.started_at,
        targetDate: data.target_date,
        isActive: data.is_active || false,
        createdAt: data.created_at
      };

      await fetchGoals();
      toast.success('Body composition goal set!');
      return newGoal;
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to set goal');
      return null;
    }
  };

  const updateGoal = async (
    goalId: string, 
    updates: Partial<CreateGoalInput>
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('athlete_body_goals')
        .update({
          ...(updates.goalType && { goal_type: updates.goalType }),
          ...(updates.targetWeightLbs !== undefined && { target_weight_lbs: updates.targetWeightLbs }),
          ...(updates.targetBodyFatPercent !== undefined && { target_body_fat_percent: updates.targetBodyFatPercent }),
          ...(updates.weeklyChangeRate !== undefined && { weekly_change_rate: updates.weeklyChangeRate }),
          ...(updates.targetDate !== undefined && { target_date: updates.targetDate }),
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchGoals();
      toast.success('Goal updated');
      return true;
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal');
      return false;
    }
  };

  const deactivateGoal = async (goalId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('athlete_body_goals')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchGoals();
      toast.success('Goal deactivated');
      return true;
    } catch (error) {
      console.error('Error deactivating goal:', error);
      toast.error('Failed to deactivate goal');
      return false;
    }
  };

  return {
    goals,
    activeGoal,
    loading,
    createGoal,
    updateGoal,
    deactivateGoal,
    refetch: fetchGoals
  };
}
