import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export type VitaminTiming = 
  | 'morning' 
  | 'with_breakfast' 
  | 'with_lunch' 
  | 'with_dinner' 
  | 'evening' 
  | 'before_bed';

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
  createdAt: string;
}

export interface CreateVitaminInput {
  vitaminName: string;
  dosage?: string;
  timing?: VitaminTiming;
  isRecurring?: boolean;
  entryDate?: string;
}

export function useVitaminLogs(date?: Date) {
  const { user } = useAuth();
  const [vitamins, setVitamins] = useState<VitaminLog[]>([]);
  const [todayVitamins, setTodayVitamins] = useState<VitaminLog[]>([]);
  const [loading, setLoading] = useState(true);

  const targetDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  const fetchVitamins = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Fetch vitamins for the target date
      const { data, error } = await supabase
        .from('vault_vitamin_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', targetDate)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedVitamins: VitaminLog[] = (data || []).map((v) => ({
        id: v.id,
        userId: v.user_id,
        entryDate: v.entry_date,
        vitaminName: v.vitamin_name,
        dosage: v.dosage,
        timing: v.timing as VitaminTiming | null,
        takenAt: v.taken_at,
        taken: v.taken || false,
        isRecurring: v.is_recurring || false,
        createdAt: v.created_at
      }));

      setVitamins(mappedVitamins);
      
      // Also set today's vitamins
      const today = format(new Date(), 'yyyy-MM-dd');
      if (targetDate === today) {
        setTodayVitamins(mappedVitamins);
      }
    } catch (error) {
      console.error('Error fetching vitamin logs:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, targetDate]);

  // Generate recurring vitamins for today if they don't exist
  const generateRecurringVitamins = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get all recurring vitamins from the most recent entry
      const { data: recurring } = await supabase
        .from('vault_vitamin_logs')
        .select('vitamin_name, dosage, timing')
        .eq('user_id', user.id)
        .eq('is_recurring', true)
        .order('created_at', { ascending: false });

      if (!recurring || recurring.length === 0) return;

      // Check which ones already exist for today
      const { data: existing } = await supabase
        .from('vault_vitamin_logs')
        .select('vitamin_name')
        .eq('user_id', user.id)
        .eq('entry_date', targetDate);

      const existingNames = new Set((existing || []).map(e => e.vitamin_name));
      
      // Get unique recurring vitamins that don't exist for today
      const uniqueRecurring = new Map<string, typeof recurring[0]>();
      recurring.forEach(v => {
        if (!existingNames.has(v.vitamin_name) && !uniqueRecurring.has(v.vitamin_name)) {
          uniqueRecurring.set(v.vitamin_name, v);
        }
      });

      if (uniqueRecurring.size === 0) return;

      // Create entries for today
      const newEntries = Array.from(uniqueRecurring.values()).map(v => ({
        user_id: user.id,
        entry_date: targetDate,
        vitamin_name: v.vitamin_name,
        dosage: v.dosage,
        timing: v.timing,
        is_recurring: true,
        taken: false
      }));

      await supabase.from('vault_vitamin_logs').insert(newEntries);
      await fetchVitamins();
    } catch (error) {
      console.error('Error generating recurring vitamins:', error);
    }
  }, [user?.id, targetDate, fetchVitamins]);

  useEffect(() => {
    fetchVitamins();
  }, [fetchVitamins]);

  useEffect(() => {
    // Generate recurring vitamins for today
    const today = format(new Date(), 'yyyy-MM-dd');
    if (targetDate === today) {
      generateRecurringVitamins();
    }
  }, [targetDate, generateRecurringVitamins]);

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
          taken: false
        })
        .select()
        .single();

      if (error) throw error;

      await fetchVitamins();
      toast.success('Vitamin added');
      return mapVitamin(data);
    } catch (error) {
      console.error('Error adding vitamin:', error);
      toast.error('Failed to add vitamin');
      return null;
    }
  };

  const markVitaminTaken = async (vitaminId: string, taken: boolean = true): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('vault_vitamin_logs')
        .update({
          taken,
          taken_at: taken ? new Date().toISOString() : null
        })
        .eq('id', vitaminId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchVitamins();
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

      await fetchVitamins();
      toast.success('Vitamin removed');
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
    loading,
    addVitamin,
    markVitaminTaken,
    deleteVitamin,
    takenCount,
    totalCount,
    allTaken,
    refetch: fetchVitamins
  };
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
    createdAt: data.created_at
  };
}
