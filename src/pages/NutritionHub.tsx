import { DashboardLayout } from "@/components/DashboardLayout";
import { NutritionHubContent } from "@/components/nutrition-hub/NutritionHubContent";
import { SubscriptionGate } from "@/components/SubscriptionGate";

const NutritionHub = () => {
  return (
    <DashboardLayout>
      <SubscriptionGate 
        requiredAccess="any" 
        featureName="Nutrition Hub"
        featureDescription="Track macros, log meals, get AI-powered nutrition insights, and monitor your body composition."
      >
        <NutritionHubContent />
      </SubscriptionGate>
    </DashboardLayout>
  );
};

export default NutritionHub;
