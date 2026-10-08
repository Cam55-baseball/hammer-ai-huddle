/**
 * Website landing for "Subscribe on our website" from the iOS app.
 * Signs into the SAME account the app was using (single-use token), refusing
 * if the token belongs to a different account than expected, then continues
 * to checkout with a "Return to the app" option.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export const FROM_APP_KEY = "hm_from_app";

export default function AppHandoff() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const th = sp.get("th");
    const uid = sp.get("uid");
    const nextRaw = sp.get("next") ?? "/checkout";
    const next = /^\/(checkout|pricing|select-modules)/.test(nextRaw) ? nextRaw : "/checkout";
    (async () => {
      try {
        if (!th || !uid) throw new Error("missing");
        await supabase.auth.signOut({ scope: "local" });
        const { data, error } = await supabase.auth.verifyOtp({ token_hash: th, type: "magiclink" });
        if (error || data.user?.id !== uid) {
          await supabase.auth.signOut({ scope: "local" });
          throw new Error("mismatch");
        }
        sessionStorage.setItem(FROM_APP_KEY, "1");
        navigate(next, { replace: true });
      } catch {
        setFailed(true);
      }
    })();
  }, [sp, navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full p-6 text-center space-y-2">
        {failed ? (
          <>
            <h1 className="text-xl font-semibold">This link has expired</h1>
            <p className="text-sm text-muted-foreground">Close this window and tap the button in the app again.</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Signing you in to your account…</p>
        )}
      </Card>
    </main>
  );
}
