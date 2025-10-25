import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const signUpSchema = authSchema.extend({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters" }),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, signIn, signUp } = useAuth();

  const state = location.state as { role?: string; sport?: string; modules?: string[]; fromPricing?: boolean };

  useEffect(() => {
    // Don't redirect if user is already authenticated
    // They might be on this page intentionally
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const validated = authSchema.parse({ email, password });
        const { data, error } = await signIn(validated.email, validated.password);

        if (error) {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Welcome Back!",
            description: "Successfully logged in.",
          });
          
          // Wait briefly for session to fully establish
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log('Auth: Login successful, checking user role and subscription...');
          
          // Check if user has completed profile setup
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            const { data: roleData, error: roleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', authUser.id)
              .maybeSingle();
            
            if (roleError) {
              console.error('Auth: Error checking user role:', roleError);
            }
            
            if (roleData) {
              console.log('Auth: User has role, checking subscription...');
              
              // Check subscription status
              const { data: subData } = await supabase
                .from('subscriptions')
                .select('subscribed_modules')
                .eq('user_id', authUser.id)
                .maybeSingle();
              
              if (!subData || !subData.subscribed_modules || subData.subscribed_modules.length === 0) {
                console.log('Auth: No active subscription, navigating to checkout');
                navigate("/checkout", { replace: true });
              } else {
                console.log('Auth: Active subscription found, navigating to dashboard');
                navigate("/dashboard", { replace: true });
              }
            } else {
              console.log('Auth: No role found, navigating to profile-setup');
              navigate("/profile-setup", { replace: true });
            }
          } else {
            console.log('Auth: No user object, navigating to profile-setup');
            navigate("/profile-setup", { replace: true });
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
            description: "Please complete your profile setup.",
          });
          
          // Navigate to profile setup with selections
          navigate("/profile-setup", { 
            state: { 
              role: state?.role, 
              sport: state?.sport, 
              modules: state?.modules 
            } 
          });
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
            <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-bold text-2xl">H</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin ? "Sign in to continue to Hammers Modality" : "Join Hammers Modality today"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
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
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
