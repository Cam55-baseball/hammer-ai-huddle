/**
 * Runs on hammersmodality.org inside the iPhone/iPad app's in-app browser sheet
 * (never the Safari app). Sign in with Apple goes through the managed sign-in
 * broker on this website; once signed in, the session is handed back to the app
 * on its own URL scheme and removed from this sheet's storage.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AUTH_STORAGE_KEY } from "@/lib/auth/nativeSessionStore";
import { buildNativeReturn } from "@/lib/auth/nativeOAuth";

const isSafe = (p: string | null) => !!p && p.startsWith("/") && !p.startsWith("//");

export default function NativeAppleSignIn() {
  const [msg, setMsg] = useState("Opening Sign in with Apple…");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const redirect = isSafe(q.get("redirect")) ? q.get("redirect") : null;
    const back = (p: Parameters<typeof buildNativeReturn>[0]) => { window.location.href = buildNativeReturn({ ...p, redirect }); };
    (async () => {
      if (q.get("done") !== "1") {
        const ret = new URL("/auth/native-apple", window.location.origin);
        ret.searchParams.set("done", "1");
        if (redirect) ret.searchParams.set("redirect", redirect);
        const r = await lovable.auth.signInWithOAuth("apple", { redirect_uri: ret.toString() });
        if (r.error) return back({ error: r.error.message || "sign_in_failed" });
        if (r.redirected) return;
      }
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        const s = data.session;
        if (s) {
          setMsg("Signed in. Returning to the app…");
          try { if (AUTH_STORAGE_KEY) localStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* ignore */ }
          return back({ accessToken: s.access_token, refreshToken: s.refresh_token });
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      setMsg("Sign in didn't finish. Close this and try again.");
      back({ error: "sign_in_failed" });
    })().catch(() => back({ error: "sign_in_failed" }));
  }, []);
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background p-6 text-center">
      <p className="text-base text-muted-foreground">{msg}</p>
    </main>
  );
}
