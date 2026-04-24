import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Reads the global Owner-controlled `app_settings.rankings_visible` flag.
 * Defaults to `true` (fail-open) if the row is missing or the query errors.
 * Subscribes to realtime changes so toggling in the Owner Dashboard
 * propagates instantly to all open clients.
 */
export const useRankingsVisibility = () => {
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchVisibility = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'rankings_visible')
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          console.error('[useRankingsVisibility] fetch error:', error);
          setVisible(true);
        } else if (data) {
          const settingValue = data.setting_value as { enabled?: boolean } | null;
          setVisible(settingValue?.enabled ?? true);
        } else {
          setVisible(true);
        }
      } catch (err) {
        console.error('[useRankingsVisibility] exception:', err);
        if (isMounted) setVisible(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchVisibility();

    const channel = supabase
      .channel('rankings-visibility-setting')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
          filter: 'setting_key=eq.rankings_visible',
        },
        (payload) => {
          const newRow = (payload.new ?? null) as { setting_value?: { enabled?: boolean } } | null;
          if (newRow && newRow.setting_value) {
            setVisible(newRow.setting_value.enabled ?? true);
          } else if (payload.eventType === 'DELETE') {
            setVisible(true);
          } else {
            // Fallback: re-fetch if payload shape unexpected
            fetchVisibility();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { visible, loading };
};
