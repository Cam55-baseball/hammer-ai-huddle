import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SubscriptionData {
  subscribed: boolean;
  modules: string[];
  subscription_end: string | null;
  loading: boolean;
  initialized: boolean;
  has_discount?: boolean;
  discount_percent?: number | null;
}

export const useSubscription = () => {
  const { user, session } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    subscribed: false,
    modules: [],
    subscription_end: null,
    loading: true,
    initialized: false,
    has_discount: false,
    discount_percent: null,
  });

  const checkSubscription = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!user || !session) {
      setSubscriptionData({
        subscribed: false,
        modules: [],
        subscription_end: null,
        loading: false,
        initialized: false,
        has_discount: false,
        discount_percent: null,
      });
      return;
    }

    // Only set loading to true for non-silent refreshes
    if (!options.silent) {
      setSubscriptionData(prev => ({ ...prev, loading: true }));
    }

    try {
      let modules: string[] = [];
      let subscribed = false;
      let subscription_end: string | null = null;
      let has_discount = false;
      let discount_percent: number | null = null;

      // Try edge function first
      try {
        const { data, error } = await supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!error && data) {
          subscribed = data.subscribed || false;
          modules = data.modules || [];
          subscription_end = data.subscription_end || null;
          has_discount = data.has_discount || false;
          discount_percent = data.discount_percent || null;
        } else {
          throw error || new Error('No data returned from edge function');
        }
      } catch (edgeFunctionError) {
        console.warn('Edge function failed, falling back to database:', edgeFunctionError);
        
        // Database fallback
        const { data: subRow, error: dbError } = await supabase
          .from('subscriptions')
          .select('status, subscribed_modules, current_period_end')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!dbError && subRow) {
          subscribed = subRow.status === 'active';
          modules = subRow.subscribed_modules || [];
          subscription_end = subRow.current_period_end || null;
          console.log('Using database fallback:', { subscribed, modules, subscription_end });
        }
      }

      // Normalize modules: deduplicate and filter falsy values
      const normalizedModules = Array.from(new Set((modules || []).filter(Boolean)));

      setSubscriptionData({
        subscribed,
        modules: normalizedModules,
        subscription_end,
        loading: false,
        initialized: true,
        has_discount,
        discount_percent,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionData({
        subscribed: false,
        modules: [],
        subscription_end: null,
        loading: false,
        initialized: true,
        has_discount: false,
        discount_percent: null,
      });
    }
  }, [user?.id, session?.access_token]);

  useEffect(() => {
    // Initial check without silent flag
    checkSubscription({ silent: false });

    // Auto-refresh every 2 minutes with silent flag to prevent UI flicker
    const interval = setInterval(() => checkSubscription({ silent: true }), 120000);

    return () => clearInterval(interval);
  }, [checkSubscription]);

  return {
    ...subscriptionData,
    refetch: () => checkSubscription({ silent: false }),
  };
};
