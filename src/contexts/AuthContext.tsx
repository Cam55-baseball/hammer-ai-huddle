import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { emitObservability } from '@/hooks/useEmitObservability';


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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Skip transient null during token refresh — prevents flicker redirects
        if (event === 'TOKEN_REFRESHED' && !newSession) return;

        if (event === 'SIGNED_OUT') {
          // Verify before evicting — spurious SIGNED_OUT events (network blips,
          // 401 retries, multi-tab races) must not boot a still-authenticated user.
          if (pendingSignOutTimer) clearTimeout(pendingSignOutTimer);
          pendingSignOutTimer = setTimeout(async () => {
            if (cancelled) return;
            const { data } = await supabase.auth.getSession();
            if (cancelled) return;
            if (!data.session) {
              setUser(null);
              setSession(null);
            } else {
              setSession(data.session);
              setUser(data.session.user);
            }
            setLoading(false);
          }, 250);
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
