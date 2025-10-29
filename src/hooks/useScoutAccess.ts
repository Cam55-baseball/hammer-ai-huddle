import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useScoutAccess = () => {
  const { user } = useAuth();
  const [isScout, setIsScout] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkScoutAccess = async () => {
      if (!user) {
        setIsScout(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'scout')
          .maybeSingle();

        if (error) {
          console.error('Error checking scout access:', error);
          setIsScout(false);
        } else {
          setIsScout(!!data);
        }
      } catch (error) {
        console.error('Error in useScoutAccess:', error);
        setIsScout(false);
      } finally {
        setLoading(false);
      }
    };

    checkScoutAccess();
  }, [user]);

  return { isScout, loading };
};
