import { ReactNode } from 'react';
import { useDataDensityLevel } from '@/hooks/useDataDensityLevel';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { dataDensityLevels } from '@/data/dataDensityLevels';
import { usePurchaseAvailability } from '@/hooks/usePurchaseAvailability';
import { PurchaseUnavailable } from '@/components/purchase/PurchaseUnavailable';

interface DataDensityGateProps {
  requiredLevel: number;
  children: ReactNode;
}

export function DataDensityGate({ requiredLevel, children }: DataDensityGateProps) {
  const { level } = useDataDensityLevel();
  const { canShowPurchaseUI } = usePurchaseAvailability();

  if (level >= requiredLevel) return <>{children}</>;

  const needed = dataDensityLevels.find(d => d.level === requiredLevel);

  // Purchase hidden: drop the tier name and the upgrade sentence entirely.
  if (!canShowPurchaseUI) {
    return <PurchaseUnavailable />;
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <Lock className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm font-medium">Requires {needed?.name ?? `Level ${requiredLevel}`} Data Density</p>
        <p className="text-xs text-muted-foreground mt-1">
          Upgrade to {needed?.subscriptionTier ?? 'a higher tier'} to unlock this feature.
        </p>
      </CardContent>
    </Card>
  );
}
