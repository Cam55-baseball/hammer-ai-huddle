import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { ArrowLeft, Calendar, CreditCard, Loader2, Edit, Instagram, Twitter, Facebook, Linkedin, Youtube, Globe, PlusCircle, Check, X, UserPlus, Clock } from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { UserMenu } from "@/components/UserMenu";
import { ModuleManagementCard } from "@/components/ModuleManagementCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    social_website_5: ""
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

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
          .single();
        
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
        .single();
      
      setUserRole(roleData?.role || null);
      
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
        social_website_5: data.social_website_5 || ""
      });
      setAvatarPreview(data.avatar_url);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error loading profile",
        description: "Unable to load this profile. You may not have permission to view it.",
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
        title: 'Follow request sent',
        description: `A follow request has been sent to ${profile?.first_name || 'the player'}.`,
      });

      // Update follow status to pending
      setFollowStatus('pending');
      
    } catch (error: any) {
      console.error('Error sending follow:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send follow request',
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
        title: "File too large", 
        description: "Maximum file size is 5MB", 
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
        title: "Upload successful",
        description: "Profile picture uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ 
        title: "Upload failed", 
        description: "Failed to upload profile picture", 
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
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });

      setEditDialogOpen(false);
      fetchProfile(viewingUserId || undefined);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
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
    if (!confirm('Cancel all modules? You\'ll keep access until each billing date.')) return;
    
    setIsRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.functions.invoke('cancel-all-subscriptions', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (error) throw error;
      
      toast({
        title: "All modules will be canceled",
        description: data.message || 'You\'ll keep access until each billing date'
      });
      
      refetch();
    } catch (error) {
      console.error('Cancel all error:', error);
      toast({
        title: "Error",
        description: "Failed to cancel subscriptions",
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
          title: "Opening Billing Portal",
          description: "Manage your subscription in the new tab",
        });
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      
      // Check if this is the Stripe portal configuration error
      const errorMessage = error?.message || '';
      const isPortalConfigError = errorMessage.includes('No configuration provided') || 
                                   errorMessage.includes('default configuration has not been created');
      
      toast({
        title: "Billing Portal Unavailable",
        description: isPortalConfigError 
          ? "The billing portal is currently being set up. Please contact support to manage your subscription."
          : "Failed to open billing portal. Please try again later.",
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
            Back to Dashboard
          </Button>
          <UserMenu userName={menuName} userEmail={menuEmail} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">
          {viewingOtherProfile ? `${displayName}'s Profile` : "Profile"}
        </h1>
        <div className="flex items-center gap-3">
          {viewingOtherProfile && (
            <Badge variant="secondary">
              {isOwner
                ? "Viewing as Owner"
                : currentUserRole === 'scout'
                ? "Viewing as Scout"
                : currentUserRole === 'coach'
                ? "Viewing as Coach"
                : "Viewing Profile"}
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
                  {sendingFollow ? 'Sending...' : 'Follow Player'}
                </Button>
              )}
              {followStatus === 'pending' && (
                <Badge variant="secondary" className="gap-1 px-3 py-1.5">
                  <Clock className="h-4 w-4" />
                  Follow Request Pending
                </Badge>
              )}
              {followStatus === 'accepted' && (
                <Badge variant="default" className="gap-1 px-3 py-1.5">
                  <Check className="h-4 w-4" />
                  Following
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

        {/* User Info Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-6 mb-6">
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
                  <h4 className="font-semibold mb-2">Experience & Credentials</h4>
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
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  {profile?.height && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Height</Label>
                      <p>{profile.height}</p>
                    </div>
                  )}
                  {profile?.weight && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Weight</Label>
                      <p>{profile.weight}</p>
                    </div>
                  )}
                  {profile?.state && (
                    <div>
                      <Label className="text-xs text-muted-foreground">State</Label>
                      <p>{profile.state}</p>
                    </div>
                  )}
                  {profile?.graduation_year && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Graduation Year</Label>
                      <p>{profile.graduation_year}</p>
                    </div>
                  )}
                  {profile?.position && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Position</Label>
                      <p>{profile.position}</p>
                    </div>
                  )}
                  {profile?.experience_level && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Experience Level</Label>
                      <p className="capitalize">{profile.experience_level}</p>
                    </div>
                  )}
                  {profile?.team_affiliation && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Team</Label>
                      <p>{profile.team_affiliation}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Coach/Scout Info */}
              {isCoachOrScout && (
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  {profile?.position && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Position</Label>
                      <p>{profile.position}</p>
                    </div>
                  )}
                  {profile?.team_affiliation && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Team Affiliation</Label>
                      <p>{profile.team_affiliation}</p>
                    </div>
                  )}
                  {profile?.years_affiliated && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Years Affiliated</Label>
                      <p>{profile.years_affiliated} years</p>
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
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 overflow-y-auto flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                        placeholder="First name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">
                      Contact Email <span className="text-xs text-muted-foreground">(public)</span>
                    </Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={editForm.contact_email}
                      onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                      placeholder="owner@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      This email will be visible to all users for contacting you
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    {currentUserRole === 'player' && (
                      <p className="text-xs text-muted-foreground mt-1 mb-2">
                        Please include: Contact Email, Height and Weight, State, Graduation Year (HS & College), Batting Side(s), Position(s), Throwing Hand(s), Team Affiliation or Free Agency/Uncommitted status
                      </p>
                    )}
                    <Textarea
                      id="bio"
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      maxLength={500}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {editForm.bio.length}/500 characters
                    </p>
                  </div>
                  
                  {/* Credentials/Experience List */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Experience & Credentials</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add your playing history, coaching roles, certifications, etc.
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
                            placeholder="e.g., Played at University of Texas (2010-2014)"
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
                          Add Credential
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Profile Picture</Label>
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
                          Max size: 5MB. JPG, PNG, or WEBP
                        </p>
                        <Input
                          placeholder="Or enter image URL"
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
                          <Label htmlFor="height">Height</Label>
                          <Input
                            id="height"
                            value={editForm.height}
                            onChange={(e) => setEditForm({ ...editForm, height: e.target.value })}
                            placeholder="e.g., 5'10&quot;"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="weight">Weight</Label>
                          <Input
                            id="weight"
                            value={editForm.weight}
                            onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                            placeholder="e.g., 180 lbs"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={editForm.state}
                            onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                            placeholder="e.g., California"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="graduation_year">Graduation Year</Label>
                          <Input
                            id="graduation_year"
                            type="number"
                            value={editForm.graduation_year}
                            onChange={(e) => setEditForm({ ...editForm, graduation_year: e.target.value })}
                            placeholder="e.g., 2025"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="position">Position</Label>
                        <Input
                          id="position"
                          value={editForm.position}
                          onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                          placeholder="e.g., Pitcher, Outfielder"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="team_affiliation">Team Affiliation</Label>
                        <Input
                          id="team_affiliation"
                          value={editForm.team_affiliation}
                          onChange={(e) => setEditForm({ ...editForm, team_affiliation: e.target.value })}
                          placeholder="Travel team/High School/College/Pro"
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Coach/Scout-specific fields */}
                  {isCoachOrScout && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="position">Position/Role</Label>
                        <Input
                          id="position"
                          value={editForm.position}
                          onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                          placeholder="e.g., Head Coach, Scout"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="team_affiliation">Team Affiliation</Label>
                        <Input
                          id="team_affiliation"
                          value={editForm.team_affiliation}
                          onChange={(e) => setEditForm({ ...editForm, team_affiliation: e.target.value })}
                          placeholder="Team name or organization"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="years_affiliated">Years Affiliated</Label>
                        <Input
                          id="years_affiliated"
                          type="number"
                          value={editForm.years_affiliated}
                          onChange={(e) => setEditForm({ ...editForm, years_affiliated: e.target.value })}
                          placeholder="Number of years"
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Social Media Links</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter your handle (e.g., "username") or full URL
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Instagram username or URL"
                          value={editForm.social_instagram}
                          onChange={(e) => setEditForm({ ...editForm, social_instagram: e.target.value })}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Twitter className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Twitter/X username or URL"
                          value={editForm.social_twitter}
                          onChange={(e) => setEditForm({ ...editForm, social_twitter: e.target.value })}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Facebook className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Facebook profile URL"
                          value={editForm.social_facebook}
                          onChange={(e) => setEditForm({ ...editForm, social_facebook: e.target.value })}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="LinkedIn profile URL"
                          value={editForm.social_linkedin}
                          onChange={(e) => setEditForm({ ...editForm, social_linkedin: e.target.value })}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Youtube className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="YouTube channel URL"
                          value={editForm.social_youtube}
                          onChange={(e) => setEditForm({ ...editForm, social_youtube: e.target.value })}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-muted-foreground">TT</span>
                        <Input
                          placeholder="TikTok username or URL"
                          value={editForm.social_tiktok}
                          onChange={(e) => setEditForm({ ...editForm, social_tiktok: e.target.value })}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Personal website URL"
                          value={editForm.social_website}
                          onChange={(e) => setEditForm({ ...editForm, social_website: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional Website Links */}
                  {(editForm.social_website || editForm.social_website_2 || editForm.social_website_3 || editForm.social_website_4 || editForm.social_website_5) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Additional Website Links</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Add up to 4 more website URLs
                      </p>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <Input
                            placeholder="Website URL 2"
                            value={editForm.social_website_2}
                            onChange={(e) => setEditForm({ ...editForm, social_website_2: e.target.value })}
                          />
                        </div>
                        
                        {(editForm.social_website_2 || editForm.social_website_3) && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <Input
                              placeholder="Website URL 3"
                              value={editForm.social_website_3}
                              onChange={(e) => setEditForm({ ...editForm, social_website_3: e.target.value })}
                            />
                          </div>
                        )}
                        
                        {(editForm.social_website_3 || editForm.social_website_4) && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <Input
                              placeholder="Website URL 4"
                              value={editForm.social_website_4}
                              onChange={(e) => setEditForm({ ...editForm, social_website_4: e.target.value })}
                            />
                          </div>
                        )}
                        
                        {(editForm.social_website_4 || editForm.social_website_5) && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <Input
                              placeholder="Website URL 5"
                              value={editForm.social_website_5}
                              onChange={(e) => setEditForm({ ...editForm, social_website_5: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
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
              Subscription Status
            </h3>
            <Badge variant={subscribedModules.length > 0 ? "default" : "secondary"}>
              {subscribedModules.length > 0 ? "Active" : "No Active Subscription"}
            </Badge>
          </div>

          {subscribedModules.length > 0 ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Active Modules:</h4>
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
                      <>🎉 You have a 100% discount! You're not being charged.</>
                    ) : (
                      <>💰 Active {discount_percent}% discount applied to your subscription</>
                    )}
                  </p>
                </div>
              )}

              {subscriptionEndDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Renews on {subscriptionEndDate}</span>
                </div>
              )}

              {!viewingOtherProfile && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Manage Your Modules</h4>
                    <Button 
                      onClick={handleAddModules}
                      variant="default"
                      className="w-full"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Modules
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You don't have any active subscriptions.
              </p>
              <Button onClick={() => navigate("/checkout")}>
                Subscribe to Modules
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
                  <h3 className="text-xl font-bold">Manage Your Subscriptions</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Control each module individually - cancel anytime
                  </p>
                </div>
                {Object.keys(module_details).length > 1 && (
                  <Button variant="outline" onClick={handleCancelAll} disabled={isRefreshing}>
                    Cancel All Modules
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

        {/* Account Info Card */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Account Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">User ID:</span>
              <span className="font-mono text-xs">{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Created:</span>
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
