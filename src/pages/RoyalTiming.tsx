import DashboardLayout from "@/components/DashboardLayout";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { RoyalTimingModule } from "@/components/royal-timing/RoyalTimingModule";

export default function RoyalTiming() {
  return (
    <DashboardLayout>
      <SubscriptionGate
        requiredAccess="any"
        featureName="Royal Timing"
        featureDescription="Premium video-based timing audit, comparison, and learning system"
      >
        <RoyalTimingModule />
      </SubscriptionGate>
    </DashboardLayout>
  );
}
