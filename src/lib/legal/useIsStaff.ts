import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";

/** Owner or admin (server roles table). */
export function useIsStaff(): boolean {
  const { user } = useOptionalAuth() as any;
  const [staff, setStaff] = useState(false);
  useEffect(() => {
    if (!user?.id) { setStaff(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).in("role", ["owner", "admin"])
      .then(({ data }) => setStaff((data ?? []).length > 0));
  }, [user?.id]);
  return staff;
}
