import { supabase } from '@/integrations/supabase/client';
import { freshAccessToken } from './freshAccessToken';

/**
 * Calls a server function with a fresh sign-in token. While the session is
 * changing (sign-out, account switch, token refresh) it returns
 * `{ signedOut: true }` instead of firing a request the server rejects as 401.
 */
export async function invokeSignedIn<T = any>(name: string, body: unknown): Promise<{ signedOut: true; data?: undefined } | { signedOut: false; data: T }> {
  const token = await freshAccessToken();
  if (!token) return { signedOut: true };
  const { data, error } = await supabase.functions.invoke(name, { body: body as any, headers: { Authorization: `Bearer ${token}` } });
  if (error && (error as any)?.context?.status === 401) return { signedOut: true };
  if (error) throw error;
  return { signedOut: false, data: data as T };
}
