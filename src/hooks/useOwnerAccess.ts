import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useOwnerAccess = () => {
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOwnerRole = async () => {
      if (!user?.id) {
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
          console.error('[useOwnerAccess] Error:', error);
          setIsOwner(false);
        } else {
          setIsOwner(!!data && data.length > 0);
        }
      } catch (error) {
        console.error('[useOwnerAccess] Exception:', error);
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    };

    checkOwnerRole();
  }, [user?.id]);

  return { isOwner, loading };
};
