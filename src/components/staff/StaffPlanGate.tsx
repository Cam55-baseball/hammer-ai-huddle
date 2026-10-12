import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Button } from "@/components/ui/button";
import { staffGateAllows } from "@/lib/staffPlanGate";

/** Opens coach tools only with an active Coach/Organization plan once the owner turns the gate switch on. */
export function StaffPlanGate({ children, needsOrg = false }: { children: ReactNode; needsOrg?: boolean }) {
  const { isOwner, loading: l1 } = useOwnerAccess();
  const { isAdmin, loading: l2 } = useAdminAccess();
  const [state, setState] = useState<{ gateOn: boolean; plan: "coach" | "organization" | null } | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: s } = await supabase.from("app_settings").select("setting_value").eq("setting_key", "staff_plan_gate").maybeSingle();
      const gateOn = (s?.setting_value as { enabled?: boolean } | null)?.enabled === true;
      let plan: "coach" | "organization" | null = null;
      if (gateOn) {
        const { data: u } = await supabase.auth.getUser();
        if (u.user) {
          const { data: p } = await (supabase as any).from("staff_plans").select("plan,status,current_period_end").eq("user_id", u.user.id).maybeSingle();
          const active = p && ["active", "trialing"].includes(p.status) && (!p.current_period_end || new Date(p.current_period_end) > new Date());
          plan = active ? p.plan : null;
        }
      }
      if (live) setState({ gateOn, plan });
    })();
    return () => { live = false; };
  }, []);

  if (l1 || l2 || !state) return null;
  const ok = staffGateAllows({ gateOn: state.gateOn, isOwnerOrAdmin: isOwner || isAdmin, hasPlan: !!state.plan, plan: state.plan, needsOrg });
  if (ok) return <>{children}</>;
  return (
    <div className="mx-auto max-w-md p-6 text-center space-y-3">
      <h1 className="text-xl font-semibold">{needsOrg ? "Organization plan needed" : "Coach plan needed"}</h1>
      <p className="text-muted-foreground">
        {needsOrg ? "This part is included with the Hammers Organization plan." : "Coach tools are included with the Hammers Coach or Organization plan."}
      </p>
      <Button asChild><Link to="/staff-plans">See plans</Link></Button>
    </div>
  );
}
