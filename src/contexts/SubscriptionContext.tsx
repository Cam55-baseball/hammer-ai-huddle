import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ModuleDetails {
  subscription_id: string;
  status: "active" | "canceled" | "past_due";
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  price_id: string;
  canceled_at: string | null;
}

export interface SubscriptionData {
  subscribed: boolean;
  modules: string[];
  module_details: Record<string, ModuleDetails>;
  subscription_end: string | null;
  loading: boolean;
  initialized: boolean;
  has_discount?: boolean;
  discount_percent?: number | null;
}

export interface SubscriptionContextValue extends SubscriptionData {
  refetch: () => Promise<void>;
  hasModuleForSport: (module: string, sport: string) => boolean;
  hasAccessForSport: (module: string, sport: string, isOwnerOrAdmin: boolean) => boolean;
  getModuleDetails: (module: string, sport: string) => ModuleDetails | undefined;
  getModuleStatus: (module: string, sport: string) => "not_subscribed" | "canceling" | ModuleDetails["status"];
  hasPendingCancellation: (module: string, sport: string) => boolean;
  onModulesChange: (callback: (newModules: string[]) => void) => () => void;
  enableFastPolling: (enabled: boolean) => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
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

  const [fastPolling, setFastPolling] = useState(false);

  // These refs prevent stale-closure bugs and coalesce concurrent checks across the app.
  const prevModulesRef = useRef<string[]>([]);
  const onChangeCallbacksRef = useRef<Set<(newModules: string[]) => void>>(new Set());
  const inFlightRef = useRef<Promise<void> | null>(null);
  const edgeCooldownUntilRef = useRef<number>(0);

  const hasModuleForSport = useCallback(
    (module: string, sport: string) => {
      const key = `${sport}_${module}`;
      return subscriptionData.modules.includes(key);
    },
    [subscriptionData.modules]
  );

  const hasAccessForSport = useCallback(
    (module: string, sport: string, isOwnerOrAdmin: boolean) => {
      if (isOwnerOrAdmin) return true;
      return hasModuleForSport(module, sport);
    },
    [hasModuleForSport]
  );

