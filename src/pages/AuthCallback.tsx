import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { resolvePostLoginRoute, withLoginTimeout, isSafeRelativePath } from "@/lib/auth/postLoginRoute";
import { extractFullNameFromUser, getAuthProvider } from "@/lib/auth/appleIdentity";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Landing point for every third-party sign-in round trip.
 *
 * Apple hands us the user's name exactly once — on the first authorization —
 * so this is where it gets captured and written straight to the profile. When
 * no name arrives (a returning Apple user whose profile is still blank), we
 * do NOT write an empty profile: we send the person to fill their name in.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [failure, setFailure] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const redirectParam = searchParams.get("redirect");
    const redirectTarget = isSafeRelativePath(redirectParam) ? redirectParam : null;

    // Apple/Supabase report provider-side refusals on the URL, not as a throw.
    const errorDescription =
      searchParams.get("error_description") ?? searchParams.get("error");

    const run = async () => {
      if (errorDescription) {
        setFailure(
          "That sign-in didn't complete. Please try again, or sign in with your email and password.",
        );
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (error || !user) {
        setFailure(
          "We couldn't finish signing you in. Please try again from the sign-in page.",
        );
        return;
      }

      const provider = getAuthProvider(user);

      // FIRST-CALLBACK NAME CAPTURE. Persist immediately — Apple never sends
      // it again. Failure here must never strand the user.
      let hasName = false;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        const existing = (profile?.full_name ?? "").trim();
        if (existing.length > 0) {
          hasName = true;
        } else {
          const providerName = extractFullNameFromUser(user);
          if (providerName) {
            const { error: writeError } = await supabase
              .from("profiles")
              .update({ full_name: providerName })
              .eq("id", user.id);
            hasName = !writeError;
          }
        }
      } catch {
        // Treat as "unknown name" — the completion screen is safe either way.
        hasName = false;
      }

      const gateRead = (async () => {
        const [rolesCheck, asbEventCheck] = await Promise.all([
          supabase.from("user_roles").select("id, role").eq("user_id", user.id).limit(1),
          supabase
            .from("asb_events")
            .select("event_id", { count: "exact", head: true })
            .eq("athlete_id", user.id),
        ]);
        const roles = (rolesCheck.data ?? []).map((r: { role: string }) => r.role);
        const isScout = roles.includes("scout");
        const isCoach = roles.includes("coach");

        let hasStaffContext = true;
        if (isScout || isCoach) {
          const table = isScout ? "scout_context" : "coach_context";
          const { data: ctx } = await supabase
            .from(table)
            .select("completed_at")
            .eq("user_id", user.id)
            .maybeSingle();
          hasStaffContext = !!ctx?.completed_at;
        }

        return { roles, hasFirstEvent: (asbEventCheck.count ?? 0) > 0, hasStaffContext };
      })();

      const { value: gate, degraded } = await withLoginTimeout(gateRead, {
        roles: [] as string[],
        hasFirstEvent: false,
        hasStaffContext: true,
      });

      const destination = resolvePostLoginRoute({ redirectTarget, ...gate, degraded });

      // Brand-new third-party account with no role yet → same role selection
      // everyone else gets. Missing name → collect it first, then continue.
      const isNewAccount = !degraded && gate.roles.length === 0 && !gate.hasFirstEvent;
      const next = redirectTarget ?? (isNewAccount ? "/select-user-role" : destination);

      if (!hasName && provider !== "email") {
        navigate(`/complete-profile?redirect=${encodeURIComponent(next)}`, { replace: true });
        return;
      }

      navigate(next, { replace: true });
    };

    void run();
  }, [navigate, searchParams]);

  if (failure) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-background to-muted/30">
        <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-lg space-y-4">
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
          <Button className="w-full" onClick={() => navigate("/auth", { replace: true })}>
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
};

export default AuthCallback;
