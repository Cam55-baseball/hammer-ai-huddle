import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type ModuleState = 'active' | 'frozen' | 'archived' | 'none';

interface ModuleAccessResult {
  getModuleState: (module: string, sport?: string) => ModuleState;
  isFrozen: (module: string, sport?: string) => boolean;
  isReadOnly: (module: string, sport?: string) => boolean;
  isLoading: boolean;
}

export function useModuleAccessState(): ModuleAccessResult {
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['module-access-state', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('subscriptions')
        .select('status, subscribed_modules, module_data_status')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const getModuleState = (module: string, sport = 'baseball'): ModuleState => {
    if (!subscription) return 'none';
    
    const key = `${sport}_${module}`;
    const statusMap = (subscription.module_data_status as Record<string, string>) ?? {};
    
    // If explicit status exists, use it
    if (statusMap[key]) return statusMap[key] as ModuleState;
    
    // If module is in subscribed_modules and subscription is active
    const subscribedModules = subscription.subscribed_modules ?? [];
    if (subscription.status === 'active' && subscribedModules.includes(module)) {
      return 'active';
    }
    
    // If module was previously subscribed but now inactive
    if (subscription.status !== 'active' && subscribedModules.includes(module)) {
      return 'frozen';
    }
    
    return 'none';
  };

  const isFrozen = (module: string, sport?: string) => getModuleState(module, sport) === 'frozen';
  const isReadOnly = (module: string, sport?: string) => {
    const state = getModuleState(module, sport);
    return state === 'frozen' || state === 'archived';
  };

  return { getModuleState, isFrozen, isReadOnly, isLoading };
}
