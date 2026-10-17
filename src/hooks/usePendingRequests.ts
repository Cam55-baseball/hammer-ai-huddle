import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Count of incoming connection requests waiting for the signed-in user
 * (or, for parent-run accounts, requests about their child they can answer).
 * Drives the "Requests" side-menu badge so players actually notice a coach
 * or organization request.
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
  const pendingCount = (q.data ?? []).filter((r) => r.status === 'pending' && r.incoming).length;
  return { pendingCount, loading: q.isLoading };
}
