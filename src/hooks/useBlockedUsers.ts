/**
 * Blocked-user ids for the signed-in user, for filtering any list of people
 * or shared content before it is rendered.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchBlockedUserIds } from "@/lib/safety/blocks";

export function useBlockedUsers() {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setBlockedIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    setBlockedIds(await fetchBlockedUserIds(user.id));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isBlocked = useCallback(
    (id?: string | null) => Boolean(id && blockedIds.has(id)),
    [blockedIds],
  );

  return { blockedIds, isBlocked, loading, refresh };
}
