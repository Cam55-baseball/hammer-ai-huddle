import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useGovernanceFlags(options?: { allUsers?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['governance-flags', user?.id, options?.allUsers],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase.from('governance_flags').select('*').order('created_at', { ascending: false });
      if (!options?.allUsers) q = q.eq('user_id', user.id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const resolveFlag = useMutation({
    mutationFn: async ({ flagId, action, notes }: { flagId: string; action: string; notes?: string }) => {
      const { error } = await supabase
        .from('governance_flags')
        .update({ status: 'resolved', admin_action: action, admin_notes: notes, resolved_by: user?.id, resolved_at: new Date().toISOString() })
        .eq('id', flagId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['governance-flags'] }),
  });

  return { ...query, resolveFlag };
}
