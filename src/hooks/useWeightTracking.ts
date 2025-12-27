import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAthleteGoals } from '@/hooks/useAthleteGoals';
import { toast } from 'sonner';
import { startOfWeek, addDays, differenceInDays, parseISO, format, subDays } from 'date-fns';

export interface WeightEntry {
  id: string;
  user_id: string;
  entry_date: string;
  weight_lbs: number;
  body_fat_percent: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface WeightStats {
  currentWeight: number | null;
  startingWeight: number | null;
  targetWeight: number | null;
  totalChange: number;
  weeklyAvgChange: number;
  projectedWeeks: number | null;
  onTrack: boolean;
}

export function useWeightTracking() {
  const { user } = useAuth();
  const { activeGoal } = useAthleteGoals();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WeightStats>({
    currentWeight: null,
    startingWeight: null,
    targetWeight: null,
    totalChange: 0,
    weeklyAvgChange: 0,
    projectedWeeks: null,
    onTrack: false,
  });

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;

      const typedData = (data || []) as WeightEntry[];
      setEntries(typedData);
      calculateStats(typedData);
    } catch (error) {
      console.error('Error fetching weight entries:', error);
      toast.error('Failed to load weight history');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const calculateStats = useCallback((data: WeightEntry[]) => {
    if (data.length === 0) {
      setStats({
        currentWeight: null,
        startingWeight: null,
        targetWeight: activeGoal?.targetWeightLbs || null,
        totalChange: 0,
        weeklyAvgChange: 0,
        projectedWeeks: null,
        onTrack: false,
      });
      return;
    }

    const sortedByDate = [...data].sort((a, b) => 
      new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
    );

    const currentWeight = data[0].weight_lbs;
    const startingWeight = activeGoal?.startingWeightLbs || sortedByDate[0].weight_lbs;
    const targetWeight = activeGoal?.targetWeightLbs || null;
    const totalChange = currentWeight - startingWeight;

    // Calculate weekly average change
    let weeklyAvgChange = 0;
    if (sortedByDate.length >= 2) {
      const firstEntry = sortedByDate[0];
      const lastEntry = sortedByDate[sortedByDate.length - 1];
      const daysDiff = differenceInDays(
        parseISO(lastEntry.entry_date),
        parseISO(firstEntry.entry_date)
      );
      if (daysDiff > 0) {
        const weightDiff = lastEntry.weight_lbs - firstEntry.weight_lbs;
        weeklyAvgChange = (weightDiff / daysDiff) * 7;
      }
    }

    // Calculate projected weeks to goal
    let projectedWeeks: number | null = null;
    let onTrack = false;
    
    if (targetWeight && weeklyAvgChange !== 0) {
      const remainingWeight = targetWeight - currentWeight;
      projectedWeeks = Math.abs(remainingWeight / weeklyAvgChange);
      
      // Check if on track (within 20% of expected rate)
      const expectedRate = activeGoal?.weeklyChangeRate || 1;
      onTrack = Math.abs(Math.abs(weeklyAvgChange) - expectedRate) <= expectedRate * 0.2;
    }

    setStats({
      currentWeight,
      startingWeight,
      targetWeight,
      totalChange,
      weeklyAvgChange,
      projectedWeeks,
      onTrack,
    });
  }, [activeGoal]);

  const addEntry = useCallback(async (
    weightLbs: number,
    bodyFatPercent?: number | null,
    notes?: string | null,
    entryDate?: string
  ): Promise<WeightEntry | null> => {
    if (!user) return null;

    try {
      const date = entryDate || format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('weight_entries')
        .upsert({
          user_id: user.id,
          entry_date: date,
          weight_lbs: weightLbs,
          body_fat_percent: bodyFatPercent,
          notes: notes,
        }, { onConflict: 'user_id,entry_date' })
        .select()
        .single();

      if (error) throw error;

      toast.success('Weight logged successfully');
      await fetchEntries();
      return data as WeightEntry;
    } catch (error) {
      console.error('Error adding weight entry:', error);
      toast.error('Failed to log weight');
      return null;
    }
  }, [user, fetchEntries]);

  const updateEntry = useCallback(async (
    entryId: string,
    updates: Partial<Pick<WeightEntry, 'weight_lbs' | 'body_fat_percent' | 'notes'>>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('weight_entries')
        .update(updates)
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Entry updated');
      await fetchEntries();
      return true;
    } catch (error) {
      console.error('Error updating weight entry:', error);
      toast.error('Failed to update entry');
      return false;
    }
  }, [user, fetchEntries]);

  const deleteEntry = useCallback(async (entryId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('weight_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Entry deleted');
      await fetchEntries();
      return true;
    } catch (error) {
      console.error('Error deleting weight entry:', error);
      toast.error('Failed to delete entry');
      return false;
    }
  }, [user, fetchEntries]);

  // Generate projected data points for chart
  const getProjectedData = useCallback(() => {
    if (!stats.currentWeight || !stats.targetWeight || !activeGoal?.weeklyChangeRate) {
      return [];
    }

    const projectedPoints: { date: string; projected: number }[] = [];
    let currentProjected = stats.currentWeight;
    const weeklyChange = activeGoal.goalType === 'lose_weight' || activeGoal.goalType === 'lose_fat'
      ? -activeGoal.weeklyChangeRate
      : activeGoal.weeklyChangeRate;

    const today = new Date();
    let weeksFromNow = 0;
    const maxWeeks = 52; // Max 1 year projection

    while (weeksFromNow <= maxWeeks) {
      const date = format(addDays(today, weeksFromNow * 7), 'yyyy-MM-dd');
      projectedPoints.push({
        date,
        projected: Math.round(currentProjected * 10) / 10,
      });

      if (activeGoal.goalType === 'lose_weight' || activeGoal.goalType === 'lose_fat') {
        if (currentProjected <= stats.targetWeight) break;
      } else if (activeGoal.goalType === 'gain_weight' || activeGoal.goalType === 'gain_lean_muscle') {
        if (currentProjected >= stats.targetWeight) break;
      } else {
        break; // maintain doesn't need projection
      }

      currentProjected += weeklyChange;
      weeksFromNow++;
    }

    return projectedPoints;
  }, [stats, activeGoal]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    stats,
    loading,
    addEntry,
    updateEntry,
    deleteEntry,
    refetch: fetchEntries,
    getProjectedData,
  };
}
