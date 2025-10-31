import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const locationState = location.state as { role?: string; sport?: string; module?: string };

  const selectedRole = locationState?.role || localStorage.getItem('selectedRole');
  const selectedSport = locationState?.sport || localStorage.getItem('selectedSport');
  const selectedModule = locationState?.module || localStorage.getItem('selectedModule');

  // Bio form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Player-specific fields
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [playerState, setPlayerState] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [teamAffiliation, setTeamAffiliation] = useState("");
  
  // Coach/Scout-specific fields
  const [yearsAffiliated, setYearsAffiliated] = useState("");
  
  const isPlayer = selectedRole === 'Player';
  const isCoachOrScout = selectedRole === 'Scout/Coach';
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
    
    // Pre-fill first/last name from user metadata if available
    const userName = user.user_metadata?.full_name || "";
    if (userName) {
      const nameParts = userName.split(' ');
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(' ') || "");
    }
  }, [user, loading, navigate, selectedRole]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB",
          variant: "destructive",
        });
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCompleteSetup = async () => {
    if (!user || !selectedRole) {
      toast({
        title: "Missing Information",
        description: "Please select a role before continuing.",
        variant: "destructive",
      });
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your first and last name.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate player-specific required fields
    if (isPlayer && (!height || !weight || !playerState || !graduationYear || !position || !experienceLevel || !teamAffiliation)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields for player profile.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate coach/scout-specific required fields
    if (isCoachOrScout && (!position || !teamAffiliation || !yearsAffiliated)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields for coach/scout profile.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload avatar if provided
      let avatarUrl = null;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/avatar.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
          
        avatarUrl = publicUrl;
      }

      const roleMap: { [key: string]: Database['public']['Enums']['app_role'] } = {
        'Player': 'player',
        'Scout/Coach': 'scout',
        'Admin': 'admin'
      };

      const sportMap: { [key: string]: Database['public']['Enums']['sport_type'] } = {
        'baseball': 'baseball',
        'softball': 'softball'
      };

      const dbRole = roleMap[selectedRole] || 'player' as Database['public']['Enums']['app_role'];
      const dbSport = sportMap[selectedSport || 'baseball'] || 'baseball' as Database['public']['Enums']['sport_type'];

      // Build profile data based on role
      const profileData: any = {
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        bio: bio || null,
      };
      
      if (avatarUrl) {
        profileData.avatar_url = avatarUrl;
      }
      
      if (isPlayer) {
        profileData.position = position;
        profileData.experience_level = experienceLevel;
        profileData.height = height;
        profileData.weight = weight;
        profileData.state = playerState;
        profileData.graduation_year = parseInt(graduationYear);
        profileData.team_affiliation = teamAffiliation;
      } else if (isCoachOrScout) {
        profileData.position = position;
        profileData.team_affiliation = teamAffiliation;
        profileData.years_affiliated = parseInt(yearsAffiliated);
      }

      // 1. Create/Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData);

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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="avatar">Profile Picture</Label>
              <div className="flex gap-4 items-center">
                {avatarPreview && (
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={avatarPreview} />
                    <AvatarFallback>{firstName[0]}{lastName[0]}</AvatarFallback>
                  </Avatar>
                )}
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Max size: 5MB</p>
            </div>

            {isPlayer && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="height">Height *</Label>
                    <Input
                      id="height"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="e.g., 5'10&quot;"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight">Weight *</Label>
                    <Input
                      id="weight"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g., 180 lbs"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="playerState">State *</Label>
                    <Input
                      id="playerState"
                      value={playerState}
                      onChange={(e) => setPlayerState(e.target.value)}
                      placeholder="e.g., California"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="graduationYear">Graduation Year *</Label>
                    <Input
                      id="graduationYear"
                      type="number"
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value)}
                      placeholder="e.g., 2025"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g., Pitcher, Outfielder"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="experienceLevel">Experience Level *</Label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel} required>
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

                <div>
                  <Label htmlFor="teamAffiliation">Team Affiliation *</Label>
                  <Input
                    id="teamAffiliation"
                    value={teamAffiliation}
                    onChange={(e) => setTeamAffiliation(e.target.value)}
                    placeholder="Travel team/High School/College/Pro"
                    required
                  />
                </div>
              </>
            )}

            {isCoachOrScout && (
              <>
                <div>
                  <Label htmlFor="position">Position/Role *</Label>
                  <Input
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g., Head Coach, Scout"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="teamAffiliation">Team Affiliation *</Label>
                  <Input
                    id="teamAffiliation"
                    value={teamAffiliation}
                    onChange={(e) => setTeamAffiliation(e.target.value)}
                    placeholder="Team name or organization"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="yearsAffiliated">Years Affiliated *</Label>
                  <Input
                    id="yearsAffiliated"
                    type="number"
                    value={yearsAffiliated}
                    onChange={(e) => setYearsAffiliated(e.target.value)}
                    placeholder="Number of years"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="bio">Bio (Optional)</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right mt-1">
                {bio.length}/500 characters
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
