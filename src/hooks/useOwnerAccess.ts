import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useOwnerAccess = () => {
  const { user, session, loading: authLoading } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOwnerRole = async () => {
      // Wait for auth to finish loading before making any decisions
      if (authLoading) return;

      if (!user || !session) {
        setIsOwner(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role, status')
          .eq('user_id', user.id)
          .eq('role', 'owner')
          .eq('status', 'active');

        if (error) {
          console.error('[useOwnerAccess] Error checking owner role:', error);
          setIsOwner(false);
        } else {
          setIsOwner(!!data && data.length > 0);
        }
      } catch (error) {
        console.error('[useOwnerAccess] Exception checking owner role:', error);
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    };

    checkOwnerRole();
  }, [user, session, authLoading]);

  return { isOwner, loading };
};
