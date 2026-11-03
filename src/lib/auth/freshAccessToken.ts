import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a current access token, refreshing it first when it is expired or
 * about to expire. Returns null when nobody is signed in, so callers can skip
 * a request instead of sending a stale token that the server rejects with 401.
 */
export async function freshAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const s = data.session;
  if (!s) return null;
  const expiresMs = (s.expires_at ?? 0) * 1000;
  if (expiresMs - Date.now() > 60_000) return s.access_token;
  const { data: r } = await supabase.auth.refreshSession();
  return r.session?.access_token ?? null;
}
