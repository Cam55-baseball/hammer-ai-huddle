import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getDay } from 'date-fns';

export interface SkippedItem {
  id: string;
  item_id: string;
  item_type: string;
  skip_days: number[];
}

export function useCalendarSkips() {
  const { user } = useAuth();
  const [skippedItems, setSkippedItems] = useState<SkippedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all skipped items for the user
  const fetchSkippedItems = useCallback(async () => {
    if (!user) {
      setSkippedItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('calendar_skipped_items')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching skipped items:', error);
        return;
      }

      setSkippedItems(data || []);
    } catch (err) {
      console.error('Error in fetchSkippedItems:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSkippedItems();
  }, [fetchSkippedItems]);

  // Check if an item is skipped for a specific day of the week
  const isSkippedForDay = useCallback((
    itemId: string, 
    itemType: string, 
    date: Date
  ): boolean => {
    const dayOfWeek = getDay(date);
    const skipRecord = skippedItems.find(
      s => s.item_id === itemId && s.item_type === itemType
    );
    return skipRecord?.skip_days?.includes(dayOfWeek) ?? false;
  }, [skippedItems]);

  // Get skip days for an item
  const getSkipDays = useCallback((
    itemId: string, 
    itemType: string
  ): number[] => {
    const skipRecord = skippedItems.find(
      s => s.item_id === itemId && s.item_type === itemType
    );
    return skipRecord?.skip_days || [];
  }, [skippedItems]);

  // Update skip days for an item (create/update)
  const updateSkipDays = useCallback(async (
    itemId: string, 
    itemType: string, 
    skipDays: number[]
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // If empty skip days, remove the record entirely
      if (skipDays.length === 0) {
        return await removeSkip(itemId, itemType);
      }

      const { error } = await supabase
        .from('calendar_skipped_items')
        .upsert({
          user_id: user.id,
          item_id: itemId,
          item_type: itemType,
          skip_days: skipDays,
        }, { 
          onConflict: 'user_id,item_id,item_type' 
        });

      if (error) {
        console.error('Error updating skip days:', error);
        return false;
      }

      // Optimistically update local state
      setSkippedItems(prev => {
        const existing = prev.findIndex(
          s => s.item_id === itemId && s.item_type === itemType
        );
        
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], skip_days: skipDays };
          return updated;
        }
        
        return [...prev, {
          id: 'temp-' + Date.now(),
          item_id: itemId,
          item_type: itemType,
          skip_days: skipDays,
        }];
      });

      return true;
    } catch (err) {
      console.error('Error in updateSkipDays:', err);
      return false;
    }
  }, [user]);

  // Remove all skips for an item (un-skip completely)
  const removeSkip = useCallback(async (
    itemId: string, 
    itemType: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('calendar_skipped_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId)
        .eq('item_type', itemType);

      if (error) {
        console.error('Error removing skip:', error);
        return false;
      }

      // Optimistically update local state
      setSkippedItems(prev => 
        prev.filter(s => !(s.item_id === itemId && s.item_type === itemType))
      );

      return true;
    } catch (err) {
      console.error('Error in removeSkip:', err);
      return false;
    }
  }, [user]);

  // Un-skip for a specific day only (keep other skip days)
  const unskipForDay = useCallback(async (
    itemId: string,
    itemType: string,
    dayOfWeek: number
  ): Promise<boolean> => {
    const currentDays = getSkipDays(itemId, itemType);
    const newDays = currentDays.filter(d => d !== dayOfWeek);
    return await updateSkipDays(itemId, itemType, newDays);
  }, [getSkipDays, updateSkipDays]);

  return {
    skippedItems,
    loading,
    isSkippedForDay,
    getSkipDays,
    updateSkipDays,
    removeSkip,
    unskipForDay,
    refetch: fetchSkippedItems,
  };
}
