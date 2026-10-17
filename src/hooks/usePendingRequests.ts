import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Count of everything waiting for the signed-in user in My Connections:
 * incoming connection requests (or, for parent-run accounts, requests about
 * their child they can answer) plus pending scout follow requests.
 * Drives the "My Connections" side-menu badge so nothing waiting is missed.
 */
export function usePendingRequests() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ['my-requests', user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('list_my_requests_v2');
      if (error) throw error;
      return (data ?? []) as { status: string; incoming: boolean }[];
    },
  });
  const follows = useQuery({
    queryKey: ['my-pending-follows', user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('scout_follows')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', user!.id)
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
  });
  const pendingCount =
    (q.data ?? []).filter((r) => r.status === 'pending' && r.incoming).length + (follows.data ?? 0);
  return { pendingCount, loading: q.isLoading };
}
