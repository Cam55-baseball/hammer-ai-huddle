import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const state = location.state as { role?: string; sport?: string; module?: string };

  const selectedRole = state?.role || localStorage.getItem('selectedRole');
  const selectedSport = state?.sport || localStorage.getItem('selectedSport');
  const selectedModule = state?.module || localStorage.getItem('selectedModule');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!selectedRole) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate, selectedRole]);

  const handleCompleteSetup = async () => {
    if (!user || !selectedRole) {
      toast({
        title: "Missing Information",
        description: "Please select a role before continuing.",
        variant: "destructive",
      });
      return;
    }

    try {
      const roleMap: { [key: string]: Database['public']['Enums']['app_role'] } = {
        'Player': 'player',
        'Scout/Coach': 'recruiter',
        'Admin': 'admin'
      };

      const sportMap: { [key: string]: Database['public']['Enums']['sport_type'] } = {
        'baseball': 'baseball',
        'softball': 'softball'
      };

      const dbRole = roleMap[selectedRole] || 'player' as Database['public']['Enums']['app_role'];
      const dbSport = sportMap[selectedSport || 'baseball'] || 'baseball' as Database['public']['Enums']['sport_type'];

      // Insert role with status (pending for admin, active for others)
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{ 
          user_id: user.id, 
          role: dbRole,
          status: dbRole === 'admin' ? 'pending' : 'active'
        }]);

      if (roleError) throw roleError;

      if (selectedModule) {
        const { error: progressError } = await supabase
          .from('user_progress')
          .insert([{
            user_id: user.id,
            module: selectedModule as Database['public']['Enums']['module_type'],
            sport: dbSport,
            videos_analyzed: 0,
            average_efficiency_score: null,
          }]);

        if (progressError) throw progressError;
      }

      localStorage.removeItem('selectedRole');
      localStorage.removeItem('selectedSport');
      localStorage.removeItem('selectedModule');

      // Show appropriate message based on role
      if (dbRole === 'admin') {
        toast({
          title: "Admin Access Requested",
          description: "Your admin access request has been submitted. The owner will review it shortly.",
        });
      } else {
        toast({
          title: "Profile Complete!",
          description: "Welcome to Hammers Modality!",
        });
      }

      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to complete profile setup. Please try again.",
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
          </div>

          <p className="text-lg text-muted-foreground mb-6">
            Complete your profile setup to get started:
          </p>
          <div className="space-y-2 mb-8">
            <p className="text-lg"><strong>Role:</strong> {selectedRole}</p>
            <p className="text-lg"><strong>Sport:</strong> {selectedSport}</p>
            <p className="text-lg">
              <strong>Module:</strong> {selectedModule ? selectedModule.charAt(0).toUpperCase() + selectedModule.slice(1) : 'None'}
            </p>
          </div>

          <div className="bg-muted/30 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-bold mb-4">Your Subscription Includes:</h2>
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
                <span>Unlimited video analyses</span>
              </li>
            </ul>
          </div>

          <Button 
            onClick={handleCompleteSetup} 
            className="w-full" 
            size="lg"
          >
            Complete Setup & Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
