import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface BroadcastRep {
  index: number;
  contact_quality?: string;
  pitch_result?: string;
  pitch_type?: string;
  swing_decision?: string;
  exit_direction?: string;
  pitch_location?: { row: number; col: number };
  timestamp: number;
}

interface UseLiveRepBroadcastOptions {
  linkCode?: string;
  enabled?: boolean;
}

export function useLiveRepBroadcast({ linkCode, enabled = true }: UseLiveRepBroadcastOptions) {
  const { user } = useAuth();
  const [partnerReps, setPartnerReps] = useState<BroadcastRep[]>([]);
  const channelRef = useRef<any>(null);
  const isSubscribed = useRef(false);
  const pendingQueue = useRef<Array<{ type: 'broadcast'; event: string; payload: any }>>([]);

  useEffect(() => {
    if (!enabled || !linkCode || !user) return;

    isSubscribed.current = false;

    const channel = supabase.channel(`live-reps-${linkCode}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'new_rep' }, ({ payload }) => {
        console.log('[LiveRepBroadcast] Received new_rep:', payload);
        if (payload.userId !== user.id) {
          setPartnerReps(prev => [...prev, payload.rep as BroadcastRep]);
        }
      })
      .on('broadcast', { event: 'remove_rep' }, ({ payload }) => {
        console.log('[LiveRepBroadcast] Received remove_rep:', payload);
        if (payload.userId !== user.id) {
          setPartnerReps(prev => prev.filter((_, i) => i !== payload.index));
        }
      })
      .subscribe((status) => {
        console.log('[LiveRepBroadcast] Channel status:', status, linkCode);
        if (status === 'SUBSCRIBED') {
          isSubscribed.current = true;
          // Flush any queued messages
          const queue = pendingQueue.current;
          pendingQueue.current = [];
          for (const msg of queue) {
            console.log('[LiveRepBroadcast] Flushing queued message:', msg.event);
            channel.send(msg);
          }
        }
      });

    channelRef.current = channel;

    return () => {
      isSubscribed.current = false;
      pendingQueue.current = [];
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setPartnerReps([]);
    };
  }, [linkCode, enabled, user]);

  const broadcastRep = useCallback((rep: BroadcastRep) => {
    if (!channelRef.current || !user) return;
    const msg = {
      type: 'broadcast' as const,
      event: 'new_rep',
      payload: { userId: user.id, rep },
    };
    if (!isSubscribed.current) {
      console.warn('[LiveRepBroadcast] Not subscribed yet, queuing new_rep');
      pendingQueue.current.push(msg);
      return;
    }
    console.log('[LiveRepBroadcast] Sending new_rep');
    channelRef.current.send(msg);
  }, [user]);

  const broadcastRemoveRep = useCallback((index: number) => {
    if (!channelRef.current || !user) return;
    const msg = {
      type: 'broadcast' as const,
      event: 'remove_rep',
      payload: { userId: user.id, index },
    };
    if (!isSubscribed.current) {
      console.warn('[LiveRepBroadcast] Not subscribed yet, queuing remove_rep');
      pendingQueue.current.push(msg);
      return;
    }
    console.log('[LiveRepBroadcast] Sending remove_rep');
    channelRef.current.send(msg);
  }, [user]);

  return { partnerReps, broadcastRep, broadcastRemoveRep };
}
