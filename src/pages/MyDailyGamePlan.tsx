import { DashboardLayout } from "@/components/DashboardLayout";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { GamePlanCard } from "@/components/GamePlanCard";

/** My Daily Game Plan — its own page, paid plans only (owner ruling 2026-10-01). */
export default function MyDailyGamePlan() {
  const saved = (() => { try { return localStorage.getItem("selectedSport"); } catch { return null; } })();
  const sport = saved === "softball" ? "softball" : "baseball";
  return (
    <DashboardLayout>
      <SubscriptionGate requiredAccess="any" featureName="My Daily Game Plan">
        <section className="mx-auto max-w-4xl p-3 sm:p-6" data-tour="game-plan-page">
          <GamePlanCard selectedSport={sport} defaultOpen />
        </section>
      </SubscriptionGate>
    </DashboardLayout>
  );
}
