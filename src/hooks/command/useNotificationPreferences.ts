import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface NotificationPreferences {
  in_app: boolean;
  email: boolean;
  push: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = { in_app: true, email: false, push: false };

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
        .select("in_app,email,push")
        .eq("user_id", uid!)
        .maybeSingle();
      if (!data) return DEFAULT_PREFS;
      return {
        in_app: !!data.in_app,
        email: !!data.email,
        push: !!data.push,
      };
    },
  });
}

export function useUpdateNotificationPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (next: Partial<NotificationPreferences>) => {
      if (!user?.id) throw new Error("not authenticated");
      const row = {
        user_id: user.id,
        in_app: next.in_app ?? true,
        email: next.email ?? false,
        push: next.push ?? false,
        updated_at: new Date().toISOString(),
      };
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
