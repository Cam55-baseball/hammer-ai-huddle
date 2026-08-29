/**
 * Recruiting match ping dispatch (pre-release, staff-gated surface).
 *
 * Rides the existing in-app notification inbox (`coach_notifications`, which is
 * recipient-keyed) — no parallel notification system. The dispatcher itself is a
 * SECURITY DEFINER RPC so that flipping `notified_org` / `notified_athlete` and
 * writing the two notifications happen in one pass: nobody can be pinged twice
 * for the same match.
 *
 * Privacy: the athlete-side message names only the org, the standard, and the
 * date. The org-side message names only the athlete and the standard. Match
 * evaluation itself never consumed self-reported grades, and the copy says so.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PendingPing {
  id: string;
  athlete_user_id: string;
  matched_at: string;
  notified_org: boolean;
  notified_athlete: boolean;
}

/** Matches under this standard that still owe at least one side a ping. */
export function usePendingStandardPings(standardId: string | null) {
  return useQuery({
    queryKey: ["standard-match-pings", standardId],
    enabled: !!standardId,
    queryFn: async (): Promise<PendingPing[]> => {
      const { data, error } = await supabase
        .from("standard_matches")
        .select("id, athlete_user_id, matched_at, notified_org, notified_athlete")
        .eq("standard_id", standardId!)
        .or("notified_org.eq.false,notified_athlete.eq.false");
      if (error) throw error;
      return (data ?? []) as PendingPing[];
    },
  });
}

export interface PingResult {
  org_pings: number;
  athlete_pings: number;
  emails_sent?: number;
  email_errors?: string[];
}

/**
 * Fires every outstanding ping across every standard the caller owns, in-app
 * AND by email. The edge function verifies the JWT and calls the same
 * dispatch RPC as the caller, so ownership and once-only semantics are
 * unchanged — email is layered on top of the atomic dispatch, never instead.
 *
 * `message` is the rep's optional personal note; it rides in the athlete email
 * and the in-app notification.
 */
export function useDispatchStandardMatchPings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (message?: string): Promise<PingResult> => {
      const { data, error } = await supabase.functions.invoke("send-recruiting-match-emails", {
        body: { message: message ?? null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data ?? { org_pings: 0, athlete_pings: 0 }) as PingResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["standard-match-pings"] });
      qc.invalidateQueries({ queryKey: ["standard-match-notifications"] });
    },
  });
}


export interface StandardMatchNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  template_snapshot: {
    kind?: string;
    org_name?: string;
    standard_label?: string;
    sport?: string;
    athlete_name?: string;
    matched_at?: string;
  } | null;
}

/**
 * The signed-in user's recruiting-match notifications, either side.
 * `kind` narrows to the athlete inbox or the org-rep inbox.
 */
export function useStandardMatchNotifications(kind: "standard_match_athlete" | "standard_match_org") {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["standard-match-notifications", kind, user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<StandardMatchNotification[]> => {
      const { data, error } = await supabase
        .from("coach_notifications")
        .select("id, notification_type, title, message, is_read, created_at, template_snapshot")
        .eq("coach_user_id", user!.id)
        .eq("notification_type", kind)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as StandardMatchNotification[];
    },
  });
}

export function useMarkStandardMatchNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("coach_notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["standard-match-notifications"] }),
  });
}

/**
 * "Follow this player" straight off a match ping, so an org rep never has to
 * copy an athlete id around. Writes the same `scout_follows` row the manual
 * lookup flow writes (status stays 'pending' — the athlete still accepts).
 */
export function useFollowMatchedAthlete() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (athleteUserId: string) => {
      const { data: existing } = await supabase
        .from("scout_follows")
        .select("id, status")
        .eq("scout_id", user!.id)
        .eq("player_id", athleteUserId)
        .maybeSingle();
      if (existing) return existing.status as string;

      const { error } = await supabase.from("scout_follows").insert({
        scout_id: user!.id,
        player_id: athleteUserId,
        status: "pending",
        initiated_by: "coach",
      });
      if (error) throw error;
      return "pending";
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-player-pool"] });
      qc.invalidateQueries({ queryKey: ["scout-follows"] });
    },
  });
}
