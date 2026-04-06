import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

export type VitaminTiming = 
  | 'morning' 
  | 'with_breakfast' 
  | 'with_lunch' 
  | 'with_dinner' 
  | 'evening' 
  | 'before_bed';

export type VitaminCategory =
  | 'vitamin'
  | 'mineral'
  | 'supplement'
  | 'herb'
  | 'protein'
  | 'amino_acid';

export type VitaminUnit =
  | 'mg'
  | 'mcg'
  | 'IU'
  | 'g'
  | 'ml'
  | 'capsule'
  | 'tablet'
  | 'serving';

export interface VitaminLog {
  id: string;
  userId: string;
  entryDate: string;
  vitaminName: string;
  dosage: string | null;
  timing: VitaminTiming | null;
  takenAt: string | null;
  taken: boolean;
  isRecurring: boolean;
  category: VitaminCategory;
  unit: VitaminUnit;
  purpose: string | null;
  createdAt: string;
}

export interface CreateVitaminInput {
  vitaminName: string;
  dosage?: string;
  timing?: VitaminTiming;
  isRecurring?: boolean;
  entryDate?: string;
  category?: VitaminCategory;
  unit?: VitaminUnit;
  purpose?: string;
}

export interface WeeklyAdherence {
  date: string;
  taken: number;
  total: number;
}

function mapVitamin(data: any): VitaminLog {
  return {
    id: data.id,
    userId: data.user_id,
    entryDate: data.entry_date,
    vitaminName: data.vitamin_name,
    dosage: data.dosage,
    timing: data.timing as VitaminTiming | null,
    takenAt: data.taken_at,
    taken: data.taken || false,
    isRecurring: data.is_recurring || false,
    category: (data.category as VitaminCategory) || 'supplement',
    unit: (data.unit as VitaminUnit) || 'mg',
    purpose: data.purpose || null,
    createdAt: data.created_at
  };
}

export function useVitaminLogs(date?: Date) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const targetDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  // Fetch vitamins via react-query
  const { data: vitamins = [], isLoading: loading } = useQuery({
    queryKey: ['vitaminLogs', targetDate, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('vault_vitamin_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', targetDate)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapVitamin);
    },
    enabled: !!user?.id,
  });

  // Weekly adherence via react-query
  const { data: weeklyAdherence = [] } = useQuery({
    queryKey: ['vitaminAdherence', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const days: WeeklyAdherence[] = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = subDays(today, i);
        const dateStr = format(d, 'yyyy-MM-dd');
        days.push({ date: dateStr, taken: 0, total: 0 });
      }
      const { data } = await supabase
        .from('vault_vitamin_logs')
        .select('entry_date, taken')
        .eq('user_id', user.id)
        .gte('entry_date', days[0].date)
        .lte('entry_date', days[6].date);
      if (data) {
        data.forEach(row => {
          const day = days.find(d => d.date === row.entry_date);
          if (day) {
            day.total += 1;
            if (row.taken) day.taken += 1;
          }
        });
      }
      return days;
    },
    enabled: !!user?.id,
  });

  const todayVitamins = targetDate === format(new Date(), 'yyyy-MM-dd') ? vitamins : [];

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['vitaminLogs'] });
    queryClient.invalidateQueries({ queryKey: ['vitaminAdherence'] });
  }, [queryClient]);

  const addVitamin = async (input: CreateVitaminInput): Promise<VitaminLog | null> => {
    if (!user?.id) return null;
    try {
      const { data, error } = await supabase
        .from('vault_vitamin_logs')
        .insert({
          user_id: user.id,
          entry_date: input.entryDate || targetDate,
          vitamin_name: input.vitaminName,
          dosage: input.dosage,
          timing: input.timing,
          is_recurring: input.isRecurring || false,
          taken: false,
          category: input.category || 'supplement',
          unit: input.unit || 'mg',
          purpose: input.purpose || null,
        })
        .select()
        .single();
      if (error) throw error;
      invalidateAll();
      toast.success('Supplement added');
      return mapVitamin(data);
    } catch (error) {
      console.error('Error adding vitamin:', error);
      toast.error('Failed to add supplement');
      return null;
    }
  };

  const updateVitamin = async (vitaminId: string, fields: { dosage?: string; timing?: VitaminTiming }): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const { error } = await supabase
        .from('vault_vitamin_logs')
        .update(fields)
        .eq('id', vitaminId)
        .eq('user_id', user.id);
      if (error) throw error;
      invalidateAll();
      toast.success('Updated');
      return true;
    } catch (error) {
      console.error('Error updating vitamin:', error);
      toast.error('Failed to update');
      return false;
    }
  };

  const markVitaminTaken = async (vitaminId: string, taken: boolean = true): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const { error } = await supabase
        .from('vault_vitamin_logs')
        .update({ taken, taken_at: taken ? new Date().toISOString() : null })
        .eq('id', vitaminId)
        .eq('user_id', user.id);
      if (error) throw error;
      invalidateAll();
      return true;
    } catch (error) {
      console.error('Error updating vitamin:', error);
      toast.error('Failed to update');
      return false;
    }
  };

  const deleteVitamin = async (vitaminId: string): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const { error } = await supabase
        .from('vault_vitamin_logs')
        .delete()
        .eq('id', vitaminId)
        .eq('user_id', user.id);
      if (error) throw error;
      invalidateAll();
      toast.success('Supplement removed');
      return true;
    } catch (error) {
      console.error('Error deleting vitamin:', error);
      toast.error('Failed to remove');
      return false;
    }
  };

  const takenCount = vitamins.filter(v => v.taken).length;
  const totalCount = vitamins.length;
  const allTaken = totalCount > 0 && takenCount === totalCount;

  return {
    vitamins,
    todayVitamins,
    weeklyAdherence,
    loading,
    addVitamin,
    updateVitamin,
    markVitaminTaken,
    deleteVitamin,
    takenCount,
    totalCount,
    allTaken,
    refetch: invalidateAll
  };
}
