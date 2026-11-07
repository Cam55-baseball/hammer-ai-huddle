// Owner Nov 6: "Find Your Training Plan" — the items that used to sit under the Dashboard's
// baseball/softball toggle, moved here unchanged and in the same order.
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { HMLoadingFallback } from "@/components/loading/HMLoadingScreen";
import { Button } from "@/components/ui/button";
import { PlanTiles } from "@/components/dashboard/PlanTiles";
import { StaffPlanTiles } from "@/components/staff/StaffPlanTiles";
import { AddOnsSection } from "@/components/dashboard/AddOnsSection";
import { SportToggleRow, isSport, savedSport, useSportSwitch } from "@/components/dashboard/SportToggle";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useScoutAccess } from "@/hooks/useScoutAccess";
import { usePurchaseAvailability } from "@/hooks/usePurchaseAvailability";
import { useProgramsRetired } from "@/hooks/useProgramsRetired";
import { plansForSport } from "@/utils/tierAccess";
import { planTileDestination, pricingState } from "@/lib/dashboard/trainingPlans";

export default function TrainingPlans() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, session, loading: authLoading, isAuthStable } = useAuth();
  const subscription = useSubscription();
  const { loading: subLoading, refetch, hasAccessForSport } = subscription;
  const { canShowPurchaseUI, mode: purchaseMode, isStaffAccount, roleLoading: purchaseRoleLoading } = usePurchaseAvailability();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const { loading: scoutLoading } = useScoutAccess();
  const { retired: programsRetired } = useProgramsRetired();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Opens on the sport the Dashboard had selected.
  const { selectedSport, handleSportChange, dialog } = useSportSwitch(() => {
    const fromUrl = params.get("sport");
    return isSport(fromUrl) ? fromUrl : savedSport() ?? "baseball";
  });

  const heldPlans: string[] = plansForSport(subscription, selectedSport);
  const isTierUnlocked = (tier: string) => isOwner || isAdmin || heldPlans.includes(tier);
  const hasAnyTier = isOwner || isAdmin || heldPlans.length > 0;

  useEffect(() => {
    if (!authLoading && isAuthStable && !user && !session) navigate("/auth", { replace: true });
  }, [authLoading, isAuthStable, user, session, navigate]);

  const handleRefreshAccess = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success(t("dashboard.subscriptionRefreshed"));
    } catch (error) {
      console.error("Error refreshing subscription:", error);
      toast.error(t("errors.somethingWentWrong"));
    } finally {
      setIsRefreshing(false);
    }
  };

  if (authLoading || subLoading || scoutLoading) return <HMLoadingFallback />;

  const onSelect = (module: "pitcher" | "5tool" | "golden2way") => {
    const dest = planTileDestination({
      module, sport: selectedSport, isOwnerOrAdmin: isOwner || isAdmin, canShowPurchaseUI,
      isTierUnlocked, heldPlans, hasAccessForSport,
    });
    if (dest) navigate(dest.path, dest.state ? { state: dest.state } : undefined);
  };

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-5 overflow-x-hidden max-w-full">
        <Button variant="outline" className="min-h-11 gap-2" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Find Your Training Plan</h1>

        {!purchaseRoleLoading && !isStaffAccount && (
          <>
            <SportToggleRow selectedSport={selectedSport} onSportChange={handleSportChange} onRefresh={handleRefreshAccess} isRefreshing={isRefreshing} />
            <PlanTiles
              isTierUnlocked={isTierUnlocked}
              heldPlans={heldPlans}
              canShowPurchaseUI={canShowPurchaseUI}
              purchaseMode={purchaseMode}
              programsRetired={programsRetired}
              onSelect={onSelect}
              onUnlock={(tier) => navigate("/pricing", { state: pricingState(selectedSport, tier) })}
            />
          </>
        )}

        {/* Coach and Organization plans — the same regular-size advertising tiles for every account (owner 2026-10-13). */}
        {!purchaseRoleLoading && canShowPurchaseUI && <StaffPlanTiles />}

        {/* Add-ons (owner Nov 6): right under the Coach and Organization plans tiles. */}
        {!purchaseRoleLoading && canShowPurchaseUI && !isStaffAccount && <AddOnsSection hasActivePlan={hasAnyTier} />}
        {dialog}
      </div>
    </DashboardLayout>
  );
}
