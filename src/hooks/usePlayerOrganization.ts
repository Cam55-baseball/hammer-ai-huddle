import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function usePlayerOrganization() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['player-orgs', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id, role_in_org, organizations(id, name, sport)')
        .eq('user_id', user.id)
        .eq('invitation_status', 'active')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return {
    membership: query.data,
    orgName: (query.data as any)?.organizations?.name as string | undefined,
    isLoading: query.isLoading,
  };
}
