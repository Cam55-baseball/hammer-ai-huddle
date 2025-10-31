import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  // Bio form state
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [bio, setBio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!selectedRole) {
      navigate("/", { replace: true });
      return;
    }
    
    // Pre-fill full name from user metadata
    const userName = user.user_metadata?.full_name || "";
    setFullName(userName);
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

    // Validate bio form
    if (!fullName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your full name.",
        variant: "destructive",
      });
      return;
    }

    if (!position.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your position.",
        variant: "destructive",
      });
      return;
    }

    if (!experienceLevel) {
      toast({
        title: "Missing Information",
        description: "Please select your experience level.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

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

      // 1. Create/Update profile with bio information
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          position: position,
          experience_level: experienceLevel,
          bio: bio || null,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // 2. Insert role with status (pending for admin, active for others)
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{ 
          user_id: user.id, 
          role: dbRole,
          status: dbRole === 'admin' ? 'pending' : 'active'
        }]);

      if (roleError) throw roleError;

      // 3. Insert user progress if module was selected
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

      // Clear localStorage
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-bold text-2xl">H</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Create Your Profile</h1>
            <p className="text-muted-foreground">
              Tell us about yourself to personalize your experience
            </p>
          </div>

          {/* Selection Summary */}
          <div className="bg-muted/30 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Role</p>
                <p className="font-semibold">{selectedRole}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sport</p>
                <p className="font-semibold">{selectedSport}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Module</p>
                <p className="font-semibold">
                  {selectedModule ? selectedModule.charAt(0).toUpperCase() + selectedModule.slice(1) : 'None'}
                </p>
              </div>
            </div>
          </div>

          {/* Bio Form */}
          <div className="space-y-6 mb-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position/Role *</Label>
              <Input
                id="position"
                placeholder="e.g., Pitcher, Outfielder, Catcher"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Your primary position in {selectedSport}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experienceLevel">Experience Level *</Label>
              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger id="experienceLevel">
                  <SelectValue placeholder="Select your experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio (Optional)</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about your athletic background, goals, and what you hope to achieve..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Share your story, achievements, or training goals
              </p>
            </div>
          </div>

          <Button 
            onClick={handleCompleteSetup} 
            className="w-full" 
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Profile..." : "Complete Profile & Go to Dashboard"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
