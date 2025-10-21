import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useOwnerAccess = () => {
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOwnerRole = async () => {
      if (!user) {
        setIsOwner(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'owner')
          .maybeSingle();

        if (error) {
          console.error('Error checking owner role:', error);
          setIsOwner(false);
        } else {
          setIsOwner(!!data);
        }
      } catch (error) {
        console.error('Error checking owner role:', error);
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    };

    checkOwnerRole();
  }, [user]);

  return { isOwner, loading };
};
