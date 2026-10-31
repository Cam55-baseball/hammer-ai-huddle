import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/** Presentation only; all sends and cross-player reads still recheck server access. */
export function useWorkoutStaff() {
  const { user, loading } = useAuth();
  const query = useQuery({ queryKey: ['workout-staff', user?.id], enabled: !!user, staleTime: 60_000, queryFn: async () => {
    if (!user) return false;
    const roles = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('status', 'active');
    if (roles.error) throw roles.error;
    if (roles.data.some(row => ['coach', 'scout', 'owner', 'admin'].includes(row.role))) return true;
    const memberships = await supabase.from('organization_members').select('role_in_org').eq('user_id', user.id).eq('status', 'active');
    if (memberships.error) throw memberships.error;
    if (memberships.data.some(row => ['admin', 'owner', 'coach'].includes(row.role_in_org))) return true;
    const orgs = await supabase.from('organizations').select('id').eq('owner_user_id', user.id).limit(1);
    if (orgs.error) throw orgs.error;
    return orgs.data.length > 0;
  }});
  return { isStaff: query.data === true, ready: !loading && !!user && query.isSuccess, error: query.error };
}