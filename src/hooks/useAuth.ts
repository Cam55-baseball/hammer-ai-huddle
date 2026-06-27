import { useContext } from 'react';
import { AuthContext, useAuthContext } from '@/contexts/AuthContext';

/**
 * Required-auth hook: throws if no AuthProvider is mounted.
 * Use this in pages and components that cannot function without a session.
 */
export const useAuth = () => {
  return useAuthContext();
};

/**
 * Optional-auth hook: returns null user/session if the provider is unavailable
 * (e.g. transient HMR module duplication, render-time race). Use this in leaf
 * components where missing auth should degrade gracefully instead of throwing.
 */
export const useOptionalAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      session: null,
      loading: false,
      isAuthStable: true,
    } as const;
  }
  return ctx;
};
