import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useScoutAccess = () => {
  const { user } = useAuth();
  const [isScout, setIsScout] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roleCheckFailed, setRoleCheckFailed] = useState(false);
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const checkAccess = async () => {
      if (!user) {
        setIsScout(false);
        setIsCoach(false);
        setRoleCheckFailed(false);
        setCheckedUserId(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setRoleCheckFailed(false);
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
           .in('role', ['scout', 'coach'])
           .eq('status', 'active');

        if (error) {
          if (cancelled) return;
          console.error('Error checking scout/coach access:', error);
          setIsScout(false);
          setIsCoach(false);
          setRoleCheckFailed(true);
        } else {
          if (cancelled) return;
          const roles = data?.map(r => r.role) || [];
          setIsScout(roles.includes('scout'));
          setIsCoach(roles.includes('coach'));
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error in useScoutAccess:', error);
        setIsScout(false);
        setIsCoach(false);
        setRoleCheckFailed(true);
      } finally {
        if (!cancelled) {
          setCheckedUserId(user.id);
          setLoading(false);
        }
      }
    };

    checkAccess();
    return () => { cancelled = true; };
  }, [user?.id]);

  // canSendActivities is true for scouts OR coaches
  const canSendActivities = isScout || isCoach;

  return { isScout, isCoach, canSendActivities, loading: loading || checkedUserId !== (user?.id ?? null), roleCheckFailed };
};
