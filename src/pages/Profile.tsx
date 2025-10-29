import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, CreditCard, Loader2, Edit, Instagram, Twitter, Facebook, Linkedin, Youtube, Globe } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, session, loading: authLoading } = useAuth();
  const { modules: subscribedModules, subscription_end, has_discount, discount_percent, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [openingPortal, setOpeningPortal] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    bio: "",
    avatar_url: "",
    social_instagram: "",
    social_twitter: "",
    social_facebook: "",
    social_linkedin: "",
    social_youtube: "",
    social_website: ""
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate("/auth", { replace: true });
    } else {
      fetchProfile();
    }
  }, [authLoading, user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setEditForm({
        full_name: data.full_name || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
        social_instagram: data.social_instagram || "",
        social_twitter: data.social_twitter || "",
        social_facebook: data.social_facebook || "",
        social_linkedin: data.social_linkedin || "",
        social_youtube: data.social_youtube || "",
        social_website: data.social_website || ""
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          bio: editForm.bio,
          avatar_url: editForm.avatar_url,
          social_instagram: editForm.social_instagram,
          social_twitter: editForm.social_twitter,
          social_facebook: editForm.social_facebook,
          social_linkedin: editForm.social_linkedin,
          social_youtube: editForm.social_youtube,
          social_website: editForm.social_website
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });

      setEditDialogOpen(false);
      fetchProfile();
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
      toast({
        title: "Error",
        description: "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setOpeningPortal(false);
    }
  };

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const userName = user.user_metadata?.full_name || "User";
  const userEmail = user.email || "";
  const initials = userName
    .split(" ")
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
          <UserMenu userName={userName} userEmail={userEmail} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Profile</h1>

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
              <h2 className="text-2xl font-bold">{userName}</h2>
              <p className="text-muted-foreground">{userEmail}</p>
              {profile?.bio && (
                <p className="text-sm text-muted-foreground mt-2">{profile.bio}</p>
              )}
              {(profile?.social_instagram || profile?.social_twitter || 
                profile?.social_facebook || profile?.social_linkedin || 
                profile?.social_youtube || profile?.social_website) && (
                <div className="flex gap-3 mt-3">
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
                  {profile.social_website && (
                    <a 
                      href={profile.social_website}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Globe className="h-5 w-5" />
                    </a>
                  )}
                </div>
              )}
            </div>
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="avatar_url">Avatar URL</Label>
                    <Input
                      id="avatar_url"
                      value={editForm.avatar_url}
                      onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                  
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
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Personal website URL"
                          value={editForm.social_website}
                          onChange={(e) => setEditForm({ ...editForm, social_website: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  
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
          </div>
        </Card>

        {/* Subscription Status Card */}
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

              <Button 
                onClick={handleManageSubscription}
                disabled={openingPortal}
                className="w-full"
              >
                {openingPortal ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening Portal...
                  </>
                ) : (
                  "Manage Subscription"
                )}
              </Button>
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
