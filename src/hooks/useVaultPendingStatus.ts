import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface VaultPendingStatus {
  hasPendingItems: boolean;
  pendingCount: number;
  loading: boolean;
}

export function useVaultPendingStatus(): VaultPendingStatus {
  const { user } = useAuth();
  const [hasPendingItems, setHasPendingItems] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const checkPendingItems = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let count = 0;

      // Check for incomplete daily quizzes (pre_lift, morning, night)
      const { data: quizzes } = await supabase
        .from('vault_focus_quizzes')
        .select('quiz_type')
        .eq('user_id', user.id)
        .eq('entry_date', today);

      const completedTypes = new Set(quizzes?.map(q => q.quiz_type) || []);
      const requiredTypes = ['pre_lift', 'morning', 'night'];
      const missingQuizzes = requiredTypes.filter(t => !completedTypes.has(t));
      count += missingQuizzes.length;

      // Check for performance tests due (every 6 weeks)
      const { data: lastPerfTest } = await supabase
        .from('vault_performance_tests')
        .select('next_entry_date')
        .eq('user_id', user.id)
        .order('test_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastPerfTest || !lastPerfTest.next_entry_date || new Date(lastPerfTest.next_entry_date) <= new Date()) {
        count += 1;
      }

      // Check for progress photos due (every 6 weeks)
      const { data: lastPhoto } = await supabase
        .from('vault_progress_photos')
        .select('next_entry_date')
        .eq('user_id', user.id)
        .order('photo_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastPhoto || !lastPhoto.next_entry_date || new Date(lastPhoto.next_entry_date) <= new Date()) {
        count += 1;
      }

      // Check for scout grades due (already has next_prompt_date)
      const { data: lastGrade } = await supabase
        .from('vault_scout_grades')
        .select('next_prompt_date')
        .eq('user_id', user.id)
        .order('graded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastGrade || !lastGrade.next_prompt_date || new Date(lastGrade.next_prompt_date) <= new Date()) {
        count += 1;
      }

      setPendingCount(count);
      setHasPendingItems(count > 0);
    } catch (err) {
      console.error('Error checking vault pending status:', err);
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    checkPendingItems();
    
    // Refresh every 5 minutes
    const interval = setInterval(checkPendingItems, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkPendingItems]);

  return { hasPendingItems, pendingCount, loading };
}
