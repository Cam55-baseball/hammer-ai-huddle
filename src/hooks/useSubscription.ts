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

// Module-level deduplication: only one check-subscription call at a time
let inflightCheck: Promise<void> | null = null;
let lastResult: SubscriptionData | null = null;

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
    // Direct match
    if (subscriptionData.modules.includes(key)) return true;
    // Tier-aware: check if a higher tier grants access
    if (module === 'hitting' || module === 'throwing') {
      return subscriptionData.modules.includes(`${sport}_5tool`) || subscriptionData.modules.includes(`${sport}_golden2way`);
    }
    if (module === 'pitching') {
      return subscriptionData.modules.includes(`${sport}_pitcher`) || subscriptionData.modules.includes(`${sport}_golden2way`);
    }
    return false;
  }, [subscriptionData.modules]);

  const hasAccessForSport = useCallback((module: string, sport: string, isOwnerOrAdmin: boolean) => {
    if (isOwnerOrAdmin) return true;
    return hasModuleForSport(module, sport);
  }, [hasModuleForSport]);

  const doCheckSubscription = useCallback(async (silent: boolean = false) => {
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

      // Refresh session proactively before calling edge function to avoid expired token errors
      await supabase.auth.refreshSession();

      // Call edge function with refreshed session
      let { data, error } = await supabase.functions.invoke('check-subscription');
      let authFailed = false;

      // If we still get an auth error (401), try one more refresh and retry
      const isAuthError = (err: any) => {
        const msg = err?.message || '';
        return msg.includes('Authentication') || msg.includes('401') || msg.includes('expired') || msg.includes('session missing') || msg.includes('session_not_found') || msg.includes('non-2xx');
      };

      if (error && isAuthError(error)) {
        console.log('[useSubscription] Auth error detected, attempting token refresh...');
        
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshData.session) {
            console.log('[useSubscription] Token refreshed successfully, retrying edge function...');
            
            const retryResult = await supabase.functions.invoke('check-subscription');
            
            data = retryResult.data;
            error = retryResult.error;
            
            if (error && isAuthError(error)) {
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
        const delay = 500 * retries;
        console.warn(`[useSubscription] Function not found (404). Retry ${retries}/3 after ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        const retry404 = await supabase.functions.invoke('check-subscription');
        data = retry404.data;
        error = retry404.error;
      }

      const is404Error = error && (
        error.message?.includes('NOT_FOUND') || 
        error.message?.includes('not found') || 
        (error as any)?.status === 404
      );
      
      if (is404Error) {
        console.warn('[useSubscription] Function still unavailable after retries, using database fallback');
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
        
        if (prevModules.length > 0 && newModules.length > prevModules.length) {
          console.log('[useSubscription] New modules detected:', newModules);
          onChangeCallbacks.forEach(callback => callback(newModules));
        }
        setPrevModules(newModules);
      } else {
        if (is404Error || authFailed) {
          console.warn('[useSubscription] Edge function unavailable or auth failed, falling back to database');
        } else if (error) {
          console.error('Error fetching subscription:', error);
        }
        
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

  // Deduplicated wrapper: ensures only one check runs at a time across all hook instances
  const checkSubscription = useCallback(async (silent: boolean = false) => {
    if (inflightCheck) {
      await inflightCheck;
      // Apply cached result to this instance's state
      if (lastResult) {
        setSubscriptionData(lastResult);
      }
      return;
    }
    inflightCheck = doCheckSubscription(silent).finally(() => {
      inflightCheck = null;
    });
    await inflightCheck;
  }, [doCheckSubscription]);

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
    let interval: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    const startPolling = () => {
      if (interval) clearInterval(interval);
      const pollingInterval = fastPolling ? 5000 : 60000;
      interval = setInterval(() => {
        if (mounted) checkSubscription(true);
      }, pollingInterval);
    };

    // Only run initial check if a session already exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && mounted) {
        checkSubscription(false).then(() => {
          if (mounted) startPolling();
        });
      } else if (mounted) {
        // No session — mark as initialized immediately without calling the edge function
        setSubscriptionData(prev => ({ ...prev, loading: false, initialized: true }));
      }
    });

    // Listen for auth state changes
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (interval) clearInterval(interval);
        if (mounted) {
          setPrevModules([]);
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
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (mounted) {
          checkSubscription(false);
          startPolling();
        }
      }
    });

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
      authSub.unsubscribe();
    };
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
