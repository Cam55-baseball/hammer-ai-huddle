import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { branding } from "@/branding";
import { cn } from "@/lib/utils";

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
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [passwordValid, setPasswordValid] = useState<boolean | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong" | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
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

  // Real-time email validation
  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  // Password strength calculation
  const calculatePasswordStrength = (pwd: string): "weak" | "medium" | "strong" => {
    if (pwd.length < 6) return "weak";
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    const strengthScore = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    if (strengthScore >= 3 && pwd.length >= 8) return "strong";
    if (strengthScore >= 2 || pwd.length >= 8) return "medium";
    return "weak";
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value.length > 0) {
      setEmailValid(validateEmail(value));
    } else {
      setEmailValid(null);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value.length > 0) {
      setPasswordValid(value.length >= 6);
      if (!isLogin) {
        setPasswordStrength(calculatePasswordStrength(value));
      }
    } else {
      setPasswordValid(null);
      setPasswordStrength(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Haptic feedback on submit
    if ('vibrate' in navigator && window.innerWidth < 768) {
      navigator.vibrate(20);
    }
    
    setIsLoading(true);

    try {
      if (isForgotPassword) {
        const validated = z.object({ email: z.string().email() }).parse({ email });
        const { error } = await resetPassword(validated.email);

        if (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Check Your Email",
            description: "We've sent you a password reset link.",
          });
          setIsForgotPassword(false);
          setIsLogin(true);
        }
      } else if (isLogin) {
        const validated = authSchema.parse({ email, password });
        const { data, error } = await signIn(validated.email, validated.password);

        if (error) {
          toast({
            title: "Login Failed",
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
            title: "Welcome Back!",
            description: "Successfully logged in.",
          });
          
          // Route based on onboarding status and role
          if (hasCompletedOnboarding) {
            // Check if user is a scout
            const isScout = rolesCheck.data?.some((r: any) => r.role === 'scout');
            
            if (state?.returnTo) {
              setTimeout(() => {
                navigate(state.returnTo, { 
                  state: {
                    sport: state.sport,
                    module: state.module,
                    mode: state.mode
                  },
                  replace: true 
                });
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
            title: "Signup Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account Created!",
            description: "Let's set up your profile.",
          });
          
          // Navigate to role selection for new signups
          navigate("/select-user-role", { replace: true });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
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
            <h1 className="text-2xl font-bold mb-2">
              {isForgotPassword ? "Reset Password" : isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-muted-foreground">
              {isForgotPassword 
                ? "Enter your email to receive a password reset link" 
                : isLogin 
                ? "Sign in to continue to Hammers Modality" 
                : "Join Hammers Modality today"}
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
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  required
                  disabled={isLoading}
                  className={cn(
                    "text-base pr-10",
                    emailValid === true && "border-green-500",
                    emailValid === false && "border-destructive"
                  )}
                  inputMode="email"
                  aria-describedby={emailValid === false ? "email-error" : undefined}
                />
                {emailValid === true && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 animate-checkmark">
                    ✓
                  </span>
                )}
              </div>
              {emailValid === false && (
                <span id="email-error" className="text-xs text-destructive">
                  Please enter a valid email address
                </span>
              )}
            </div>

            {!isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    required
                    disabled={isLoading}
                    className={cn(
                      "text-base pr-10",
                      passwordValid === true && "border-green-500",
                      passwordValid === false && "border-destructive"
                    )}
                    aria-describedby={passwordValid === false ? "password-error" : undefined}
                  />
                  {passwordValid === true && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 animate-checkmark">
                      ✓
                    </span>
                  )}
                </div>
                {passwordValid === false && (
                  <span id="password-error" className="text-xs text-destructive">
                    Password must be at least 6 characters
                  </span>
                )}
                {!isLogin && passwordStrength && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      <div className={cn(
                        "h-1 flex-1 rounded",
                        passwordStrength === "weak" ? "bg-destructive" : "bg-muted",
                        passwordStrength === "medium" || passwordStrength === "strong" ? "bg-yellow-500" : "",
                        passwordStrength === "strong" ? "bg-green-500" : ""
                      )} />
                      <div className={cn(
                        "h-1 flex-1 rounded",
                        passwordStrength === "medium" || passwordStrength === "strong" ? "bg-yellow-500" : "bg-muted",
                        passwordStrength === "strong" ? "bg-green-500" : ""
                      )} />
                      <div className={cn(
                        "h-1 flex-1 rounded",
                        passwordStrength === "strong" ? "bg-green-500" : "bg-muted"
                      )} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Password strength: <span className={cn(
                        passwordStrength === "weak" && "text-destructive",
                        passwordStrength === "medium" && "text-yellow-600",
                        passwordStrength === "strong" && "text-green-600"
                      )}>{passwordStrength}</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {!isLogin && !isForgotPassword && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your data is never shared without your consent, and we employ robust security measures to protect it.
                  </p>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full spinner" />
                  {isForgotPassword ? "Sending reset link..." : isLogin ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                isForgotPassword ? "Send Reset Link" : isLogin ? "Sign In" : "Sign Up"
              )}
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
                ? "Back to sign in" 
                : isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
