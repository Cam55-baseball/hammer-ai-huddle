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

  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Get selections from navigation state or localStorage
    const state = location.state as { role?: string; sport?: string; modules?: string[] };
    const role = state?.role || localStorage.getItem('selectedRole');
    const sport = state?.sport || localStorage.getItem('selectedSport');
    const modules = state?.modules || JSON.parse(localStorage.getItem('selectedModules') || '[]');

    if (role) setSelectedRole(role);
    if (sport) setSelectedSport(sport);
    if (modules) setSelectedModules(modules);

    // If no role selected, redirect to start
    if (!role) {
      navigate("/");
    }
  }, [user, navigate, location]);

  const handleStartFreeTrial = async () => {
    if (!selectedRole || !user) return;

    try {
      // Map role to enum value
      const roleMap: Record<string, AppRole> = {
        'Player': 'player',
        'Admin': 'admin',
        'Coach': 'coach',
        'Scout/Coach/Recruiter': 'recruiter',
        'Recruiter/Scout': 'recruiter',
      };
      
      const roleValue = roleMap[selectedRole] || ('player' as AppRole);

      // Map sport to enum value
      const sportMap: Record<string, 'baseball' | 'softball'> = {
        'baseball': 'baseball',
        'softball': 'softball',
      };
      const sportValue = sportMap[selectedSport.toLowerCase()] || 'baseball';

      // Insert user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: roleValue,
        });

      if (roleError) throw roleError;

      // Insert user progress for each selected module
      if (selectedModules.length > 0) {
        const progressRecords = selectedModules.map(module => ({
          user_id: user.id,
          sport: sportValue,
          module: module as 'hitting' | 'pitching' | 'throwing',
          videos_analyzed: 0,
          average_efficiency_score: null,
        }));

        const { error: progressError } = await supabase
          .from('user_progress')
          .insert(progressRecords);

        if (progressError) throw progressError;
      }

      // Clear localStorage selections
      localStorage.removeItem('selectedRole');
      localStorage.removeItem('selectedSport');
      localStorage.removeItem('selectedModules');

      toast({
        title: "Profile Complete!",
        description: `Your ${selectedRole} profile has been set up successfully.`,
      });

      navigate("/dashboard");
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
              You've selected the {selectedRole} role for {selectedSport}. Ready to start your journey?
            </p>
            {selectedModules.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mt-3">
                {selectedModules.map((module) => (
                  <span key={module} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm capitalize">
                    {module}
                  </span>
                ))}
              </div>
            )}
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
