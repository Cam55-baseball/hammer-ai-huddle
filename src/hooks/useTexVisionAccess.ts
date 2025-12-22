import { useCallback, useMemo } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { useAdminAccess } from '@/hooks/useAdminAccess';

export const useTexVisionAccess = () => {
  const { modules } = useSubscription();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();

  // Tex Vision requires hitting module access
  const hasHittingAccess = useMemo(() => {
    return modules.some(m => m.includes('hitting'));
  }, [modules]);

  const hasAccess = useMemo(() => {
    return isOwner || isAdmin || hasHittingAccess;
  }, [isOwner, isAdmin, hasHittingAccess]);

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
    isOwnerOrAdmin,
    hasHittingAccess,
    getAccessReason,
  };
};
