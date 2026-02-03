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
  
  const [prevModules, setPrevModules] = useState<string[]>([]);
  const [onChangeCallbacks, setOnChangeCallbacks] = useState<((newModules: string[]) => void)[]>([]);
  const [fastPolling, setFastPolling] = useState(false);

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
      let { data, error } = await supabase.functions.invoke('check-subscription');
      let authFailed = false;

      // If we get an auth error (401), try refreshing the session and retry once
      if (error && (error.message?.includes('Authentication') || error.message?.includes('401') || error.message?.includes('Invalid or expired token'))) {
        console.log('[useSubscription] Auth error detected, attempting token refresh...');
        
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshData.session) {
            console.log('[useSubscription] Token refreshed successfully, retrying edge function...');
            
            // Retry with refreshed token
            const retryResult = await supabase.functions.invoke('check-subscription');
            
            data = retryResult.data;
            error = retryResult.error;
            
            // If still auth error after refresh, mark as failed
            if (error && (error.message?.includes('Authentication') || error.message?.includes('401'))) {
              authFailed = true;
            }
          } else {
            console.warn('[useSubscription] Token refresh failed, will use database fallback:', refreshError?.message);
            authFailed = true;
          }
        } catch (refreshError) {
          console.error('[useSubscription] Error during token refresh:', refreshError);
          authFailed = true;
        }
      }

      // Handle intermittent 404 NOT_FOUND from function deployments/cold starts with up to 3 retries
      let retries = 0;
      while (
        retries < 3 &&
        error &&
        (error.message?.includes('NOT_FOUND') || error.message?.includes('not found') || (error as any)?.status === 404)
      ) {
        retries++;
        const delay = 500 * retries; // 500ms, 1000ms, 1500ms
        console.warn(`[useSubscription] Function not found (404). Retry ${retries}/3 after ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        const retry404 = await supabase.functions.invoke('check-subscription');
        data = retry404.data;
        error = retry404.error;
      }

      // Check if we still have a 404 after all retries - treat as non-fatal
      const is404Error = error && (
        error.message?.includes('NOT_FOUND') || 
        error.message?.includes('not found') || 
        (error as any)?.status === 404
      );
      
      if (is404Error) {
        console.warn('[useSubscription] Function still unavailable after retries, using database fallback');
        // Fall through to the fallback logic below - don't treat as critical error
      }

      if (!error && data) {
        const newModules = data.modules || [];
        
        setSubscriptionData({
          subscribed: data.subscribed || false,
          modules: newModules,
          module_details: data.module_details || {},
          subscription_end: data.subscription_end || null,
          loading: false,
          initialized: true,
          has_discount: data.has_discount || false,
          discount_percent: data.discount_percent || null,
        });
        
        // Detect module changes and trigger callbacks
        if (prevModules.length > 0 && newModules.length > prevModules.length) {
          console.log('[useSubscription] New modules detected:', newModules);
          onChangeCallbacks.forEach(callback => callback(newModules));
        }
        setPrevModules(newModules);
      } else {
        // Log as warning for 404s and auth failures (transient), error for other issues
        if (is404Error || authFailed) {
          console.warn('[useSubscription] Edge function unavailable or auth failed, falling back to database');
        } else if (error) {
          console.error('Error fetching subscription:', error);
        }
        
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
    
    // Dynamic polling: 5 seconds when fast polling, 60 seconds normally
    const pollingInterval = fastPolling ? 5000 : 60000;
    const interval = setInterval(() => {
      checkSubscription(true);
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [checkSubscription, fastPolling]);

  // IMPORTANT: keep this stable so pages can safely depend on it in useEffect
  // (otherwise it can cause a refetch->rerender->refetch loop).
  const refetch = useCallback(() => checkSubscription(false), [checkSubscription]);
  
  const onModulesChange = useCallback((callback: (newModules: string[]) => void) => {
    setOnChangeCallbacks(prev => [...prev, callback]);
    return () => {
      setOnChangeCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  }, []);
  
  const enableFastPolling = useCallback((enabled: boolean) => {
    console.log('[useSubscription] Fast polling:', enabled ? 'enabled' : 'disabled');
    setFastPolling(enabled);
  }, []);

  return { 
    ...subscriptionData, 
    refetch, 
    hasModuleForSport, 
    hasAccessForSport,
    getModuleDetails,
    getModuleStatus,
    hasPendingCancellation,
    onModulesChange,
    enableFastPolling
  };
};
