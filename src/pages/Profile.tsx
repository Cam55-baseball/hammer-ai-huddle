import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Calendar, CreditCard, Loader2, Edit, Instagram, Twitter, Facebook, Linkedin, Youtube, Globe, PlusCircle, Check, X, UserPlus, Clock } from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { UserMenu } from "@/components/UserMenu";
import { ModuleManagementCard } from "@/components/ModuleManagementCard";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ColorCustomizationCard } from "@/components/ColorCustomizationCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { ContractStatusCard } from "@/components/professional/ContractStatusCard";
import { VerifiedStatSubmission } from "@/components/professional/VerifiedStatSubmission";
import { SportBadge } from "@/components/professional/SportBadge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

function PracticeIntelligenceSections() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xl font-bold">Practice Intelligence</h3>
        <SportBadge />
      </div>

      <Collapsible open={openSections.pro} onOpenChange={() => toggle('pro')}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors">
          <span className="font-medium text-sm">Professional Status</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.pro ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <ContractStatusCard />
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={openSections.stats} onOpenChange={() => toggle('stats')}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors">
          <span className="font-medium text-sm">Verified Stats</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.stats ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <VerifiedStatSubmission />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default function Profile() {
  const { user, session, loading: authLoading } = useAuth();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { modules: subscribedModules, module_details, subscription_end, has_discount, discount_percent, loading: subLoading, refetch } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewingUserId = searchParams.get('userId');
  const [openingPortal, setOpeningPortal] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // Role of the profile being viewed
  const [viewingOtherProfile, setViewingOtherProfile] = useState(false);
  const [hasAcceptedFollow, setHasAcceptedFollow] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null); // Role of the logged-in user
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'accepted' | null>(null);
  const [sendingFollow, setSendingFollow] = useState(false);
  const [playerSport, setPlayerSport] = useState<'baseball' | 'softball'>('baseball');
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    contact_email: "",
    bio: "",
    avatar_url: "",
    credentials: [] as string[],
    position: "",
    experience_level: "",
    height: "",
    weight: "",
    state: "",
    graduation_year: "",
    team_affiliation: "",
    years_affiliated: "",
    throwing_hand: "",
    batting_side: "",
    commitment_status: "",
    college_grad_year: "",
    enrolled_in_college: false,
    is_professional: false,
    is_free_agent: false,
    mlb_affiliate: "",
    independent_league: "",
    is_foreign_player: false,
    social_instagram: "",
    social_twitter: "",
    social_facebook: "",
    social_linkedin: "",
    social_youtube: "",
    social_tiktok: "",
    social_website: "",
    social_website_2: "",
    social_website_3: "",
    social_website_4: "",
    social_website_5: "",
    currently_in_high_school: false,
    sat_score: "",
    act_score: "",
    gpa: "",
    ncaa_id: ""
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (authLoading || ownerLoading) return;
    
    if (!user) {
      navigate("/auth", { replace: true });
    } else {
      // Check if viewing another user's profile
      if (viewingUserId && viewingUserId !== user.id) {
        setViewingOtherProfile(true);
      } else {
        setViewingOtherProfile(false);
      }
      fetchProfile(viewingUserId || undefined);
    }
  }, [authLoading, ownerLoading, user, navigate, viewingUserId]);

  useEffect(() => {
    const checkFollowRelationship = async () => {
      if (!user || !viewingOtherProfile || !viewingUserId) {
        setHasAcceptedFollow(false);
        setFollowStatus(null);
        return;
      }

      try {
        // Get current user's role
        const { data: currentRoleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setCurrentUserRole(currentRoleData?.role || null);

        // Only check follow status if current user is a scout/coach
        if (currentRoleData?.role !== 'scout' && currentRoleData?.role !== 'coach') {
          setFollowStatus(null);
          setHasAcceptedFollow(false);
          return;
        }

        // Check follow relationship where scout_id = current user, player_id = viewing user
        const { data, error } = await supabase
          .from('scout_follows')
          .select('status')
          .eq('scout_id', user.id)
          .eq('player_id', viewingUserId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking follow relationship:', error);
          setFollowStatus('none');
          setHasAcceptedFollow(false);
        } else {
          const status = data?.status as 'pending' | 'accepted' | undefined;
          setFollowStatus(status || 'none');
          setHasAcceptedFollow(status === 'accepted');
        }
      } catch (error) {
        console.error('Error in checkFollowRelationship:', error);
        setFollowStatus('none');
        setHasAcceptedFollow(false);
      }
    };

    checkFollowRelationship();
  }, [user, viewingOtherProfile, viewingUserId]);

  // Fetch current user's role (for bio prompt visibility)
  useEffect(() => {
    const fetchCurrentUserRole = async () => {
      if (!user || viewingOtherProfile) return; // Only fetch when viewing own profile
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setCurrentUserRole(data?.role || null);
    };
    
    fetchCurrentUserRole();
  }, [user, viewingOtherProfile]);

  const fetchProfile = async (targetUserId?: string) => {
    if (!user) return;

    try {
      // Determine which user's profile to fetch
      const userId = targetUserId || user.id;
      console.log('[Profile] Fetching profile for userId:', userId, 'from param:', targetUserId, 'viewingOtherProfile:', viewingOtherProfile);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
      
      // Fetch user role for the target user
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      let userRole = roleData?.role || null;
      
      // Fallback: If no role found but profile has player-specific data, assume player
      if (!userRole && data.position) {
        userRole = 'player';
      }
      
      setUserRole(userRole);
      
      // Detect sport from subscriptions for proper label display
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('subscribed_modules')
        .eq('user_id', userId)
        .maybeSingle();

      const hasSoftballModules = subData?.subscribed_modules?.some((mod: string) => 
        mod.startsWith('softball_')
      ) || false;

      setPlayerSport(hasSoftballModules ? 'softball' : 'baseball');
      
      setEditForm({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        contact_email: data.contact_email || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
        credentials: data.credentials || [],
        position: data.position || "",
        experience_level: data.experience_level || "",
        height: data.height || "",
        weight: data.weight || "",
        state: data.state || "",
        graduation_year: data.graduation_year?.toString() || "",
        team_affiliation: data.team_affiliation || "",
        years_affiliated: data.years_affiliated?.toString() || "",
        throwing_hand: data.throwing_hand || "",
        batting_side: data.batting_side || "",
        commitment_status: data.commitment_status || "",
        college_grad_year: data.college_grad_year?.toString() || "",
        enrolled_in_college: data.enrolled_in_college || false,
        is_professional: data.is_professional || false,
        is_free_agent: data.is_free_agent || false,
        mlb_affiliate: data.mlb_affiliate || "",
        independent_league: data.independent_league || "",
        is_foreign_player: data.is_foreign_player || false,
        social_instagram: data.social_instagram || "",
        social_twitter: data.social_twitter || "",
        social_facebook: data.social_facebook || "",
        social_linkedin: data.social_linkedin || "",
        social_youtube: data.social_youtube || "",
        social_tiktok: data.social_tiktok || "",
        social_website: data.social_website || "",
        social_website_2: data.social_website_2 || "",
        social_website_3: data.social_website_3 || "",
        social_website_4: data.social_website_4 || "",
        social_website_5: data.social_website_5 || "",
        currently_in_high_school: data.currently_in_high_school || false,
        sat_score: data.sat_score?.toString() || "",
        act_score: data.act_score?.toString() || "",
        gpa: data.gpa?.toString() || "",
        ncaa_id: data.ncaa_id || ""
      });
      setAvatarPreview(data.avatar_url);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: t('toast.errorLoadingProfile'),
        description: t('profile.unableToLoadProfile'),
        variant: "destructive"
      });
      if (viewingOtherProfile) {
        navigate('/scout-dashboard');
      }
    }
  };

  const handleSendFollow = async () => {
    if (!viewingUserId) return;
    
    setSendingFollow(true);
    try {
      const { error } = await supabase.functions.invoke('send-follow-request', {
        body: { player_id: viewingUserId }
      });

      if (error) throw error;

      toast({
        title: t('toast.followRequestSent'),
        description: t('profile.followRequestSentTo', { name: profile?.first_name || t('profile.thePlayer') }),
      });

      // Update follow status to pending
      setFollowStatus('pending');
      
    } catch (error: any) {
      console.error('Error sending follow:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('profile.failedToSendFollowRequest'),
        variant: 'destructive',
      });
    } finally {
      setSendingFollow(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({ 
        title: t('toast.fileTooLarge'), 
        description: t('toast.maxFileSizeInfo'), 
        variant: "destructive" 
      });
      return;
    }
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      setEditForm({ ...editForm, avatar_url: publicUrl });
      setAvatarPreview(publicUrl);
      
      toast({
        title: t('toast.uploadSuccessful'),
        description: t('toast.profilePictureUploaded'),
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ 
        title: t('toast.uploadFailed'), 
        description: t('profile.failedToUploadProfilePicture'), 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const updateData: any = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        contact_email: editForm.contact_email,
        bio: editForm.bio,
        avatar_url: editForm.avatar_url,
        credentials: editForm.credentials,
        social_instagram: editForm.social_instagram,
        social_twitter: editForm.social_twitter,
        social_facebook: editForm.social_facebook,
        social_linkedin: editForm.social_linkedin,
        social_youtube: editForm.social_youtube,
        social_tiktok: editForm.social_tiktok,
        social_website: editForm.social_website,
        social_website_2: editForm.social_website_2,
        social_website_3: editForm.social_website_3,
        social_website_4: editForm.social_website_4,
        social_website_5: editForm.social_website_5
      };

      // Add role-specific fields
      if (userRole === 'player') {
        updateData.position = editForm.position;
        updateData.experience_level = editForm.experience_level;
        updateData.height = editForm.height;
        updateData.weight = editForm.weight;
        updateData.state = editForm.state;
        updateData.graduation_year = editForm.graduation_year ? parseInt(editForm.graduation_year) : null;
        updateData.team_affiliation = editForm.team_affiliation;
        updateData.throwing_hand = editForm.throwing_hand || null;
        updateData.batting_side = editForm.batting_side || null;
        updateData.commitment_status = editForm.commitment_status || null;
        updateData.college_grad_year = editForm.college_grad_year ? parseInt(editForm.college_grad_year) : null;
        updateData.enrolled_in_college = editForm.enrolled_in_college;
        updateData.is_professional = editForm.is_professional;
        updateData.is_free_agent = editForm.is_free_agent;
        updateData.mlb_affiliate = editForm.mlb_affiliate || null;
        updateData.independent_league = editForm.independent_league || null;
        updateData.is_foreign_player = editForm.is_foreign_player;
        updateData.currently_in_high_school = editForm.currently_in_high_school;
        updateData.sat_score = editForm.sat_score ? parseInt(editForm.sat_score) : null;
        updateData.act_score = editForm.act_score ? parseInt(editForm.act_score) : null;
        updateData.gpa = editForm.gpa ? parseFloat(editForm.gpa) : null;
        updateData.ncaa_id = editForm.ncaa_id || null;
      } else if (userRole === 'scout' || userRole === 'admin') {
        updateData.position = editForm.position;
        updateData.team_affiliation = editForm.team_affiliation;
        updateData.years_affiliated = editForm.years_affiliated ? parseInt(editForm.years_affiliated) : null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: t('toast.profileUpdated'),
        description: t('toast.profileSaved'),
      });

      setEditDialogOpen(false);
      fetchProfile(viewingUserId || undefined);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: t('common.error'),
        description: t('profile.failedToSaveProfile'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddModules = () => {
    let currentSport = localStorage.getItem('selectedSport');
    
    if (!currentSport || (currentSport !== 'baseball' && currentSport !== 'softball')) {
      const hasSoftball = subscribedModules.some(m => m.startsWith('softball_'));
      const hasBaseball = subscribedModules.some(m => m.startsWith('baseball_'));
      
      if (hasSoftball && !hasBaseball) {
        currentSport = 'softball';
      } else if (hasBaseball || !hasSoftball) {
        currentSport = 'baseball';
      }
      
      if (currentSport) {
        localStorage.setItem('selectedSport', currentSport);
      }
    }
    
    navigate('/select-modules', { 
      state: { 
        mode: 'add',
        sport: currentSport || 'baseball'
      } 
    });
  };

  const handleCancelAll = async () => {
    if (!confirm(t('profile.cancelAllConfirm'))) return;
    
    setIsRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.functions.invoke('cancel-all-subscriptions', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (error) throw error;
      
      toast({
        title: t('toast.modulesCanceled'),
        description: data.message || t('profile.keepAccessUntilBillingDate')
      });
      
      refetch();
    } catch (error) {
      console.error('Cancel all error:', error);
      toast({
        title: t('common.error'),
        description: t('profile.failedToCancelSubscriptions'),
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!session) return;
    
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: t('profile.openingBillingPortal'),
          description: t('profile.manageBillingInNewTab'),
        });
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      
      // Check if this is the Stripe portal configuration error
      const errorMessage = error?.message || '';
      const isPortalConfigError = errorMessage.includes('No configuration provided') || 
                                   errorMessage.includes('default configuration has not been created');
      
      toast({
        title: t('toast.billingPortalUnavailable'),
        description: isPortalConfigError 
          ? t('profile.portalBeingSetUp')
          : t('profile.failedToOpenBillingPortal'),
        variant: "destructive",
      });
    } finally {
      setOpeningPortal(false);
    }
  };

  if (authLoading || subLoading || ownerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const menuName = user.user_metadata?.full_name || "User";
  const menuEmail = user.email || "";
  const displayName = viewingOtherProfile
    ? (profile?.full_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Player")
    : (profile?.full_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || menuName);
  
  const isPlayer = userRole === 'player';
  const isCoachOrScout = userRole === 'scout' || userRole === 'admin';
  
  // Show email if:
  // 1. Viewing own profile -> show user's auth email
  // 2. Owner viewing someone else's contact_email
  // 3. Scout/Coach viewing ANY player profile (no follow requirement)
  // 4. NEVER show scout/coach email to players
  const displayEmail = viewingOtherProfile 
    ? (isOwner 
        || ((currentUserRole === 'scout' || currentUserRole === 'coach') && isPlayer)
        ? profile?.contact_email || "" 
        : "") 
    : menuEmail;
  const initials = (displayName || "U")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const subscriptionEndDate = subscription_end 
    ? new Date(subscription_end).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('profile.backToDashboard')}
          </Button>
          <UserMenu userName={menuName} userEmail={menuEmail} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">
          {viewingOtherProfile ? t('profile.viewingPlayerProfile', { name: displayName }) : t('profile.title')}
        </h1>
        <div className="flex items-center gap-3">
          {viewingOtherProfile && (
            <Badge variant="secondary">
              {isOwner
                ? t('profile.viewingAsOwner')
                : currentUserRole === 'scout'
                ? t('profile.viewingAsScout')
                : currentUserRole === 'coach'
                ? t('profile.viewingAsCoach')
                : t('profile.viewingProfile')}
            </Badge>
          )}
          
          {/* Follow Action Buttons - Only show if scout/coach viewing a player */}
          {viewingOtherProfile && 
           (currentUserRole === 'scout' || currentUserRole === 'coach') && 
           isPlayer && (
            <>
              {followStatus === 'none' && (
                <Button
                  onClick={handleSendFollow}
                  disabled={sendingFollow}
                  variant="default"
                  className="gap-2"
                >
                  {sendingFollow ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  {sendingFollow ? t('profile.sending') : t('profile.followPlayer')}
                </Button>
              )}
              {followStatus === 'pending' && (
                <Badge variant="secondary" className="gap-1 px-3 py-1.5">
                  <Clock className="h-4 w-4" />
                  {t('profile.followRequestPending')}
                </Badge>
              )}
              {followStatus === 'accepted' && (
                <Badge variant="default" className="gap-1 px-3 py-1.5">
                  <Check className="h-4 w-4" />
                  {t('profile.following')}
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

        {/* User Info Card */}
        <Card className="p-4 sm:p-6 mb-6 relative overflow-hidden">
          {/* Edit button positioned absolutely in top-right */}
          {!viewingOtherProfile && (
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="absolute top-3 right-3 h-8 w-8 z-10">
                  <Edit className="h-4 w-4" />
                </Button>
              </DialogTrigger>
            </Dialog>
          )}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-6 pr-10 sm:pr-12">
            <Avatar className="h-20 w-20">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{displayName}</h2>
              {displayEmail && <p className="text-muted-foreground">{displayEmail}</p>}
              {profile?.bio && (
                <p className="text-sm text-muted-foreground mt-2">{profile.bio}</p>
              )}
              
              {/* Credentials Display */}
              {profile?.credentials && profile.credentials.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">{t('profile.experienceCredentials')}</h4>
                  <div className="space-y-2">
                    {profile.credentials.map((cred: string, index: number) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{cred}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Player-Specific Info */}
              {isPlayer && (
                <>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  {profile?.height && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.height')}</Label>
                      <p>{profile.height}</p>
                    </div>
                  )}
                  {profile?.weight && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.weight')}</Label>
                      <p>{profile.weight}</p>
                    </div>
                  )}
                  {profile?.throwing_hand && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.throws')}</Label>
                      <p>{profile.throwing_hand === 'B' ? t('profile.both') : profile.throwing_hand === 'R' ? t('profile.right') : t('profile.left')}</p>
                    </div>
                  )}
                  {profile?.batting_side && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.bats')}</Label>
                      <p>{profile.batting_side === 'B' ? t('profile.switch') : profile.batting_side === 'R' ? t('profile.right') : t('profile.left')}</p>
                    </div>
                  )}
                  {profile?.state && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.state')}</Label>
                      <p>{profile.state}</p>
                    </div>
                  )}
                  {profile?.graduation_year && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.hsGradYear')}</Label>
                      <p>{profile.graduation_year}</p>
                    </div>
                  )}
                  {profile?.college_grad_year && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.collegeGradYear')}</Label>
                      <p>{profile.college_grad_year}</p>
                    </div>
                  )}
                  {profile?.enrolled_in_college && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.collegeStatus')}</Label>
                      <p>{t('profile.currentlyEnrolled')}</p>
                    </div>
                  )}
                  {profile?.position && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.position')}</Label>
                      <p>{profile.position}</p>
                    </div>
                  )}
                  {profile?.experience_level && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.experienceLevel')}</Label>
                      <p className="capitalize">{profile.experience_level.replace('_', ' ')}</p>
                    </div>
                  )}
                  {profile?.commitment_status && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.status')}</Label>
                      <p className="capitalize">{profile.commitment_status}</p>
                    </div>
                  )}
                  {profile?.team_affiliation && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.team')}</Label>
                      <p>{profile.team_affiliation}</p>
                    </div>
                  )}
                  {profile?.is_professional && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.level')}</Label>
                      <p>{t('profile.professionalPlayer')}</p>
                    </div>
                  )}
                  {profile?.is_free_agent && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.status')}</Label>
                      <p>{t('profile.freeAgent')}</p>
                    </div>
                  )}
                  {profile?.mlb_affiliate && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {playerSport === 'softball' ? t('profile.professionalAffiliate') : t('profile.mlbAffiliate')}
                      </Label>
                      <p>{profile.mlb_affiliate}</p>
                    </div>
                  )}
                  {profile?.independent_league && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.independentLeague')}</Label>
                      <p>{profile.independent_league}</p>
                    </div>
                  )}
                  {profile?.is_foreign_player && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.playerType')}</Label>
                      <p>{t('profile.internationalPlayer')}</p>
                    </div>
                  )}
                </div>
                
                {/* Academic & NCAA Info */}
                {(profile?.sat_score || profile?.act_score || profile?.gpa || profile?.ncaa_id) && (
                  <div className="mt-4 p-3 border border-border rounded-lg bg-muted/10">
                    <Label className="text-sm font-semibold">{t('profile.academicNcaaInfo')}</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                      {profile?.sat_score && (
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('profile.satScore')}</Label>
                          <p>{profile.sat_score}</p>
                        </div>
                      )}
                      {profile?.act_score && (
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('profile.actScore')}</Label>
                          <p>{profile.act_score}</p>
                        </div>
                      )}
                      {profile?.gpa && (
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('profile.gpa')}</Label>
                          <p>{profile.gpa}</p>
                        </div>
                      )}
                      {profile?.ncaa_id && (
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('profile.ncaaId')}</Label>
                          <p>{profile.ncaa_id}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                </>
              )}
              
              {/* Coach/Scout Info */}
              {isCoachOrScout && (
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  {profile?.position && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.position')}</Label>
                      <p>{profile.position}</p>
                    </div>
                  )}
                  {profile?.team_affiliation && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.teamAffiliation')}</Label>
                      <p>{profile.team_affiliation}</p>
                    </div>
                  )}
                  {profile?.years_affiliated && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('profile.yearsAffiliated')}</Label>
                      <p>{profile.years_affiliated} {t('profile.years')}</p>
                    </div>
                  )}
                </div>
              )}
              {(profile?.social_instagram || profile?.social_twitter || 
                profile?.social_facebook || profile?.social_linkedin || 
                profile?.social_youtube || profile?.social_tiktok ||
                profile?.social_website || profile?.social_website_2 ||
                profile?.social_website_3 || profile?.social_website_4 ||
                profile?.social_website_5) && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {profile.social_instagram && (
                    <a 
                      href={profile.social_instagram.startsWith('http') ? profile.social_instagram : `https://instagram.com/${profile.social_instagram}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                  {profile.social_twitter && (
                    <a 
                      href={profile.social_twitter.startsWith('http') ? profile.social_twitter : `https://twitter.com/${profile.social_twitter}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Twitter className="h-5 w-5" />
                    </a>
                  )}
                  {profile.social_facebook && (
                    <a 
                      href={profile.social_facebook}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Facebook className="h-5 w-5" />
                    </a>
                  )}
                  {profile.social_linkedin && (
                    <a 
                      href={profile.social_linkedin}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Linkedin className="h-5 w-5" />
                    </a>
                  )}
                  {profile.social_youtube && (
                    <a 
                      href={profile.social_youtube}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Youtube className="h-5 w-5" />
                    </a>
                  )}
                  {profile.social_tiktok && (
                    <a 
                      href={profile.social_tiktok.startsWith('http') ? profile.social_tiktok : `https://tiktok.com/@${profile.social_tiktok}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="TikTok"
                    >
                      <SiTiktok className="h-5 w-5" />
                    </a>
                  )}
                  {profile.social_website && (
                    <a 
                      href={profile.social_website}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Website"
                    >
                      <Globe className="h-5 w-5" />
                    </a>
                  )}
                  {profile.social_website_2 && (
                    <a 
                      href={profile.social_website_2}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Website 2"
                    >
                      <Globe className="h-5 w-5" />
                    </a>
                  )}
                  {profile.social_website_3 && (
                    <a 
                      href={profile.social_website_3}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Website 3"
                    >
                      <Globe className="h-5 w-5" />
                    </a>
                  )}
                  {profile.social_website_4 && (
                    <a 
                      href={profile.social_website_4}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Website 4"
                    >
                      <Globe className="h-5 w-5" />
                    </a>
                  )}
                  {profile.social_website_5 && (
                    <a 
                      href={profile.social_website_5}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Website 5"
                    >
                      <Globe className="h-5 w-5" />
                    </a>
                  )}
                </div>
              )}
            </div>
            {!viewingOtherProfile && (
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>{t('profile.editProfile')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 overflow-y-auto flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">{t('profile.firstName')}</Label>
                      <Input
                        id="first_name"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                        placeholder={t('profile.placeholders.firstName')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">{t('profile.lastName')}</Label>
                      <Input
                        id="last_name"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                        placeholder={t('profile.placeholders.lastName')}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">
                      {t('profile.contactEmail')} <span className="text-xs text-muted-foreground">({t('profile.public')})</span>
                    </Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={editForm.contact_email}
                      onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                      placeholder={t('profile.placeholders.email')}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('profile.contactEmailDescription')}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">{t('profile.bio')}</Label>
                    {currentUserRole === 'player' && (
                      <p className="text-xs text-muted-foreground mt-1 mb-2">
                        {t('profile.playerBioPrompt')}
                      </p>
                    )}
                    <Textarea
                      id="bio"
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder={t('profile.bioPlaceholder')}
                      maxLength={500}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {editForm.bio.length}/500 {t('profile.characters')}
                    </p>
                  </div>
                  
                  {/* Credentials/Experience List */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t('profile.experienceCredentials')}</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {t('profile.credentialsDescription')}
                    </p>
                    
                    <div className="space-y-2">
                      {editForm.credentials.map((cred, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={cred}
                            onChange={(e) => {
                              const newCredentials = [...editForm.credentials];
                              newCredentials[index] = e.target.value;
                              setEditForm({ ...editForm, credentials: newCredentials });
                            }}
                            placeholder={t('profile.placeholders.credential')}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newCredentials = editForm.credentials.filter((_, i) => i !== index);
                              setEditForm({ ...editForm, credentials: newCredentials });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      {editForm.credentials.length < 10 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditForm({ ...editForm, credentials: [...editForm.credentials, ""] });
                          }}
                          className="w-full"
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          {t('profile.addCredential')}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('profile.profilePicture')}</Label>
                    <div className="flex gap-4 items-start">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={avatarPreview || profile?.avatar_url} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <Input 
                          type="file" 
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={uploading}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t('profile.maxSizeInfo')}
                        </p>
                        <Input
                          placeholder={t('profile.orEnterImageUrl')}
                          value={editForm.avatar_url}
                          onChange={(e) => {
                            setEditForm({ ...editForm, avatar_url: e.target.value });
                            setAvatarPreview(e.target.value);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Player-specific fields */}
                  {isPlayer && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="height">{t('profile.height')}</Label>
                          <Input
                            id="height"
                            value={editForm.height}
                            onChange={(e) => setEditForm({ ...editForm, height: e.target.value })}
                            placeholder={t('profile.placeholders.height')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="weight">{t('profile.weight')}</Label>
                          <Input
                            id="weight"
                            value={editForm.weight}
                            onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                            placeholder={t('profile.placeholders.weight')}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="state">{t('profile.state')}</Label>
                          <Input
                            id="state"
                            value={editForm.state}
                            onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                            placeholder={t('profile.placeholders.state')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="graduation_year">{t('profile.hsGradYear')}</Label>
                          <Input
                            id="graduation_year"
                            type="number"
                            value={editForm.graduation_year}
                            onChange={(e) => setEditForm({ ...editForm, graduation_year: e.target.value })}
                            placeholder={t('profile.placeholders.hsGradYear')}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="position">{t('profile.primaryPosition')}</Label>
                        <Select
                          value={editForm.position}
                          onValueChange={(value) => setEditForm({ ...editForm, position: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('profile.selectPosition')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="P">{t('profile.positions.pitcher')}</SelectItem>
                            <SelectItem value="C">{t('profile.positions.catcher')}</SelectItem>
                            <SelectItem value="1B">{t('profile.positions.firstBase')}</SelectItem>
                            <SelectItem value="2B">{t('profile.positions.secondBase')}</SelectItem>
                            <SelectItem value="3B">{t('profile.positions.thirdBase')}</SelectItem>
                            <SelectItem value="SS">{t('profile.positions.shortstop')}</SelectItem>
                            <SelectItem value="LF">{t('profile.positions.leftField')}</SelectItem>
                            <SelectItem value="CF">{t('profile.positions.centerField')}</SelectItem>
                            <SelectItem value="RF">{t('profile.positions.rightField')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="team_affiliation">{t('profile.teamAffiliation')}</Label>
                        <Input
                          id="team_affiliation"
                          value={editForm.team_affiliation}
                          onChange={(e) => setEditForm({ ...editForm, team_affiliation: e.target.value })}
                          placeholder={t('profile.placeholders.teamAffiliation')}
                        />
                      </div>
                      
                      {/* Playing Style */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">{t('profile.playingStyle')}</Label>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="throwing_hand">{t('profile.throwingHand')}</Label>
                            <Select
                              value={editForm.throwing_hand}
                              onValueChange={(value) => setEditForm({ ...editForm, throwing_hand: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('common.select')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="R">{t('profile.right')}</SelectItem>
                                <SelectItem value="L">{t('profile.left')}</SelectItem>
                                <SelectItem value="B">{t('profile.both')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="batting_side">{t('profile.battingSide')}</Label>
                            <Select
                              value={editForm.batting_side}
                              onValueChange={(value) => setEditForm({ ...editForm, batting_side: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('common.select')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="R">{t('profile.right')}</SelectItem>
                                <SelectItem value="L">{t('profile.left')}</SelectItem>
                                <SelectItem value="B">{t('profile.switch')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      
                      {/* Academic & Commitment Status */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">{t('profile.academicCommitment')}</Label>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="college_grad_year">{t('profile.collegeGradYear')}</Label>
                            <Input
                              id="college_grad_year"
                              type="number"
                              value={editForm.college_grad_year}
                              onChange={(e) => setEditForm({ ...editForm, college_grad_year: e.target.value })}
                              placeholder={t('profile.placeholders.collegeGradYear')}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="commitment_status">{t('profile.commitmentStatus')}</Label>
                            <Select
                              value={editForm.commitment_status}
                              onValueChange={(value) => setEditForm({ ...editForm, commitment_status: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('common.select')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="committed">{t('profile.committed')}</SelectItem>
                                <SelectItem value="uncommitted">{t('profile.uncommitted')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="enrolled_in_college"
                            checked={editForm.enrolled_in_college}
                            onCheckedChange={(checked) => setEditForm({ ...editForm, enrolled_in_college: checked })}
                          />
                          <Label htmlFor="enrolled_in_college">{t('profile.currentlyEnrolledInCollege')}</Label>
                        </div>
                      </div>
                      
                      {/* Professional Status */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">{t('profile.professionalStatus')}</Label>
                        
                        <div className="flex items-center space-x-2 mb-2">
                          <Switch
                            id="is_professional"
                            checked={editForm.is_professional}
                            onCheckedChange={(checked) => setEditForm({ ...editForm, is_professional: checked })}
                          />
                          <Label htmlFor="is_professional">{t('profile.isProfessional')}</Label>
                        </div>
                        
                        {editForm.is_professional && (
                          <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="is_free_agent"
                                checked={editForm.is_free_agent}
                                onCheckedChange={(checked) => setEditForm({ ...editForm, is_free_agent: checked })}
                              />
                              <Label htmlFor="is_free_agent">{t('profile.freeAgent')}</Label>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="mlb_affiliate">
                                {playerSport === 'softball' ? t('profile.professionalAffiliate') : t('profile.mlbAffiliate')}
                              </Label>
                              <Input
                                id="mlb_affiliate"
                                value={editForm.mlb_affiliate}
                                onChange={(e) => setEditForm({ ...editForm, mlb_affiliate: e.target.value })}
                                placeholder={playerSport === 'softball' ? t('profile.placeholders.softballAffiliate') : t('profile.placeholders.mlbAffiliate')}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="independent_league">{t('profile.independentLeague')}</Label>
                              <Input
                                id="independent_league"
                                value={editForm.independent_league}
                                onChange={(e) => setEditForm({ ...editForm, independent_league: e.target.value })}
                                placeholder={t('profile.placeholders.independentLeague')}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* International Status */}
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_foreign_player"
                          checked={editForm.is_foreign_player}
                          onCheckedChange={(checked) => setEditForm({ ...editForm, is_foreign_player: checked })}
                        />
                        <Label htmlFor="is_foreign_player">{t('profile.isForeignPlayer')}</Label>
                      </div>

                      {/* High School & Academic Fields */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="currently_in_high_school"
                            checked={editForm.currently_in_high_school}
                            onCheckedChange={(checked) => setEditForm({ ...editForm, currently_in_high_school: checked })}
                          />
                          <Label htmlFor="currently_in_high_school">{t('profile.currentlyInHighSchool')}</Label>
                        </div>

                        {editForm.currently_in_high_school && (
                          <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label htmlFor="sat_score">{t('profile.satScore')}</Label>
                                <Input
                                  id="sat_score"
                                  type="number"
                                  value={editForm.sat_score}
                                  onChange={(e) => setEditForm({ ...editForm, sat_score: e.target.value })}
                                  placeholder="400-1600"
                                  min={400}
                                  max={1600}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="act_score">{t('profile.actScore')}</Label>
                                <Input
                                  id="act_score"
                                  type="number"
                                  value={editForm.act_score}
                                  onChange={(e) => setEditForm({ ...editForm, act_score: e.target.value })}
                                  placeholder="1-36"
                                  min={1}
                                  max={36}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="gpa">{t('profile.gpa')}</Label>
                              <Input
                                id="gpa"
                                type="number"
                                value={editForm.gpa}
                                onChange={(e) => setEditForm({ ...editForm, gpa: e.target.value })}
                                placeholder="0.00-5.00"
                                min={0}
                                max={5}
                                step={0.01}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="ncaa_id">{t('profile.ncaaId')}</Label>
                              <Input
                                id="ncaa_id"
                                value={editForm.ncaa_id}
                                onChange={(e) => setEditForm({ ...editForm, ncaa_id: e.target.value })}
                                placeholder={t('profile.ncaaIdPlaceholder')}
                              />
                              <div className="p-3 bg-muted/40 rounded-md text-xs text-muted-foreground space-y-1">
                                <p className="font-medium text-foreground">{t('profile.ncaaInfoTitle')}</p>
                                <p>{t('profile.ncaaInfoDescription')}</p>
                                <a href="https://web3.ncaa.org/ecwr3/" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-block mt-1">
                                  {t('profile.ncaaSignupLink')}
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* NCAA ID for college players (when not in high school) */}
                        {editForm.enrolled_in_college && !editForm.currently_in_high_school && (
                          <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                            <Label htmlFor="ncaa_id_college">{t('profile.ncaaId')}</Label>
                            <Input
                              id="ncaa_id_college"
                              value={editForm.ncaa_id}
                              onChange={(e) => setEditForm({ ...editForm, ncaa_id: e.target.value })}
                              placeholder={t('profile.ncaaIdPlaceholder')}
                            />
                            <div className="p-3 bg-muted/40 rounded-md text-xs text-muted-foreground space-y-1">
                              <p className="font-medium text-foreground">{t('profile.ncaaInfoTitle')}</p>
                              <p>{t('profile.ncaaInfoDescription')}</p>
                              <a href="https://web3.ncaa.org/ecwr3/" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-block mt-1">
                                {t('profile.ncaaSignupLink')}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Experience Level */}
                      <div className="space-y-2">
                        <Label htmlFor="experience_level">{t('profile.experienceLevel')}</Label>
                        <Select
                          value={editForm.experience_level}
                          onValueChange={(value) => setEditForm({ ...editForm, experience_level: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('profile.selectLevel')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="youth">{t('profile.experienceLevels.youth')}</SelectItem>
                            <SelectItem value="high_school">{t('profile.experienceLevels.highSchool')}</SelectItem>
                            <SelectItem value="college">{t('profile.experienceLevels.college')}</SelectItem>
                            <SelectItem value="professional">{t('profile.experienceLevels.professional')}</SelectItem>
                            <SelectItem value="semi_pro">{t('profile.experienceLevels.semiPro')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  
                  {/* Coach/Scout-specific fields */}
                  {isCoachOrScout && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="position">{t('profile.positionRole')}</Label>
                        <Input
                          id="position"
                          value={editForm.position}
                          onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                          placeholder={t('profile.placeholders.positionRole')}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="team_affiliation">{t('profile.teamAffiliation')}</Label>
                        <Input
                          id="team_affiliation"
                          value={editForm.team_affiliation}
                          onChange={(e) => setEditForm({ ...editForm, team_affiliation: e.target.value })}
                          placeholder={t('profile.placeholders.organization')}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="years_affiliated">{t('profile.yearsAffiliated')}</Label>
                        <Input
                          id="years_affiliated"
                          type="number"
                          value={editForm.years_affiliated}
                          onChange={(e) => setEditForm({ ...editForm, years_affiliated: e.target.value })}
                          placeholder={t('profile.placeholders.yearsNumber')}
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t('profile.socialMediaLinks')}</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {t('profile.enterHandleOrUrl')}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('profile.placeholders.instagram')}
                          value={editForm.social_instagram}
                          onChange={(e) => setEditForm({ ...editForm, social_instagram: e.target.value })}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Twitter className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('profile.placeholders.twitter')}
                          value={editForm.social_twitter}
                          onChange={(e) => setEditForm({ ...editForm, social_twitter: e.target.value })}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Facebook className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('profile.placeholders.facebook')}
                          value={editForm.social_facebook}
                          onChange={(e) => setEditForm({ ...editForm, social_facebook: e.target.value })}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('profile.placeholders.linkedin')}
                          value={editForm.social_linkedin}
                          onChange={(e) => setEditForm({ ...editForm, social_linkedin: e.target.value })}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Youtube className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('profile.placeholders.youtube')}
                          value={editForm.social_youtube}
                          onChange={(e) => setEditForm({ ...editForm, social_youtube: e.target.value })}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-muted-foreground">TT</span>
                        <Input
                          placeholder={t('profile.placeholders.tiktok')}
                          value={editForm.social_tiktok}
                          onChange={(e) => setEditForm({ ...editForm, social_tiktok: e.target.value })}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('profile.placeholders.website')}
                          value={editForm.social_website}
                          onChange={(e) => setEditForm({ ...editForm, social_website: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional Website Links */}
                  {(editForm.social_website || editForm.social_website_2 || editForm.social_website_3 || editForm.social_website_4 || editForm.social_website_5) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">{t('profile.additionalWebsiteLinks')}</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        {t('profile.addMoreWebsites')}
                      </p>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <Input
                            placeholder={t('profile.placeholders.websiteUrl2')}
                            value={editForm.social_website_2}
                            onChange={(e) => setEditForm({ ...editForm, social_website_2: e.target.value })}
                          />
                        </div>
                        
                        {(editForm.social_website_2 || editForm.social_website_3) && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <Input
                              placeholder={t('profile.placeholders.websiteUrl3')}
                              value={editForm.social_website_3}
                              onChange={(e) => setEditForm({ ...editForm, social_website_3: e.target.value })}
                            />
                          </div>
                        )}
                        
                        {(editForm.social_website_3 || editForm.social_website_4) && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <Input
                              placeholder={t('profile.placeholders.websiteUrl4')}
                              value={editForm.social_website_4}
                              onChange={(e) => setEditForm({ ...editForm, social_website_4: e.target.value })}
                            />
                          </div>
                        )}
                        
                        {(editForm.social_website_4 || editForm.social_website_5) && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <Input
                              placeholder={t('profile.placeholders.websiteUrl5')}
                              value={editForm.social_website_5}
                              onChange={(e) => setEditForm({ ...editForm, social_website_5: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Preferences */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t('profile.preferences')}</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {t('profile.customizeExperience')}
                    </p>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="language">{t('profile.language')}</Label>
                        <LanguageSelector />
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('common.saving', 'Saving...')}
                      </>
                    ) : (
                      t('common.saveChanges')
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </Card>

        {/* Subscription Status Card */}
        {!viewingOtherProfile && (
          <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t('profile.subscriptionStatus')}
            </h3>
            <Badge variant={subscribedModules.length > 0 ? "default" : "secondary"}>
              {subscribedModules.length > 0 ? t('profile.active') : t('profile.noActiveSubscription')}
            </Badge>
          </div>

          {subscribedModules.length > 0 ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{t('profile.activeModules')}</h4>
                <div className="flex flex-wrap gap-2">
                  {subscribedModules.map((module) => (
                    <Badge key={module} variant="outline" className="capitalize">
                      {module}
                    </Badge>
                  ))}
                </div>
              </div>

              {has_discount && discount_percent !== null && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                    {discount_percent === 100 ? (
                      <>{t('profile.fullDiscount')}</>
                    ) : (
                      <>{t('profile.discountApplied', { percent: discount_percent })}</>
                    )}
                  </p>
                </div>
              )}

              {subscriptionEndDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{t('profile.renewsOn', { date: subscriptionEndDate })}</span>
                </div>
              )}

              {!viewingOtherProfile && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">{t('profile.manageYourModules')}</h4>
                    <Button 
                      onClick={handleAddModules}
                      variant="default"
                      className="w-full"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {t('profile.addModules')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {t('profile.noActiveSubscriptions')}
              </p>
              <Button onClick={() => navigate("/checkout")}>
                {t('profile.subscribeToModules')}
              </Button>
            </div>
          )}
        </Card>
        )}

        {/* Manage Subscriptions Section */}
        {!viewingOtherProfile && module_details && Object.keys(module_details).length > 0 && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-bold">{t('profile.manageSubscriptions')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('profile.controlModulesDescription')}
                  </p>
                </div>
                {Object.keys(module_details).length > 1 && (
                  <Button variant="outline" onClick={handleCancelAll} disabled={isRefreshing}>
                    {t('profile.cancelAllModules')}
                  </Button>
                )}
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(module_details).map(([key, details]) => {
                  const [sport, module] = key.split('_') as ['baseball' | 'softball', 'hitting' | 'pitching' | 'throwing'];
                  return (
                    <ModuleManagementCard
                      key={key}
                      sport={sport}
                      module={module}
                      details={details}
                      onActionComplete={refetch}
                    />
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Practice Intelligence Sections - Only show on own profile */}
        {!viewingOtherProfile && (
          <PracticeIntelligenceSections />
        )}

        {/* Color Customization Card - Only show on own profile */}
        {!viewingOtherProfile && (
          <div className="mb-6">
            <ColorCustomizationCard selectedSport={playerSport} />
          </div>
        )}

        {/* Account Info Card */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">{t('profile.accountInformation')}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('profile.userId')}</span>
              <span className="font-mono text-xs">{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('profile.accountCreated')}</span>
              <span>
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
