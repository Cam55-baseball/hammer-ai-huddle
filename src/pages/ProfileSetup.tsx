import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { PlusCircle, X } from "lucide-react";
import { BirthDatePicker } from "@/components/ui/BirthDatePicker";
import { format } from "date-fns";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const locationState = location.state as { role?: string; sport?: string; module?: string };

  // Read from both possible localStorage keys for role
  const rawRole = locationState?.role || localStorage.getItem('selectedRole') || localStorage.getItem('userRole');
  
  // Normalize role value to expected format (handle both lowercase and capitalized)
  let selectedRole: string | null = rawRole;
  if (rawRole === 'player') selectedRole = 'Player';
  else if (rawRole === 'scout') selectedRole = 'Scout/Coach';
  
  const selectedSport = locationState?.sport || localStorage.getItem('selectedSport');
  const selectedModule = locationState?.module || localStorage.getItem('selectedModule');

  // Bio form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [bio, setBio] = useState("");
  const [credentials, setCredentials] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Player-specific fields
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [playerState, setPlayerState] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [teamAffiliation, setTeamAffiliation] = useState("");
  const [throwingHand, setThrowingHand] = useState("");
  const [battingSide, setBattingSide] = useState("");
  const [commitmentStatus, setCommitmentStatus] = useState("");
  const [collegeGradYear, setCollegeGradYear] = useState("");
  const [enrolledInCollege, setEnrolledInCollege] = useState(false);
  const [isProfessional, setIsProfessional] = useState(false);
  const [isFreeAgent, setIsFreeAgent] = useState(false);
  const [mlbAffiliate, setMlbAffiliate] = useState("");
  const [independentLeague, setIndependentLeague] = useState("");
  const [isForeignPlayer, setIsForeignPlayer] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  
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
          title: t('profileSetup.fileTooLarge'),
          description: t('profileSetup.maxFileSizeError'),
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
        title: t('profileSetup.missingInformation'),
        description: t('profileSetup.selectRoleFirst'),
        variant: "destructive",
      });
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: t('profileSetup.missingInformation'),
        description: t('profileSetup.enterFirstLastName'),
        variant: "destructive",
      });
      return;
    }

    if (!dateOfBirth) {
      toast({
        title: t('profileSetup.missingInformation'),
        description: 'Please select your date of birth.',
        variant: "destructive",
      });
      return;
    }
    
    // Validate player-specific required fields
    if (isPlayer && (!height || !weight || !playerState || !graduationYear || !position || !experienceLevel || !teamAffiliation)) {
      toast({
        title: t('profileSetup.missingInformation'),
        description: t('profileSetup.fillRequiredFieldsPlayer'),
        variant: "destructive",
      });
      return;
    }
    
    // Validate coach/scout-specific required fields
    if (isCoachOrScout && (!position || !teamAffiliation || !yearsAffiliated)) {
      toast({
        title: t('profileSetup.missingInformation'),
        description: t('profileSetup.fillRequiredFieldsCoach'),
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
        credentials: credentials.filter(c => c.trim() !== ''),
        date_of_birth: dateOfBirth ? format(dateOfBirth, 'yyyy-MM-dd') : null,
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
        profileData.high_school_grad_year = parseInt(graduationYear);
        profileData.team_affiliation = teamAffiliation;
        profileData.throwing_hand = throwingHand || null;
        profileData.batting_side = battingSide || null;
        profileData.commitment_status = commitmentStatus || null;
        profileData.college_grad_year = collegeGradYear ? parseInt(collegeGradYear) : null;
        profileData.enrolled_in_college = enrolledInCollege;
        profileData.is_professional = isProfessional;
        profileData.is_free_agent = isFreeAgent;
        profileData.mlb_affiliate = mlbAffiliate || null;
        profileData.independent_league = independentLeague || null;
        profileData.is_foreign_player = isForeignPlayer;
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

      // Clear localStorage (keep selectedSport for consistency)
      localStorage.removeItem('selectedRole');
      localStorage.removeItem('selectedModule');

      // Show appropriate message based on role
      if (dbRole === 'admin') {
        toast({
          title: t('profileSetup.adminAccessRequested'),
          description: t('profileSetup.adminRequestSubmitted'),
        });
      } else {
        toast({
          title: t('profileSetup.profileComplete'),
          description: t('profileSetup.welcomeToApp'),
        });
      }

      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast({
        title: t('profileSetup.setupFailed'),
        description: error.message || t('profileSetup.failedSetupRetry'),
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
            <h1 className="text-3xl font-bold mb-2">{t('profileSetup.title')}</h1>
            <p className="text-muted-foreground">
              {t('profileSetup.description')}
            </p>
          </div>

          {/* Selection Summary */}
          <div className="bg-muted/30 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{t('profileSetup.role')}</p>
                <p className="font-semibold">{selectedRole}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('profileSetup.sport')}</p>
                <p className="font-semibold capitalize">{selectedSport}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              {t('onboarding.exploreModulesLater')}
            </p>
          </div>

          {/* Bio Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">{t('profileSetup.firstName')} *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('profileSetup.placeholders.firstName')}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">{t('profileSetup.lastName')} *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('profileSetup.placeholders.lastName')}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Date of Birth *</Label>
              <BirthDatePicker
                value={dateOfBirth}
                onChange={setDateOfBirth}
              />
              <p className="text-xs text-muted-foreground mt-1">Required — used across the app for age-based features.</p>
            </div>
            
            <div>
              <Label htmlFor="avatar">{t('profileSetup.profilePicture')}</Label>
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
              <p className="text-xs text-muted-foreground mt-1">{t('profileSetup.maxFileSize')}</p>
            </div>

            {isPlayer && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="height">{t('profileSetup.height')} *</Label>
                    <Input
                      id="height"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder={t('profileSetup.placeholders.height')}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight">{t('profileSetup.weight')} *</Label>
                    <Input
                      id="weight"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder={t('profileSetup.placeholders.weight')}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="playerState">{t('profileSetup.state')} *</Label>
                    <Input
                      id="playerState"
                      value={playerState}
                      onChange={(e) => setPlayerState(e.target.value)}
                      placeholder={t('profileSetup.placeholders.state')}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="graduationYear">{t('profileSetup.graduationYear')} *</Label>
                    <Input
                      id="graduationYear"
                      type="number"
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value)}
                      placeholder={t('profileSetup.placeholders.gradYear')}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="position">{t('profileSetup.position')} *</Label>
                  <Input
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder={t('profileSetup.placeholders.position')}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="experienceLevel">{t('profileSetup.experienceLevel')} *</Label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel} required>
                    <SelectTrigger id="experienceLevel">
                      <SelectValue placeholder={t('profileSetup.selectExperienceLevel')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">{t('profileSetup.beginner')}</SelectItem>
                      <SelectItem value="Intermediate">{t('profileSetup.intermediate')}</SelectItem>
                      <SelectItem value="Advanced">{t('profileSetup.advanced')}</SelectItem>
                      <SelectItem value="Professional">{t('profileSetup.professional')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="teamAffiliation">{t('profileSetup.teamAffiliation')} *</Label>
                  <Input
                    id="teamAffiliation"
                    value={teamAffiliation}
                    onChange={(e) => setTeamAffiliation(e.target.value)}
                    placeholder={t('profileSetup.placeholders.teamAffiliation')}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="throwingHand">{t('profileSetup.throwingHand')}</Label>
                    <Select value={throwingHand} onValueChange={setThrowingHand}>
                      <SelectTrigger id="throwingHand">
                        <SelectValue placeholder={t('common.select')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="R">{t('profileSetup.right')}</SelectItem>
                        <SelectItem value="L">{t('profileSetup.left')}</SelectItem>
                        <SelectItem value="B">{t('profileSetup.both')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="battingSide">{t('profileSetup.battingSide')}</Label>
                    <Select value={battingSide} onValueChange={setBattingSide}>
                      <SelectTrigger id="battingSide">
                        <SelectValue placeholder={t('common.select')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="R">{t('profileSetup.right')}</SelectItem>
                        <SelectItem value="L">{t('profileSetup.left')}</SelectItem>
                        <SelectItem value="B">{t('profileSetup.bothSwitch')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="commitmentStatus">{t('profileSetup.commitmentStatus')}</Label>
                  <Select value={commitmentStatus} onValueChange={setCommitmentStatus}>
                    <SelectTrigger id="commitmentStatus">
                      <SelectValue placeholder={t('profileSetup.selectStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="committed">{t('profileSetup.committed')}</SelectItem>
                      <SelectItem value="uncommitted">{t('profileSetup.uncommitted')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="collegeGradYear">{t('profileSetup.collegeGradYear')}</Label>
                  <Input
                    id="collegeGradYear"
                    type="number"
                    value={collegeGradYear}
                    onChange={(e) => setCollegeGradYear(e.target.value)}
                    placeholder={t('profileSetup.placeholders.collegeGradYear')}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enrolledInCollege"
                      checked={enrolledInCollege}
                      onChange={(e) => setEnrolledInCollege(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="enrolledInCollege" className="cursor-pointer">{t('profileSetup.enrolledInCollege')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isProfessional"
                      checked={isProfessional}
                      onChange={(e) => setIsProfessional(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="isProfessional" className="cursor-pointer">{t('profileSetup.professionalPlayer')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isFreeAgent"
                      checked={isFreeAgent}
                      onChange={(e) => setIsFreeAgent(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="isFreeAgent" className="cursor-pointer">{t('profileSetup.freeAgent')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isForeignPlayer"
                      checked={isForeignPlayer}
                      onChange={(e) => setIsForeignPlayer(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="isForeignPlayer" className="cursor-pointer">{t('profileSetup.internationalPlayer')}</Label>
                  </div>
                </div>

                {isProfessional && (
                  <>
                    <div>
                      <Label htmlFor="mlbAffiliate">{t('profileSetup.mlbAffiliate')}</Label>
                      <Input
                        id="mlbAffiliate"
                        value={mlbAffiliate}
                        onChange={(e) => setMlbAffiliate(e.target.value)}
                        placeholder={t('profileSetup.placeholders.mlbAffiliate')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="independentLeague">{t('profileSetup.independentLeague')}</Label>
                      <Input
                        id="independentLeague"
                        value={independentLeague}
                        onChange={(e) => setIndependentLeague(e.target.value)}
                        placeholder={t('profileSetup.placeholders.independentLeague')}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {isCoachOrScout && (
              <>
                <div>
                  <Label htmlFor="position">{t('profileSetup.positionRole')} *</Label>
                  <Input
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder={t('profileSetup.placeholders.positionCoach')}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="teamAffiliation">{t('profileSetup.teamAffiliation')} *</Label>
                  <Input
                    id="teamAffiliation"
                    value={teamAffiliation}
                    onChange={(e) => setTeamAffiliation(e.target.value)}
                    placeholder={t('profileSetup.placeholders.organization')}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="yearsAffiliated">{t('profileSetup.yearsAffiliated')} *</Label>
                  <Input
                    id="yearsAffiliated"
                    type="number"
                    value={yearsAffiliated}
                    onChange={(e) => setYearsAffiliated(e.target.value)}
                    placeholder={t('profileSetup.placeholders.yearsNumber')}
                    required
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="bio">{t('profileSetup.bioOptional')}</Label>
              {isPlayer && (
                <p className="text-xs text-muted-foreground mt-1 mb-2">
                  {t('profileSetup.bioHelperText')}
                </p>
              )}
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('profileSetup.tellUsAboutYourself')}
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right mt-1">
                {t('profileSetup.characterCount', { count: bio.length })}
              </p>
            </div>
            
            {/* Credentials (Optional) */}
            <div>
              <Label className="text-sm font-semibold">{t('profileSetup.experienceCredentials')}</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t('profileSetup.credentialsHelperText')}
              </p>
              
              <div className="space-y-2">
                {credentials.map((cred, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={cred}
                      onChange={(e) => {
                        const newCredentials = [...credentials];
                        newCredentials[index] = e.target.value;
                        setCredentials(newCredentials);
                      }}
                      placeholder={t('profileSetup.placeholders.credential')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newCredentials = credentials.filter((_, i) => i !== index);
                        setCredentials(newCredentials);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {credentials.length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCredentials([...credentials, ""])}
                    className="w-full"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    {t('profileSetup.addCredential')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Button 
            onClick={handleCompleteSetup} 
            className="w-full" 
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? t('profileSetup.creatingProfile') : t('profileSetup.completeProfileAndGo')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
