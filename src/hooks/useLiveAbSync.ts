import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

interface LiveAbSyncOptions {
  linkedSessionId?: string;
  enabled?: boolean;
  onPartnerUpdate?: (payload: any) => void;
}

/**
 * Realtime sync hook for linked Live AB sessions.
 * Subscribes to changes on the partner's performance_sessions row
 * and syncs micro_layer_data updates between participants.
 */
export function useLiveAbSync({ linkedSessionId, enabled = true, onPartnerUpdate }: LiveAbSyncOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || !linkedSessionId || !user) return;

    const channel = supabase
      .channel(`live-ab-sync-${linkedSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'performance_sessions',
          filter: `id=eq.${linkedSessionId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).user_id !== user.id) {
            onPartnerUpdate?.(payload.new);
            queryClient.invalidateQueries({ queryKey: ['linked-session', linkedSessionId] });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [linkedSessionId, enabled, user, onPartnerUpdate, queryClient]);

  /** Push local micro data to the linked session */
  const syncToPartner = useCallback(async (sessionId: string, microLayerData: any) => {
    if (!sessionId) return;
    const { error } = await supabase
      .from('performance_sessions')
      .update({
        micro_layer_data: microLayerData as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) console.error('[LiveAbSync] sync error:', error.message);
  }, []);

  return { syncToPartner };
}
