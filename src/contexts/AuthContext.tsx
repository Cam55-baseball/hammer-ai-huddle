import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { emitObservability } from '@/hooks/useEmitObservability';
import { clearProtectedEditing, isProtectedEditingActive } from '@/lib/auth/protectedEditing';
import { canEvictNow, noteTokenRefreshed, hasPersistedSupabaseToken } from '@/lib/auth/canEvict';


interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthStable: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
  updatePassword: (newPassword: string) => Promise<any>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthStable, setIsAuthStable] = useState(false);

  useEffect(() => {
    if (!loading) {
      const timeout = setTimeout(() => setIsAuthStable(true), 0);
      return () => clearTimeout(timeout);
    } else {
      setIsAuthStable(false);
    }
  }, [loading]);

  useEffect(() => {
    let cancelled = false;
    let pendingSignOutTimer: ReturnType<typeof setTimeout> | null = null;

    // Multi-retry verified sign-out. Spurious SIGNED_OUT events (network blips,
    // 401 retries, multi-tab races, WS reconnects) must never evict a still-
    // authenticated user. We retry getSession() with backoff, refuse to clear
    // while a persisted token exists on disk, and bail entirely when the eviction
    // gate says it's unsafe (tab hidden, offline, typing, recent refresh).
    const scheduleVerifiedSignOut = (delayMs = 500, attempt = 0) => {
      if (pendingSignOutTimer) clearTimeout(pendingSignOutTimer);
      pendingSignOutTimer = setTimeout(async () => {
        if (cancelled) return;

        const gate = canEvictNow();
        if (!gate.ok) {
          // Defer: re-check in a few seconds. Keep state as-is.
          // eslint-disable-next-line no-console
          console.info('[auth] eviction deferred:', gate.reason);
          if (attempt < 6) scheduleVerifiedSignOut(3_000, attempt + 1);
          return;
        }

        // Active live re-check.
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          setLoading(false);
          return;
        }

        // Persisted token still on disk — try to refresh before evicting.
        if (hasPersistedSupabaseToken()) {
          try {
            const { data: refreshed } = await supabase.auth.refreshSession();
            if (cancelled) return;
            if (refreshed?.session) {
              setSession(refreshed.session);
              setUser(refreshed.session.user);
              setLoading(false);
              return;
            }
          } catch {
            // fall through to retry
          }
        }

        // Retry up to 3 attempts with backoff before actually clearing.
        if (attempt < 3) {
          const backoff = [1_000, 2_000, 4_000][attempt] ?? 4_000;
          scheduleVerifiedSignOut(backoff, attempt + 1);
          return;
        }

        // eslint-disable-next-line no-console
        console.warn('[auth] verified sign-out after retries — clearing session');
        setUser(null);
        setSession(null);
        setLoading(false);
      }, delayMs);
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Skip transient null during token refresh — prevents flicker redirects
        if (event === 'TOKEN_REFRESHED' && !newSession) return;
        if (event === 'TOKEN_REFRESHED' && newSession) {
          noteTokenRefreshed();
        }

        if (event === 'SIGNED_OUT') {
          // Verify before evicting — spurious SIGNED_OUT events (network blips,
          // 401 retries, multi-tab races, WS reconnects) must not boot a still-
          // authenticated user. The verified path retries + refreshes.
          scheduleVerifiedSignOut();
          return;
        }

        if (pendingSignOutTimer) {
          clearTimeout(pendingSignOutTimer);
          pendingSignOutTimer = null;
        }
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (cancelled) return;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      if (pendingSignOutTimer) clearTimeout(pendingSignOutTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });
    // RFL-001 — canonical lifecycle topic. Lifetime-deduped per (athlete_id, topic, payload),
    // so failed signup never emits and refresh / replay never double-counts.
    if (!error && data?.user?.id) {
      const userId = data.user.id;
      void emitObservability({
        topic: 'athlete.lifecycle.signup',
        athleteId: userId,
        actorId: userId,
        actorRole: 'athlete',
        payload: { source: 'auth_page' },
        lifetime: true,
      });
    }
    return { data, error };
  };


  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    clearProtectedEditing();
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAuthStable, signUp, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
