import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, CheckCircle2, UserPlus, LogIn } from "lucide-react";
import { z } from "zod";
import { branding } from "@/branding";
import { AuthLanguageSelector } from "@/components/AuthLanguageSelector";
import { supabase } from "@/integrations/supabase/client";

const authSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const signUpSchema = authSchema.extend({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters" }),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user, signIn, signUp, resetPassword } = useAuth();

  const state = location.state as {
    role?: string;
    sport?: string;
    modules?: string[];
    fromPricing?: boolean;
    returnTo?: string;
    module?: string;
    mode?: string;
    fromPayment?: boolean;
    message?: string;
  };

  /**
   * Safe same-origin redirect resolver. Used to preserve invite/parent flows
   * (e.g. ?redirect=/accept-parent-invite?token=…) across sign-in/sign-up.
   * Accepts only relative paths starting with `/` and rejects protocol-
   * relative or absolute URLs.
   */
  const resolveRedirect = (): string | null => {
    const candidates: Array<string | undefined> = [
      searchParams.get("redirect") ?? undefined,
      state?.returnTo,
      (state as { from?: string } | undefined)?.from,
    ];
    for (const c of candidates) {
      if (!c || typeof c !== "string") continue;
      if (!c.startsWith("/")) continue;
      if (c.startsWith("//")) continue;
      if (c.includes("://")) continue;
      return c;
    }
    return null;
  };


  // If user is already authenticated and a ?redirect= target is present
  // (e.g. parent invite link), honor it immediately. Otherwise leave them
  // on the auth page — they may have landed here intentionally.
  useEffect(() => {
    if (!user) return;
    const target = resolveRedirect();
    if (target) navigate(target, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isForgotPassword) {
        const validated = z.object({ email: z.string().email() }).parse({ email });
        const { error } = await resetPassword(validated.email);

        if (error) {
          toast({
            title: t('auth.loginFailed'),
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: t('auth.checkYourEmail'),
            description: t('auth.passwordResetSent'),
          });
          setIsForgotPassword(false);
          setIsLogin(true);
        }
      } else if (isLogin) {
        const validated = authSchema.parse({ email, password });
        const { data, error } = await signIn(validated.email, validated.password);

        if (error) {
          toast({
            title: t('auth.loginFailed'),
            description: error.message,
            variant: "destructive",
          });
        } else if (data.user) {
          // Ledger-truth onboarding check. Profile/subscription existence
          // is NOT proof of onboarding — only a canonical asb_events row
          // (or a non-athlete role like scout/admin/owner) counts.
          const [rolesCheck, asbEventCheck] = await Promise.all([
            supabase
              .from('user_roles')
              .select('id, role')
              .eq('user_id', data.user.id)
              .limit(1),
            supabase
              .from('asb_events')
              .select('event_id', { count: 'exact', head: true })
              .eq('athlete_id', data.user.id),
          ]);

          const hasRole = !!(rolesCheck.data && rolesCheck.data.length > 0);
          const hasFirstEvent = (asbEventCheck.count ?? 0) > 0;
          const hasCompletedOnboarding = hasFirstEvent || hasRole;
          const isScout = rolesCheck.data?.some((r: { role: string }) => r.role === 'scout');

          console.log('[Auth] Onboarding check:', {
            userId: data.user.id,
            hasRole,
            hasFirstEvent,
            hasCompletedOnboarding,
          });

          toast({
            title: t('auth.welcomeBack'),
            description: t('auth.signInToContinue'),
          });

          // Preserve invite/parent flows: ?redirect=… wins over the
          // default onboarding gate when it's a safe relative path.
          const redirectTarget = resolveRedirect();
          if (redirectTarget) {
            setTimeout(() => navigate(redirectTarget, { replace: true }), 0);
          } else if (isScout) {
            setTimeout(() => navigate("/scout-dashboard", { replace: true }), 0);
          } else if (!hasCompletedOnboarding) {
            // Athlete with no canonical event and no role → start onboarding.
            setTimeout(() => navigate("/onboarding/athlete", { replace: true }), 0);
          } else if (!hasFirstEvent && !hasRole) {
            // Defensive: should be unreachable, but route to onboarding.
            setTimeout(() => navigate("/onboarding/athlete", { replace: true }), 0);
          } else {
            setTimeout(() => navigate("/dashboard", { replace: true }), 0);
          }
        }

      } else {
        const validated = signUpSchema.parse({ email, password, fullName });
        const { error } = await signUp(validated.email, validated.password, validated.fullName);

        if (error) {
          toast({
            title: t('auth.signupFailed'),
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: t('auth.accountCreated'),
            description: t('auth.letsSetupProfile'),
          });

          // Preserve invite/parent redirect across signup.
          const redirectTarget = resolveRedirect();
          if (redirectTarget) {
            navigate(redirectTarget, { replace: true });
          } else {
            navigate("/select-user-role", { replace: true });
          }
        }
      }



    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: t('auth.validationError'),
          description: error.issues[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          <div className="text-center mb-6">
            <div className="h-16 w-16 mx-auto mb-4">
              <img src={branding.logo} alt={branding.appName} className="h-full w-full object-contain" />
            </div>
          </div>

          {/* Prominent Language Selector */}
          <div className="mb-6 pb-4 border-b border-border">
            <AuthLanguageSelector />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">
              {isForgotPassword ? t('auth.resetPasswordTitle') : isLogin ? t('auth.welcomeBackTitle') : t('auth.createAccountTitle')}
            </h1>
            <p className="text-muted-foreground">
              {isForgotPassword 
                ? t('auth.resetPasswordDescription') 
                : isLogin 
                ? t('auth.signInDescription') 
                : t('auth.signUpDescription')}
            </p>
          </div>

          {state?.fromPayment && (
            <Alert className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                {state.message}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder={t('auth.namePlaceholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {!isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                )}
              </div>
            )}

            {!isLogin && !isForgotPassword && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('auth.dataPrivacyNote')}
                  </p>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading 
                ? t('common.loading') 
                : isForgotPassword 
                ? t('auth.sendResetLink') 
                : isLogin 
                ? t('auth.signIn') 
                : t('auth.signUp')}
            </Button>
          </form>

          {!isForgotPassword && isLogin ? (
            <div className="mt-6">
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wider">
                  <span className="bg-background px-3 text-muted-foreground">New to {branding.appName}?</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  setIsForgotPassword(false);
                  setIsLogin(false);
                }}
                className="w-full border-2 border-primary/60 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary font-semibold"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t('auth.dontHaveAccount')}
              </Button>
            </div>
          ) : !isForgotPassword && !isLogin ? (
            <div className="mt-6">
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wider">
                  <span className="bg-background px-3 text-muted-foreground">Already have an account?</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  setIsForgotPassword(false);
                  setIsLogin(true);
                }}
                className="w-full border-2 border-primary/60 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary font-semibold"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {t('auth.alreadyHaveAccount')}
              </Button>
            </div>
          ) : (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setIsLogin(!isLogin);
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isForgotPassword ? t('auth.backToSignIn') : t('auth.alreadyHaveAccount')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
