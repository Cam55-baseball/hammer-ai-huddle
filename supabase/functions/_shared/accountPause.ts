// Paused accounts (under 13, pending a parent or guardian) get no uploads,
// no AI analysis and no new data. Fail-open on a read error would collect
// data from a child, so a read error counts as paused.
// Always reads with the service role: user-scoped clients may not see the
// row under row rules, which would wrongly count everyone as paused.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function isAccountPaused(_client: unknown, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const admin: any = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data, error } = await admin.from("profiles").select("account_paused_at").eq("id", userId).maybeSingle();
    if (error) return true;
    return !!data?.account_paused_at;
  } catch {
    return true;
  }
}

export function pausedResponse(cors: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error: "account_paused", message: "This account is paused until a parent or guardian sets it up." }), {
    status: 403, headers: { ...cors, "Content-Type": "application/json" },
  });
}

/**
 * For functions that had no sign-in check: requires a signed-in caller who is
 * not paused. Returns a Response to send back, or null to continue.
 */
export async function guardSignedInNotPaused(req: Request, cors: Record<string, string> = {}): Promise<Response | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const deny = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (!token) return deny(401, "unauthorized");
  try {
    const admin: any = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data } = await admin.auth.getUser(token);
    const uid = data?.user?.id;
    if (!uid) return deny(401, "unauthorized");
    if (await isAccountPaused(null, uid)) return pausedResponse(cors);
    return null;
  } catch {
    return deny(401, "unauthorized");
  }
}