  const runDatabaseFallback = useCallback(async (userId: string) => {
    try {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (fallbackData && !fallbackError) {
        const isActive = fallbackData.status === "active";
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
        return;
      }

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
    } catch (fallbackError) {
      console.error("[SubscriptionProvider] Fallback query failed:", fallbackError);
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

  const checkSubscription = useCallback(
    async (silent: boolean = false) => {
      // Coalesce concurrent calls (multiple pages/hooks may refetch simultaneously)
      if (inFlightRef.current) return inFlightRef.current;

      const p = (async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

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

          // If the backend function is in a brief propagation window, skip it for a bit and use DB.
          if (Date.now() < edgeCooldownUntilRef.current) {
            await runDatabaseFallback(session.user.id);
            return;
          }

          // First attempt: call backend function
          let { data, error } = await supabase.functions.invoke("check-subscription");

          // If we get an auth error (401), try refreshing the session and retry once
          if (error && (error.message?.includes("Authentication") || error.message?.includes("401"))) {
            try {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              if (!refreshError && refreshData.session) {
                const retryResult = await supabase.functions.invoke("check-subscription");
                data = retryResult.data;
                error = retryResult.error;
              }
            } catch (refreshError) {
              console.error("[SubscriptionProvider] Error during token refresh:", refreshError);
            }
          }

          // Handle intermittent 404 NOT_FOUND from deployments/cold starts with retries
          let retries = 0;
          while (
            retries < 3 &&
            error &&
            (error.message?.includes("NOT_FOUND") || error.message?.includes("not found") || (error as any)?.status === 404)
          ) {
            retries++;
            const delay = 500 * retries;
            if (!silent) {
              console.warn(
                `[SubscriptionProvider] Function not found (404). Retry ${retries}/3 after ${delay}ms...`
              );
            }
            await new Promise((r) => setTimeout(r, delay));
            const retry404 = await supabase.functions.invoke("check-subscription");
            data = retry404.data;
            error = retry404.error;
          }

          const is404Error =
            !!error &&
            (error.message?.includes("NOT_FOUND") || error.message?.includes("not found") || (error as any)?.status === 404);

          if (!error && data) {
            const newModules: string[] = data.modules || [];

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

            const prev = prevModulesRef.current;
            if (prev.length > 0 && newModules.length > prev.length) {
              onChangeCallbacksRef.current.forEach((cb) => cb(newModules));
            }
            prevModulesRef.current = newModules;
            return;
          }

          // If the function is still unavailable after retries, avoid spamming it for a short period.
          if (is404Error) {
            edgeCooldownUntilRef.current = Date.now() + 60_000;
          } else if (error && !silent) {
            console.error("[SubscriptionProvider] Error fetching subscription:", error);
          }

          await runDatabaseFallback(session.user.id);
        } catch (err) {
          console.error("[SubscriptionProvider] Error in checkSubscription:", err);
          setSubscriptionData((prev) => ({
            ...prev,
            subscribed: false,
            modules: [],
            module_details: {},
            subscription_end: null,
            loading: false,
            initialized: true,
            has_discount: false,
            discount_percent: null,
          }));
        }
      })();

      inFlightRef.current = p;
      try {
        await p;
      } finally {
        inFlightRef.current = null;
      }
    },
    [runDatabaseFallback]
  );

  const refetch = useCallback(() => checkSubscription(false), [checkSubscription]);

  const getModuleDetails = useCallback(
    (module: string, sport: string) => {
      const key = `${sport}_${module}`;
      return subscriptionData.module_details?.[key];
    },
    [subscriptionData.module_details]
  );

  const getModuleStatus = useCallback(
    (module: string, sport: string) => {
      const details = getModuleDetails(module, sport);
      if (!details) return "not_subscribed";
      if (details.cancel_at_period_end) return "canceling";
      return details.status;
    },
    [getModuleDetails]
  );

  const hasPendingCancellation = useCallback(
    (module: string, sport: string) => {
      const details = getModuleDetails(module, sport);
      return details?.cancel_at_period_end || false;
    },
    [getModuleDetails]
  );

  const onModulesChange = useCallback((callback: (newModules: string[]) => void) => {
    onChangeCallbacksRef.current.add(callback);
    return () => onChangeCallbacksRef.current.delete(callback);
  }, []);

  const enableFastPolling = useCallback((enabled: boolean) => {
    setFastPolling(enabled);
  }, []);

  useEffect(() => {
    checkSubscription(false);

    const pollingInterval = fastPolling ? 5000 : 60000;
    const interval = window.setInterval(() => {
      void checkSubscription(true);
    }, pollingInterval);

    return () => window.clearInterval(interval);
  }, [checkSubscription, fastPolling]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void checkSubscription(false);
    });

    return () => subscription.unsubscribe();
  }, [checkSubscription]);

  const value: SubscriptionContextValue = useMemo(
    () => ({
      ...subscriptionData,
      refetch,
      hasModuleForSport,
      hasAccessForSport,
      getModuleDetails,
      getModuleStatus,
      hasPendingCancellation,
      onModulesChange,
      enableFastPolling,
    }),
    [
      subscriptionData,
      refetch,
      hasModuleForSport,
      hasAccessForSport,
      getModuleDetails,
      getModuleStatus,
      hasPendingCancellation,
      onModulesChange,
      enableFastPolling,
    ]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    // Throwing here would trip the global ErrorBoundary; instead, return a safe no-op object.
    // This should never happen because App wraps SubscriptionProvider.
    return {
      subscribed: false,
      modules: [],
      module_details: {},
      subscription_end: null,
      loading: false,
      initialized: true,
      has_discount: false,
      discount_percent: null,
      refetch: async () => {},
      hasModuleForSport: () => false,
      hasAccessForSport: (_m, _s, isOwnerOrAdmin) => isOwnerOrAdmin,
      getModuleDetails: () => undefined,
      getModuleStatus: () => "not_subscribed",
      hasPendingCancellation: () => false,
      onModulesChange: () => () => {},
      enableFastPolling: () => {},
    };
  }
  return ctx;
}
