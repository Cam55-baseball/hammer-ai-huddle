import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useOwnerAccess = () => {
  const { user, session } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOwnerRole = async () => {
      console.log('[useOwnerAccess] Checking owner role...', { 
        hasUser: !!user, 
        hasSession: !!session,
        userId: user?.id 
      });

      if (!user || !session) {
        console.log('[useOwnerAccess] No user or session, setting isOwner to false');
        setIsOwner(false);
        setLoading(false);
        return;
      }

      try {
        console.log('[useOwnerAccess] Querying user_roles table for user:', user.id);
        
        const { data, error } = await supabase
          .from('user_roles')
          .select('role, status')
          .eq('user_id', user.id)
          .eq('role', 'owner');

        console.log('[useOwnerAccess] Query result:', { data, error });

        if (error) {
          console.error('[useOwnerAccess] Error checking owner role:', error);
          setIsOwner(false);
        } else {
          const hasOwnerRole = !!data && data.length > 0;
          console.log('[useOwnerAccess] Setting isOwner to:', hasOwnerRole);
          setIsOwner(hasOwnerRole);
        }
      } catch (error) {
        console.error('[useOwnerAccess] Exception checking owner role:', error);
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    };

    checkOwnerRole();
  }, [user, session]);

  return { isOwner, loading };
};
