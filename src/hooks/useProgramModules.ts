import { useContext, useMemo } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { AuthContext } from "@/contexts/AuthContext";
import { playerProgramModules } from "../../supabase/functions/_shared/programAccess";

/** Player-facing program modules (owner Nov 5 #2): same subscription, with the owner-only 5Tool
 *  rule applied. Use for questions, prompts and cards; keep useSubscription for access/purchases. */
export function useProgramModules() {
  const sub = useSubscription();
  const userId = useContext(AuthContext)?.user?.id ?? null;
  const modules = useMemo(() => playerProgramModules(userId, sub.modules ?? []), [userId, sub.modules]);
  return { ...sub, modules };
}
