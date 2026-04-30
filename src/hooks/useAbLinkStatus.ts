import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AbLinkStatus = 'pending' | 'claimed' | 'linked' | 'expired' | 'unknown';

export interface AbLinkState {
  status: AbLinkStatus;
  isCreator: boolean;
  isJoiner: boolean;
  mySessionAttached: boolean;
  partnerSessionAttached: boolean;
  expiresAt: string | null;
  loading: boolean;
}

const INITIAL: AbLinkState = {
  status: 'unknown',
  isCreator: false,
  isJoiner: false,
  mySessionAttached: false,
  partnerSessionAttached: false,
  expiresAt: null,
  loading: true,
};

export function useAbLinkStatus(linkCode: string | null | undefined): AbLinkState {
  const { user } = useAuth();
  const [state, setState] = useState<AbLinkState>(INITIAL);

  useEffect(() => {
    if (!linkCode || !user?.id) {
      setState({ ...INITIAL, loading: false });
      return;
    }

    let cancelled = false;

    const apply = (row: any) => {
      if (cancelled || !row) return;
      const isCreator = row.creator_user_id === user.id;
      const isJoiner = row.joiner_user_id === user.id;
      const mySessionAttached = isCreator
        ? !!row.creator_session_id
        : isJoiner
          ? !!row.joiner_session_id
          : false;
      const partnerSessionAttached = isCreator
        ? !!row.joiner_session_id
        : isJoiner
          ? !!row.creator_session_id
          : false;
      setState({
        status: (row.status as AbLinkStatus) ?? 'unknown',
        isCreator,
        isJoiner,
        mySessionAttached,
        partnerSessionAttached,
        expiresAt: row.expires_at ?? null,
        loading: false,
      });
    };

    (async () => {
      const { data } = await supabase
        .from('live_ab_links' as any)
        .select('status, creator_user_id, joiner_user_id, creator_session_id, joiner_session_id, expires_at')
        .eq('link_code', linkCode)
        .maybeSingle();
      if (data) apply(data);
      else if (!cancelled) setState((s) => ({ ...s, loading: false }));
    })();

    const channel = supabase
      .channel(`ab-link-${linkCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_ab_links',
          filter: `link_code=eq.${linkCode}`,
        },
        (payload: any) => apply(payload.new ?? payload.old),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [linkCode, user?.id]);

  return state;
}
