import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { branding } from "@/branding";
import { AuthLanguageSelector } from "@/components/AuthLanguageSelector";

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

  useEffect(() => {
    // Don't redirect if user is already authenticated
    // They might be on this page intentionally
  }, [user, navigate]);

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
          // Multi-factor onboarding check
          const { supabase } = await import("@/integrations/supabase/client");
          
          const [profileCheck, subscriptionCheck, rolesCheck, scoutAppCheck] = await Promise.all([
            // Check if user has a profile with essential data
            supabase
              .from('profiles')
              .select('id, first_name, last_name, full_name')
              .eq('id', data.user.id)
              .maybeSingle(),
            
            // Check if user has a subscription
            supabase
              .from('subscriptions')
              .select('id')
              .eq('user_id', data.user.id)
              .limit(1),
            
          // Check if user has a role (scout/admin/owner)
          supabase
            .from('user_roles')
            .select('id, role')
            .eq('user_id', data.user.id)
            .limit(1),
          
          // Check for scout application
          supabase
            .from('scout_applications')
            .select('status')
            .eq('user_id', data.user.id)
            .maybeSingle()
        ]);

          // User is onboarded if they have profile data, subscription, or role
        const hasProfile = profileCheck.data && (
          profileCheck.data.first_name || 
          profileCheck.data.last_name || 
          profileCheck.data.full_name
        );
        const hasSubscription = subscriptionCheck.data && subscriptionCheck.data.length > 0;
        const hasRole = rolesCheck.data && rolesCheck.data.length > 0;
        const hasPendingScoutApp = scoutAppCheck.data?.status === 'pending';

        const hasCompletedOnboarding = hasProfile || hasSubscription || hasRole;

        console.log('[Auth] Onboarding check:', {
          userId: data.user.id,
          hasProfile,
          hasSubscription,
          hasRole,
          hasPendingScoutApp,
          hasCompletedOnboarding
        });

          toast({
            title: t('auth.welcomeBack'),
            description: t('auth.signInToContinue'),
          });
          
          // Route based on onboarding status and role
          if (hasCompletedOnboarding) {
            // Check if user is a scout
            const isScout = rolesCheck.data?.some((r: any) => r.role === 'scout');
            
            const redirectTarget = state?.returnTo || (state as any)?.from;
            if (redirectTarget) {
              setTimeout(() => {
                navigate(redirectTarget, { replace: true });
              }, 0);
            } else if (isScout) {
              // Scouts go to scout dashboard
              setTimeout(() => {
                navigate("/scout-dashboard", { replace: true });
              }, 0);
            } else {
              // Players/others go to regular dashboard
              setTimeout(() => {
                navigate("/dashboard", { replace: true });
              }, 0);
            }
          } else {
            // New user - start onboarding at role selection
            setTimeout(() => {
              navigate("/select-user-role", { replace: true });
            }, 0);
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
          
          // Navigate to role selection for new signups
          navigate("/select-user-role", { replace: true });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: t('auth.validationError'),
          description: error.errors[0].message,
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

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setIsLogin(!isLogin);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isForgotPassword 
                ? t('auth.backToSignIn') 
                : isLogin 
                ? t('auth.dontHaveAccount') 
                : t('auth.alreadyHaveAccount')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
