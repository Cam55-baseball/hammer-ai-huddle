import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ModuleDetails {
  subscription_id: string;
  status: 'active' | 'canceled' | 'past_due';
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  price_id: string;
  canceled_at: string | null;
}

export interface SubscriptionData {
  subscribed: boolean;
  modules: string[]; // Format: ['baseball_hitting', 'softball_pitching']
  module_details: Record<string, ModuleDetails>;
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
    module_details: {},
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

  const hasAccessForSport = useCallback((module: string, sport: string, isOwnerOrAdmin: boolean) => {
    if (isOwnerOrAdmin) return true;
    return hasModuleForSport(module, sport);
  }, [hasModuleForSport]);

  const checkSubscription = useCallback(async (silent: boolean = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setSubscriptionData({
          subscribed: false,
          modules: [],
          module_details: {},
          subscription_end: null,
          loading: false,
          initialized: true,
          has_discount: false,
          discount_percent: null,
        });
        return;
      }

      // First attempt: Call edge function with current session
      let { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // If we get an auth error (401), try refreshing the session and retry once
      if (error && (error.message?.includes('Authentication') || error.message?.includes('401'))) {
        console.log('[useSubscription] Auth error detected, attempting token refresh...');
        
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshData.session) {
            console.log('[useSubscription] Token refreshed successfully, retrying edge function...');
            
            // Retry with refreshed token
            const retryResult = await supabase.functions.invoke('check-subscription', {
              headers: {
                Authorization: `Bearer ${refreshData.session.access_token}`,
              },
            });
            
            data = retryResult.data;
            error = retryResult.error;
          } else {
            console.error('[useSubscription] Token refresh failed:', refreshError);
          }
        } catch (refreshError) {
          console.error('[useSubscription] Error during token refresh:', refreshError);
        }
      }

      if (!error && data) {
        setSubscriptionData({
          subscribed: data.subscribed || false,
          modules: data.modules || [],
          module_details: data.module_details || {},
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
              module_details: (fallbackData.module_subscription_mapping as unknown as Record<string, ModuleDetails>) || {},
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
              module_details: {},
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
            module_details: {},
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
        module_details: {},
        subscription_end: null,
        loading: false,
        initialized: true,
        has_discount: false,
        discount_percent: null,
      });
    }
  }, []);

  const getModuleDetails = useCallback((module: string, sport: string) => {
    const key = `${sport}_${module}`;
    return subscriptionData.module_details?.[key];
  }, [subscriptionData.module_details]);
  
  const getModuleStatus = useCallback((module: string, sport: string) => {
    const details = getModuleDetails(module, sport);
    if (!details) return 'not_subscribed';
    if (details.cancel_at_period_end) return 'canceling';
    return details.status;
  }, [getModuleDetails]);
  
  const hasPendingCancellation = useCallback((module: string, sport: string) => {
    const details = getModuleDetails(module, sport);
    return details?.cancel_at_period_end || false;
  }, [getModuleDetails]);

  useEffect(() => {
    checkSubscription(false);
    
    // Silent refresh every minute
    const interval = setInterval(() => {
      checkSubscription(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [checkSubscription]);

  const refetch = () => checkSubscription(false);

  return { 
    ...subscriptionData, 
    refetch, 
    hasModuleForSport, 
    hasAccessForSport,
    getModuleDetails,
    getModuleStatus,
    hasPendingCancellation
  };
};
