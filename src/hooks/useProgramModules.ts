import { useMemo } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useOptionalAuth } from "@/hooks/useAuth";
import { playerProgramModules } from "../../supabase/functions/_shared/programAccess";

/** Player-facing program modules (owner Nov 5 #2): same subscription, with the owner-only 5Tool
 *  rule applied. Use for questions, prompts and cards; keep useSubscription for access/purchases. */
export function useProgramModules() {
  const sub = useSubscription();
  const { user } = useOptionalAuth();
  const modules = useMemo(() => playerProgramModules(user?.id, sub.modules ?? []), [user?.id, sub.modules]);
  return { ...sub, modules };
}
