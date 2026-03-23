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

  useEffect(() => {
    if (!enabled || !linkCode || !user) return;

    const channel = supabase.channel(`live-reps-${linkCode}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'new_rep' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setPartnerReps(prev => [...prev, payload.rep as BroadcastRep]);
        }
      })
      .on('broadcast', { event: 'remove_rep' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setPartnerReps(prev => prev.filter((_, i) => i !== payload.index));
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setPartnerReps([]);
    };
  }, [linkCode, enabled, user]);

  const broadcastRep = useCallback((rep: BroadcastRep) => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'new_rep',
      payload: { userId: user.id, rep },
    });
  }, [user]);

  const broadcastRemoveRep = useCallback((index: number) => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'remove_rep',
      payload: { userId: user.id, index },
    });
  }, [user]);

  return { partnerReps, broadcastRep, broadcastRemoveRep };
}
