import { useCallback, useMemo } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { useAdminAccess } from '@/hooks/useAdminAccess';

export const useTexVisionAccess = () => {
  // Get loading states from all dependent hooks to prevent race conditions
  const { modules, loading: subLoading } = useSubscription();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  // Aggregate loading state - wait for ALL hooks to finish
  const loading = subLoading || ownerLoading || adminLoading;

  // Tex Vision requires hitting module access
  const hasHittingAccess = useMemo(() => {
    return modules.some(m => m.includes('hitting'));
  }, [modules]);

  // Only evaluate access AFTER all hooks have finished loading
  const hasAccess = useMemo(() => {
    if (loading) return false; // Defer access check until loaded
    return isOwner || isAdmin || hasHittingAccess;
  }, [loading, isOwner, isAdmin, hasHittingAccess]);

  const isOwnerOrAdmin = useMemo(() => {
    return isOwner || isAdmin;
  }, [isOwner, isAdmin]);

  const getAccessReason = useCallback(() => {
    if (isOwner) return 'owner';
    if (isAdmin) return 'admin';
    if (hasHittingAccess) return 'subscription';
    return 'none';
  }, [isOwner, isAdmin, hasHittingAccess]);

  return {
    hasAccess,
    loading,
    isOwnerOrAdmin,
    hasHittingAccess,
    getAccessReason,
  };
};
