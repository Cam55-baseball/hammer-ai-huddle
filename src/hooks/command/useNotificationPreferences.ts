import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface NotificationPreferences {
  in_app: boolean;
  email: boolean;
  push: boolean;
}

// Owner Nov 8: Push is on until the person turns it off themselves (the phone permission still decides).
const DEFAULT_PREFS: NotificationPreferences = { in_app: true, email: false, push: true };

/** What the Push switch shows: off only when the person chose off (push_set_at recorded). */
export function shownPush(row: { push?: boolean | null; push_set_at?: string | null } | null | undefined): boolean {
  if (!row) return true;
  return row.push === false ? !row.push_set_at : true;
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  return useQuery({
    queryKey: ["notification-preferences", uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async (): Promise<NotificationPreferences> => {
      const { data } = await (supabase as any)
        .from("notification_preferences")
        .select("in_app,email,push,push_set_at")
        .eq("user_id", uid!)
        .maybeSingle();
      if (!data) return DEFAULT_PREFS;
      return {
        in_app: !!data.in_app,
        email: !!data.email,
        push: shownPush(data),
      };
    },
  });
}

export function useUpdateNotificationPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    /** `pushChosen`: the person flipped the Push switch itself (only then is "off" recorded as their choice). */
    mutationFn: async (next: Partial<NotificationPreferences> & { pushChosen?: boolean }) => {
      if (!user?.id) throw new Error("not authenticated");
      const now = new Date().toISOString();
      const row: Record<string, unknown> = {
        user_id: user.id,
        in_app: next.in_app ?? true,
        email: next.email ?? false,
        push: next.push ?? true,
        updated_at: now,
      };
      if (next.pushChosen) row.push_set_at = now;
      const { error } = await (supabase as any)
        .from("notification_preferences")
        .upsert(row, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
      qc.invalidateQueries({ queryKey: ["athlete-onboarding-state", user?.id] });
    },
  });
}
