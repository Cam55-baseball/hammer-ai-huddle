/**
 * Account gate (owner ruling 2026-10-06), mounted around every route.
 *  - Paused account (under 13) → PausedAccountScreen, nothing else.
 *  - Signed in with no birthdate → BirthdateRequiredScreen until saved.
 * Owner/admin accounts skip the birthdate step (staff), never the pause.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { PausedAccountScreen } from "./PausedAccountScreen";
import { BirthdateRequiredScreen } from "./BirthdateRequiredScreen";

const OPEN_PATHS = [/^\/auth/, /^\/signup/, /^\/terms/, /^\/privacy/, /^\/legal/, /^\/reset-password/, /^\/evidence/, /^\/app-handoff/];
const PAYMENT_PATHS = [/^\/pricing/, /^\/checkout/, /^\/purchase-complete/];

export const accountGateKey = (uid?: string) => ["account-gate", uid];

export function AccountGate({ children }: { children: React.ReactNode }) {
  const { user } = useOptionalAuth();
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: accountGateKey(user?.id),
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("date_of_birth, account_paused_at, paused_reason").eq("id", user!.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id).in("role", ["owner", "admin"]),
      ]);
      return {
        dob: ((p.data as any)?.date_of_birth as string | null) ?? null,
        paused: !!(p.data as any)?.account_paused_at,
        reason: ((p.data as any)?.paused_reason as string | null) ?? null,
        staff: ((r.data ?? []) as any[]).length > 0,
        failed: !!p.error,
      };
    },
  });
  if (!user?.id || !q.data || q.data.failed || OPEN_PATHS.some((re) => re.test(pathname))) return <>{children}</>;
  // A parent who has signed may reach the plan and checkout pages to pay.
  if (q.data.paused && q.data.reason === "parent_payment_pending" && PAYMENT_PATHS.some((re) => re.test(pathname))) return <>{children}</>;
  if (q.data.paused) return <PausedAccountScreen />;
  if (!q.data.dob && !q.data.staff) {
    return <BirthdateRequiredScreen onSaved={() => qc.invalidateQueries({ queryKey: accountGateKey(user.id) })} />;
  }
  return <>{children}</>;
}
