import { DashboardLayout } from "@/components/DashboardLayout";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { RoyalTimingModule } from "@/components/royal-timing/RoyalTimingModule";
import { useTranslation } from 'react-i18next';

export default function RoyalTiming() {
  const { t } = useTranslation();
  return (
    <DashboardLayout>
      <SubscriptionGate
        requiredAccess="any"
        featureName="Royal Timing"
        featureDescription={t('royalTiming.explanation')}
      >
        <RoyalTimingModule />
      </SubscriptionGate>
    </DashboardLayout>
  );
}
