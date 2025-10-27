import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionData {
  subscribed: boolean;
  modules: string[]; // Format: ['baseball_hitting', 'softball_pitching']
  subscription_end: string | null;
  loading: boolean;
  initialized: boolean;
  has_discount?: boolean;
  discount_percent?: number | null;
}

export const useSubscription = () => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    subscribed: false,
    modules: [],
    subscription_end: null,
    loading: true,
    initialized: false,
    has_discount: false,
    discount_percent: null,
  });

  const hasModuleForSport = useCallback((module: string, sport: string) => {
    const key = `${sport}_${module}`;
    return subscriptionData.modules.includes(key);
  }, [subscriptionData.modules]);

  const checkSubscription = useCallback(async (silent: boolean = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setSubscriptionData({
          subscribed: false,
          modules: [],
          subscription_end: null,
          loading: false,
          initialized: true,
          has_discount: false,
          discount_percent: null,
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!error && data) {
        setSubscriptionData({
          subscribed: data.subscribed || false,
          modules: data.modules || [],
          subscription_end: data.subscription_end || null,
          loading: false,
          initialized: true,
          has_discount: data.has_discount || false,
          discount_percent: data.discount_percent || null,
        });
      } else {
        console.error('Error fetching subscription:', error);
        
        // Fallback to database query
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (fallbackData && !fallbackError) {
            const isActive = fallbackData.status === 'active';
            setSubscriptionData({
              subscribed: isActive,
              modules: fallbackData.subscribed_modules || [],
              subscription_end: fallbackData.current_period_end || null,
              loading: false,
              initialized: true,
              has_discount: false,
              discount_percent: null,
            });
          } else {
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
        } catch (fallbackError) {
          console.error('Fallback query failed:', fallbackError);
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
      }
    } catch (error) {
      console.error('Error in checkSubscription:', error);
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
  }, []);

  useEffect(() => {
    checkSubscription(false);
    
    // Silent refresh every minute
    const interval = setInterval(() => {
      checkSubscription(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [checkSubscription]);

  const refetch = () => checkSubscription(false);

  return { ...subscriptionData, refetch, hasModuleForSport };
};
