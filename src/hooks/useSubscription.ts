import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SubscriptionData {
  subscribed: boolean;
  modules: string[];
  subscription_end: string | null;
  loading: boolean;
}

export const useSubscription = () => {
  const { user, session } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    subscribed: false,
    modules: [],
    subscription_end: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!user || !session) {
      setSubscriptionData({
        subscribed: false,
        modules: [],
        subscription_end: null,
        loading: false,
      });
      return;
    }

    // Ensure loading state is accurate for manual refetches
    setSubscriptionData(prev => ({ ...prev, loading: true }));

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setSubscriptionData({
        subscribed: data.subscribed || false,
        modules: data.modules || [],
        subscription_end: data.subscription_end || null,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionData({
        subscribed: false,
        modules: [],
        subscription_end: null,
        loading: false,
      });
    }
  }, [user?.id, session?.access_token]);

  useEffect(() => {
    checkSubscription();

    // Auto-refresh every 30 seconds for faster subscription updates
    const interval = setInterval(checkSubscription, 30000);

    return () => clearInterval(interval);
  }, [checkSubscription]);

  return {
    ...subscriptionData,
    refetch: checkSubscription,
  };
};
