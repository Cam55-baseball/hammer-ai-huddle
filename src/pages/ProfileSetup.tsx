import { HeightFeetInchesInput } from "@/components/shared/HeightFeetInchesInput";
import { NotificationPrimer, shouldAskNotifications } from "@/components/onboarding/NotificationPrimer";
import { useEffect, useRef, useState } from "react";
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
import { persistContextAnswer } from '@/lib/hammer/context/acquisition';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, loading, isAuthStable } = useAuth();
  const locationState = location.state as { role?: string; sport?: string; module?: string };

  // Read from both possible localStorage keys for role
  // Read once so finishing (which clears the stored role) can't flip the page mid-handoff.
  const [rawRole] = useState<string | null>(() => locationState?.role || localStorage.getItem('selectedRole') || localStorage.getItem('userRole'));
  
  // Normalize role value to expected format (handle both lowercase and capitalized)
  let selectedRole: string | null = rawRole;
  if (rawRole === 'player') selectedRole = 'Player';
  else if (rawRole === 'scout') selectedRole = 'Scout/Coach';
  
  const [savedSport,setSavedSport]=useState<string|null>(null);
  const selectedSport = savedSport || locationState?.sport || localStorage.getItem('selectedSport');
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
  const [birthdayKnown,setBirthdayKnown]=useState(false);
  const [identityReady,setIdentityReady]=useState(false);
  const [currentlyInHighSchool, setCurrentlyInHighSchool] = useState(false);
  const [satScore, setSatScore] = useState("");
  const [actScore, setActScore] = useState("");
  const [gpa, setGpa] = useState("");
  const [ncaaId, setNcaaId] = useState("");
  
  // Coach/Scout-specific fields
  const [yearsAffiliated, setYearsAffiliated] = useState("");
  
  const isPlayer = selectedRole === 'Player';
  const isCoachOrScout = selectedRole === 'Scout/Coach';
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Click-through steps (players): 0 name/photo · 1 position/sides · 2 body/grad year/birth date · 3 state/team/level.
  const PLAYER_STEPS = ["Name and photo", "Position, bats and throws", "Height, weight and graduation year", "State, team and level"];
  const [pStep, setPStep] = useState(0);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [primerOpen, setPrimerOpen] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  // Set once the profile is saved: finishing clears selectedRole, which must not bounce them to "/".
  const finishingRef = useRef(false);

  const { session } = useAuth();

  useEffect(() => {
    if (loading || !isAuthStable || finishingRef.current) return;
    if (!user && !session) {
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

  useEffect(()=>{if(!user)return;let live=true;
    void (async()=>{const [p,c]=await Promise.all([
      supabase.from('profiles').select('date_of_birth').eq('id',user.id).maybeSingle(),
      supabase.from('athlete_context').select('sport_primary,position_primary,competition_level,bats_hand,throws_hand').eq('user_id',user.id).maybeSingle(),
    ]);if(!live)return;if(p.error||c.error){toast({title:'Could not load your saved details',variant:'destructive'});return;}
    if(p.data?.date_of_birth){setDateOfBirth(new Date(p.data.date_of_birth+'T00:00:00'));setBirthdayKnown(true);}
    if(c.data?.sport_primary)setSavedSport(c.data.sport_primary);
    if(c.data?.position_primary)setPosition(c.data.position_primary);
    if(c.data?.competition_level)setExperienceLevel(c.data.competition_level);
    if(c.data?.bats_hand)setBattingSide(c.data.bats_hand==='S'?'B':c.data.bats_hand);
    if(c.data?.throws_hand)setThrowingHand(c.data.throws_hand==='S'?'B':c.data.throws_hand);
    setIdentityReady(true);
    })();return()=>{live=false;};},[user?.id]);

  const sv = (n: number) => (isPlayer && pStep !== n ? "hidden" : "");
  const draftKey = user ? `hm.profileSetupDraft.${user.id}` : null;

  // Resume where they stopped: restore the saved draft once.
  useEffect(() => {
    if (!draftKey || draftLoaded) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.firstName) setFirstName(d.firstName);
        if (d.lastName) setLastName(d.lastName);
        setPosition(d.position ?? ""); setExperienceLevel(d.experienceLevel ?? "");
        setThrowingHand(d.throwingHand ?? ""); setBattingSide(d.battingSide ?? "");
        setHeight(d.height ?? ""); setWeight(d.weight ?? ""); setGraduationYear(d.graduationYear ?? "");
        if (d.dateOfBirth) setDateOfBirth(new Date(d.dateOfBirth));
        setPlayerState(d.playerState ?? ""); setTeamAffiliation(d.teamAffiliation ?? "");
        setCommitmentStatus(d.commitmentStatus ?? ""); setBio(d.bio ?? "");
        if (typeof d.pStep === "number") setPStep(Math.min(Math.max(d.pStep, 0), 3));
      }
    } catch { /* ignore a bad draft */ }
    setDraftLoaded(true);
  }, [draftKey, draftLoaded]);

  // Save progress as they go.
  useEffect(() => {
    if (!draftKey || !draftLoaded) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        firstName, lastName, position, experienceLevel, throwingHand, battingSide,
        height, weight, graduationYear, dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : null,
        playerState, teamAffiliation, commitmentStatus, bio, pStep,
      }));
    } catch { /* storage full or blocked */ }
  }, [draftKey, draftLoaded, firstName, lastName, position, experienceLevel, throwingHand, battingSide,
      height, weight, graduationYear, dateOfBirth, playerState, teamAffiliation, commitmentStatus, bio, pStep]);

  /** Per-step check so a mistake is caught on the screen where it was made. */
  const stepError = (n: number): string | null => {
    if (n === 0 && (!firstName.trim() || !lastName.trim())) return "Enter your first and last name.";
    if (n === 1 && (!position.trim() || !experienceLevel || !throwingHand || !battingSide)) return "Add your position, playing level, bats and throws.";
    if (n === 2) {
      if (!dateOfBirth) return "Pick your date of birth.";
    }
    return null;
  };
  const goNextStep = () => {
    const err = stepError(pStep);
    if (err) { toast({ title: "One more thing", description: err, variant: "destructive" }); return; }
    setPStep((x) => Math.min(x + 1, 3));
    window.scrollTo({ top: 0 });
  };
  const goBackStep = () => { setPStep((x) => Math.max(x - 1, 0)); window.scrollTo({ top: 0 }); };

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
    if (isPlayer && (!position || !experienceLevel || !throwingHand || !battingSide)) {
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
        ...(!birthdayKnown ? {date_of_birth: dateOfBirth ? format(dateOfBirth, 'yyyy-MM-dd') : null} : {}),
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
        profileData.high_school_grad_year = graduationYear ? parseInt(graduationYear) : null;
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
        profileData.currently_in_high_school = currentlyInHighSchool;
        profileData.sat_score = satScore ? parseInt(satScore) : null;
        profileData.act_score = actScore ? parseInt(actScore) : null;
        profileData.gpa = gpa ? parseFloat(gpa) : null;
        profileData.ncaa_id = ncaaId || null;
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
      if (isPlayer && (selectedSport === 'baseball' || selectedSport === 'softball')) {
        await persistContextAnswer(user.id, 'sport_primary', selectedSport, 'profile_setup');
        await persistContextAnswer(user.id, 'position_primary', position, 'profile_setup');
        await persistContextAnswer(user.id, 'competition_level', experienceLevel, 'profile_setup');
        await persistContextAnswer(user.id, 'bats_hand', battingSide === 'B' ? 'S' : battingSide, 'profile_setup');
        await persistContextAnswer(user.id, 'throws_hand', throwingHand === 'B' ? 'S' : throwingHand, 'profile_setup');
      }

      // 2. Insert role. Admin/owner can never be self-assigned. Coach, scout and
      // recruiter are only REQUESTED here (status pending); the owner approves
      // them from the approval queue. The database rejects anything else.
      if (dbRole !== 'admin') {
        // Upsert with ignoreDuplicates: players who already got their role at
        // sign-up must not fail here with a duplicate-key error.
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert([{
            user_id: user.id,
            role: dbRole,
            status: dbRole === 'player' ? 'active' : 'pending'
          }], { onConflict: 'user_id,role', ignoreDuplicates: true });

        if (roleError) throw roleError;
      }


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

      finishingRef.current = true;
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

      // New monetization funnel: route new players through the activation decision board.
      // Scouts/Coaches/Admins skip it entirely (they don't pay).
      // RFL-053 — canonical athlete home is /command, not /dashboard.
      const goToActivate = isPlayer && dbRole !== 'admin';
      const dest = goToActivate ? "/activate" : "/command";
      try { if (draftKey) localStorage.removeItem(draftKey); } catch { /* ignore */ }
      // Notifications right after Finish (explained first), before the dashboard tour can start.
      if (shouldAskNotifications(user.id)) {
        setPendingNav(dest);
        setPrimerOpen(true);
      } else {
        navigate(dest, { replace: true });
      }
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4 py-8 pt-[calc(2rem+var(--safe-top))] pb-[calc(2rem+var(--safe-bottom))]">
      <div className="w-full max-w-2xl">
        <div className="bg-card border border-border rounded-xl p-5 sm:p-8 shadow-lg">
          <div className={`text-center mb-6 ${isPlayer && pStep > 0 ? "hidden sm:block" : ""}`}>
            <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-bold text-2xl">H</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{t('profileSetup.title')}</h1>
            <p className="text-muted-foreground">
              {t('profileSetup.description')}
            </p>
          </div>

          {isPlayer && (
            <div className="mb-5" aria-live="polite">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Step {pStep + 1} of {PLAYER_STEPS.length}</span>
                <span className="font-medium text-foreground">{PLAYER_STEPS[pStep]}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuemin={1} aria-valuemax={PLAYER_STEPS.length} aria-valuenow={pStep + 1}>
                <div className="h-full bg-primary transition-all" style={{ width: `${((pStep + 1) / PLAYER_STEPS.length) * 100}%` }} />
              </div>
            </div>
          )}

          {/* Selection Summary */}
          <div className={`bg-muted/30 p-4 rounded-lg mb-6 ${isPlayer && pStep !== 1 ? "hidden" : ""}`}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{t('profileSetup.role')}</p>
                <p className="font-semibold">{selectedRole}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('profileSetup.sport')}</p>
                <p className="font-semibold capitalize">{selectedSport}</p><Button variant="link" onClick={()=>navigate("/profile")}>Change</Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              {t('onboarding.exploreModulesLater')}
            </p>
          </div>

          {/* Bio Form */}
          <div className="space-y-4">
            <div className={sv(0)}>
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
            </div>

            <div className={`${sv(2)} ${birthdayKnown ? "hidden" : ""}`}>
            <div>
              <Label>Date of Birth *</Label>
              <BirthDatePicker
                value={dateOfBirth}
                onChange={setDateOfBirth}
              />
              <p className="text-xs text-muted-foreground mt-1">Required — used across the app for age-based features.</p>
            </div>
            </div>
            
            <div className={sv(0)}>
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
            </div>

            {isPlayer && (
              <>
            <div className={sv(2)}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="height">{t('profileSetup.height')} · Optional — helps personalize</Label>
                    <HeightFeetInchesInput id="height" value={height} onChange={setHeight} />
                  </div>
                  <div>
                    <Label htmlFor="weight">{t('profileSetup.weight')} · Optional — helps personalize</Label>
                    <Input
                      id="weight"
                      type="text"
                      inputMode="decimal"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder={t('profileSetup.placeholders.weight')}
                    />
                  </div>
                </div>
            </div>
                
                <div className="grid grid-cols-1 gap-3">
            <div className={sv(3)}>
                  <div>
                    <Label htmlFor="playerState">{t('profileSetup.state')} · Optional — helps personalize</Label>
                    <Input
                      id="playerState"
                      value={playerState}
                      onChange={(e) => setPlayerState(e.target.value)}
                      placeholder={t('profileSetup.placeholders.state')}
                    />
                  </div>
            </div>
            <div className={sv(2)}>
                  <div>
                    <Label htmlFor="graduationYear">{t('profileSetup.graduationYear')} · Optional — helps personalize</Label>
                    <Input
                      id="graduationYear"
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value)}
                      placeholder={t('profileSetup.placeholders.gradYear')}
                    />
                  </div>
            </div>
                </div>

            <div className={sv(1)}>
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
            </div>

            <div className={sv(1)}>
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
            </div>

            <div className={sv(3)}>
                <div>
                  <Label htmlFor="teamAffiliation">Team · Optional — helps personalize</Label>
                  <div className="my-2 flex flex-wrap gap-2">{['Free agent','No team right now / training on my own','Between teams'].map(option=><Button key={option} type="button" size="sm" variant={teamAffiliation===option?'default':'outline'} onClick={()=>setTeamAffiliation(option)}>{option}</Button>)}</div>
                  <Input
                    id="teamAffiliation"
                    value={teamAffiliation}
                    onChange={(e) => setTeamAffiliation(e.target.value)}
                    placeholder={t('profileSetup.placeholders.teamAffiliation')}
                  />
                </div>
            </div>

            <div className={sv(1)}>
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
            </div>

            <div className={sv(3)}>
                <div data-testid="open-to-recruiting-note" className="p-3 rounded-lg border border-border bg-muted/20 text-sm space-y-1">
                  <p className="font-medium text-foreground">Open to recruiting?</p>
                  <p className="text-muted-foreground">Scouts and coaches see nothing until you choose. After sign-up, open Scouting visibility in your menu to pick exactly what they can see. Under 18, a parent approves first.</p>
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
                      id="currentlyInHighSchool"
                      checked={currentlyInHighSchool}
                      onChange={(e) => setCurrentlyInHighSchool(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="currentlyInHighSchool" className="cursor-pointer">{t('profileSetup.currentlyInHighSchool')}</Label>
                  </div>
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

                {/* Academic Fields - High School */}
                {currentlyInHighSchool && (
                  <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/20">
                    <Label className="text-sm font-semibold">{t("profileSetup.academicInfo")}</Label>
                    <p className="text-xs text-muted-foreground">Source: you entered this (not verified). Only shared if you turn on Academics in Scouting visibility.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="satScore">{t('profileSetup.satScore')}</Label>
                        <Input
                          id="satScore"
                          type="number"
                          value={satScore}
                          onChange={(e) => setSatScore(e.target.value)}
                          placeholder="400-1600"
                          min={400}
                          max={1600}
                        />
                      </div>
                      <div>
                        <Label htmlFor="actScore">{t('profileSetup.actScore')}</Label>
                        <Input
                          id="actScore"
                          type="number"
                          value={actScore}
                          onChange={(e) => setActScore(e.target.value)}
                          placeholder="1-36"
                          min={1}
                          max={36}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="gpa">{t('profileSetup.gpa')}</Label>
                      <Input
                        id="gpa"
                        type="number"
                        value={gpa}
                        onChange={(e) => setGpa(e.target.value)}
                        placeholder="0.00-5.00"
                        min={0}
                        max={5}
                        step={0.01}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ncaaId">{t('profileSetup.ncaaId')}</Label>
                      <Input
                        id="ncaaId"
                        value={ncaaId}
                        onChange={(e) => setNcaaId(e.target.value)}
                        placeholder={t('profileSetup.ncaaIdPlaceholder')}
                      />
                      <div className="mt-2 p-3 bg-muted/40 rounded-md text-xs text-muted-foreground space-y-1">
                        <p className="font-medium text-foreground">{t('profileSetup.ncaaInfoTitle')}</p>
                        <p>{t('profileSetup.ncaaInfoDescription')}</p>
                        <a
                          href="https://web3.ncaa.org/ecwr3/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline inline-block mt-1"
                        >
                          {t('profileSetup.ncaaSignupLink')}
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* NCAA ID - College Only (when not already showing from high school) */}
                {enrolledInCollege && !currentlyInHighSchool && (
                  <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/20">
                    <div>
                      <Label htmlFor="ncaaIdCollege">{t('profileSetup.ncaaId')}</Label>
                      <Input
                        id="ncaaIdCollege"
                        value={ncaaId}
                        onChange={(e) => setNcaaId(e.target.value)}
                        placeholder={t('profileSetup.ncaaIdPlaceholder')}
                      />
                      <div className="mt-2 p-3 bg-muted/40 rounded-md text-xs text-muted-foreground space-y-1">
                        <p className="font-medium text-foreground">{t('profileSetup.ncaaInfoTitle')}</p>
                        <p>{t('profileSetup.ncaaInfoDescription')}</p>
                        <a
                          href="https://web3.ncaa.org/ecwr3/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline inline-block mt-1"
                        >
                          {t('profileSetup.ncaaSignupLink')}
                        </a>
                      </div>
                    </div>
                  </div>
                )}

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
            </div>
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

            <div className={sv(3)}>
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
            </div>
            
            {/* Credentials (Optional) */}
            <div className={sv(3)}>
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
          </div>

          {isPlayer && pStep < 3 ? (
            <div className="flex gap-3 sticky bottom-0 bg-card pt-3 pb-[var(--safe-bottom)]">
              {pStep > 0 && (
                <Button variant="outline" size="lg" className="flex-1" onClick={goBackStep}>Back</Button>
              )}
              <Button size="lg" className="flex-1" disabled={!identityReady} onClick={goNextStep}>Next</Button>
            </div>
          ) : (
            <div className="flex gap-3 sticky bottom-0 bg-card pt-3 pb-[var(--safe-bottom)]">
              {isPlayer && (
                <Button variant="outline" size="lg" className="flex-1" onClick={goBackStep} disabled={isSubmitting || !identityReady}>Back</Button>
              )}
              <Button
                onClick={() => {
                  if (isPlayer) { const err = stepError(3); if (err) { toast({ title: "One more thing", description: err, variant: "destructive" }); return; } }
                  handleCompleteSetup();
                }}
                className="flex-1"
                size="lg"
                disabled={isSubmitting || !identityReady}
              >
                {isSubmitting ? t('profileSetup.creatingProfile') : isPlayer ? "Finish" : "Complete Profile & Continue"}
              </Button>
            </div>
          )}
          {user && (
            <NotificationPrimer
              uid={user.id}
              open={primerOpen}
              onDone={() => { setPrimerOpen(false); if (pendingNav) navigate(pendingNav, { replace: true }); }}
            />
          )}
          <p className={`text-xs text-muted-foreground text-center mt-2 ${isPlayer && pStep < 3 ? "hidden" : ""}`}>
            {isPlayer ? "Next: Choose your access" : "Next: Your dashboard"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
