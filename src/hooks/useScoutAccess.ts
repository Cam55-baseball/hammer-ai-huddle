import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useScoutAccess = () => {
  const { user } = useAuth();
  const [isScout, setIsScout] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setIsScout(false);
        setIsCoach(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
           .in('role', ['scout', 'coach'])
           .eq('status', 'active');

        if (error) {
          console.error('Error checking scout/coach access:', error);
          setIsScout(false);
          setIsCoach(false);
        } else {
          const roles = data?.map(r => r.role) || [];
          setIsScout(roles.includes('scout'));
          setIsCoach(roles.includes('coach'));
        }
      } catch (error) {
        console.error('Error in useScoutAccess:', error);
        setIsScout(false);
        setIsCoach(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user]);

  // canSendActivities is true for scouts OR coaches
  const canSendActivities = isScout || isCoach;

  return { isScout, isCoach, canSendActivities, loading };
};
