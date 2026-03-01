import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { UpgradePrompt } from './UpgradePrompt';
import { Skeleton } from '@/components/ui/skeleton';

interface SubscriptionGateProps {
  requiredAccess: 'any' | 'hitting' | 'pitching' | 'throwing';
  featureName: string;
  featureDescription?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function SubscriptionGate({ 
  requiredAccess, 
  featureName, 
  featureDescription,
  children, 
  fallback 
}: SubscriptionGateProps) {
  const { modules, loading, initialized } = useSubscription();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();

  // Show skeleton while loading
  if (loading || !initialized || ownerLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // Owner/Admin always bypass
  if (isOwner) {
    return <>{children}</>;
  }

  // Check access
  const hasAccess = requiredAccess === 'any' 
    ? modules.length > 0 
    : modules.some(m => m.includes(requiredAccess));

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show fallback or default upgrade prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <UpgradePrompt 
      featureName={featureName} 
      featureDescription={featureDescription}
      variant="full"
    />
  );
}
