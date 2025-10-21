import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ProfileSetup = () => {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Get role from navigation state if available
    const state = location.state as { role?: string };
    if (state?.role) {
      setSelectedRole(state.role);
    }
  }, [user, navigate, location]);

  const handleStartFreeTrial = async () => {
    if (!selectedRole || !user) return;

    try {
      // Map role to enum value
      const roleMap: Record<string, AppRole> = {
        'Player': 'player',
        'Coach': 'coach',
        'Recruiter/Scout': 'recruiter',
      };
      
      const roleValue = roleMap[selectedRole] || ('player' as AppRole);

      // Insert user role
      const { error } = await supabase
        .from('user_roles')
        .insert([
          {
            user_id: user.id,
            role: roleValue,
          }
        ]);

      if (error) throw error;

      toast({
        title: "Profile Complete!",
        description: `Your ${selectedRole} profile has been set up successfully.`,
      });

      navigate("/");
    } catch (error) {
      console.error('Error setting up profile:', error);
      toast({
        title: "Setup Failed",
        description: "There was an error setting up your profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-bold text-2xl">H</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
            <p className="text-muted-foreground">
              You've selected the {selectedRole} role. Ready to start your journey?
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-muted/30 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Your Free Trial Includes:</h2>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>AI-powered motion capture analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Real-time performance metrics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Access to training programs and drills</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Performance tracking and progress reports</span>
                </li>
              </ul>
            </div>

            <Button 
              onClick={handleStartFreeTrial}
              size="xl"
              className="w-full"
            >
              Start Free Trial
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              No credit card required. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
