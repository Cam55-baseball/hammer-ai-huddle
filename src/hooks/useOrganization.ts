import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useOrganization() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const myOrgs = useQuery({
    queryKey: ['organizations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const members = useQuery({
    queryKey: ['org-members', user?.id],
    queryFn: async () => {
      if (!user || !myOrgs.data?.length) return [];
      const orgIds = myOrgs.data.map(o => o.id);
      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .in('organization_id', orgIds)
        .eq('status', 'active');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && (myOrgs.data?.length ?? 0) > 0,
  });

  const createOrg = useMutation({
    mutationFn: async (input: { name: string; sport: string; org_type: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('organizations').insert({ ...input, owner_user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });

  const addMember = useMutation({
    mutationFn: async (input: { organization_id: string; user_id: string; role_in_org: string }) => {
      const { error } = await supabase.from('organization_members').insert(input);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org-members'] }),
  });

  return { myOrgs, members, createOrg, addMember };
}
