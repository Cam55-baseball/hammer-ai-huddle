// Owner Nov 6 r5: plan names on Profile come only from the shared activePlans judge.
import { Badge } from "@/components/ui/badge";
import { ModuleManagementCard } from "@/components/ModuleManagementCard";
import { billingRows, heldPlanLabels } from "@/lib/subscription/planDisplay";

/** One badge per plan the player really holds ("Baseball · The Golden 2Way"). */
export function HeldPlanBadges({ planModules, primarySport }: { planModules: readonly string[]; primarySport: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {heldPlanLabels(planModules, primarySport).map((label) => (
        <Badge key={label} variant="outline" data-held-plan>
          {label}
        </Badge>
      ))}
    </div>
  );
}

/** One billing card per stored payment, each titled by the plan it belongs to. */
export function PlanBillingCards({ moduleDetails, planModules, primarySport, onActionComplete }: {
  moduleDetails: Record<string, any> | null | undefined; planModules: readonly string[]; primarySport: string; onActionComplete: () => void;
}) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {billingRows(moduleDetails, planModules, primarySport).map((row) => (
        <ModuleManagementCard
          key={row.key}
          sport={row.sport}
          module={row.module}
          details={row.details}
          planTitle={row.planTitle}
          note={row.note}
          onActionComplete={onActionComplete}
        />
      ))}
    </div>
  );
}
