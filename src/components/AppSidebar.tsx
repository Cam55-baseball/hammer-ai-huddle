import { useState, useEffect } from "react";
import { Home, Trophy, Cloud, Target, Settings, LogOut, Shield, Users, UserPlus, Users2, Instagram, Twitter, Facebook, Linkedin, Youtube, Globe, Mail } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useScoutAccess } from "@/hooks/useScoutAccess";
import { supabase } from "@/integrations/supabase/client";
import { branding } from "@/branding";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

interface OwnerProfile {
  first_name: string | null;
  last_name: string | null;
  full_name?: string | null;
  contact_email?: string | null;
  bio: string | null;
  avatar_url: string | null;
  social_instagram: string | null;
  social_twitter: string | null;
  social_facebook: string | null;
  social_linkedin: string | null;
  social_youtube: string | null;
  social_tiktok?: string | null;
  social_website: string | null;
  social_website_2?: string | null;
  social_website_3?: string | null;
  social_website_4?: string | null;
  social_website_5?: string | null;
}

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const { isScout } = useScoutAccess();
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
  const [ownerBioOpen, setOwnerBioOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<'baseball' | 'softball'>('baseball');

  useEffect(() => {
    const savedSport = localStorage.getItem('selectedSport') as 'baseball' | 'softball';
    if (savedSport) {
      setSelectedSport(savedSport);
    }
  }, []);

  useEffect(() => {
    const fetchOwnerProfile = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-owner-profile');
        if (!error && data) {
          setOwnerProfile(data);
        }
      } catch (error) {
        console.error('Error fetching owner profile:', error);
      }
    };

    fetchOwnerProfile();
  }, []);

  const mainNavItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Rankings", url: "/rankings", icon: Trophy },
    { title: "Weather", url: "/weather", icon: Cloud },
  ];

  const trainingModules = [
    { title: "Hitting Analysis", url: `/analyze/hitting?sport=${selectedSport}`, icon: Target },
    { title: "Pitching Analysis", url: `/analyze/pitching?sport=${selectedSport}`, icon: Target },
    { title: "Throwing Analysis", url: `/analyze/throwing?sport=${selectedSport}`, icon: Target },
  ];

  const accountItems = [
    { title: "Profile", url: "/profile", icon: Settings },
    ...(isOwner ? [
      { title: "Owner Dashboard", url: "/owner", icon: Shield },
      { title: "Subscribers", url: "/subscribers", icon: Users2 }
    ] : []),
    ...(isAdmin ? [{ title: "Admin Dashboard", url: "/admin", icon: Users }] : []),
    ...(isScout ? [{ title: "Scout Dashboard", url: "/scout-dashboard", icon: UserPlus }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img src={branding.logo} alt={branding.appName} className="h-8 w-8 object-contain" />
          <h2 className="text-lg font-bold text-sidebar-foreground">{branding.appName}</h2>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {ownerProfile && (
          <>
            <SidebarGroup className="border-b border-sidebar-border pb-4">
              <SidebarGroupLabel>Owner Bio</SidebarGroupLabel>
              <button
                onClick={() => setOwnerBioOpen(true)}
                className="w-full px-4 py-2 hover:bg-accent/50 rounded-md text-left transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {ownerProfile.avatar_url && <AvatarImage src={ownerProfile.avatar_url} />}
                      <AvatarFallback>
                        {ownerProfile.full_name?.charAt(0) || ownerProfile.first_name?.charAt(0) || 'O'}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-sm">
                      {ownerProfile.full_name || `${ownerProfile.first_name || ''} ${ownerProfile.last_name || ''}`.trim() || 'Owner'}
                    </p>
                  </div>
                  {ownerProfile.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {ownerProfile.bio}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground italic">Click to view full bio →</p>
                </div>
              </button>
            </SidebarGroup>

            {/* Full Owner Bio Dialog */}
            <Dialog open={ownerBioOpen} onOpenChange={setOwnerBioOpen}>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>About the Owner</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      {ownerProfile.avatar_url && <AvatarImage src={ownerProfile.avatar_url} />}
                      <AvatarFallback className="text-2xl">
                        {ownerProfile.full_name?.charAt(0) || ownerProfile.first_name?.charAt(0) || 'O'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold">
                        {ownerProfile.full_name || `${ownerProfile.first_name || ''} ${ownerProfile.last_name || ''}`.trim() || 'Owner'}
                      </h3>
                    </div>
                  </div>

                  {ownerProfile.contact_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${ownerProfile.contact_email}`} 
                        className="text-primary hover:underline"
                      >
                        {ownerProfile.contact_email}
                      </a>
                    </div>
                  )}

                  {ownerProfile.bio && (
                    <div>
                      <h4 className="font-semibold mb-2">About</h4>
                      <p className="text-sm text-muted-foreground">{ownerProfile.bio}</p>
                    </div>
                  )}

                  {(ownerProfile.social_instagram || ownerProfile.social_twitter || 
                    ownerProfile.social_facebook || ownerProfile.social_linkedin || 
                    ownerProfile.social_youtube || ownerProfile.social_tiktok) && (
                    <div>
                      <h4 className="font-semibold mb-2">Social Media</h4>
                      <div className="flex gap-3 flex-wrap">
                        {ownerProfile.social_instagram && (
                          <a 
                            href={ownerProfile.social_instagram.startsWith('http') 
                              ? ownerProfile.social_instagram 
                              : `https://instagram.com/${ownerProfile.social_instagram}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Instagram"
                          >
                            <Instagram className="h-5 w-5" />
                          </a>
                        )}
                        {ownerProfile.social_twitter && (
                          <a 
                            href={ownerProfile.social_twitter.startsWith('http') 
                              ? ownerProfile.social_twitter 
                              : `https://twitter.com/${ownerProfile.social_twitter}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Twitter"
                          >
                            <Twitter className="h-5 w-5" />
                          </a>
                        )}
                        {ownerProfile.social_tiktok && (
                          <a 
                            href={ownerProfile.social_tiktok.startsWith('http') 
                              ? ownerProfile.social_tiktok 
                              : `https://tiktok.com/@${ownerProfile.social_tiktok}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="TikTok"
                          >
                            <span className="text-base font-bold">TT</span>
                          </a>
                        )}
                        {ownerProfile.social_facebook && (
                          <a 
                            href={ownerProfile.social_facebook}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Facebook"
                          >
                            <Facebook className="h-5 w-5" />
                          </a>
                        )}
                        {ownerProfile.social_linkedin && (
                          <a 
                            href={ownerProfile.social_linkedin}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="LinkedIn"
                          >
                            <Linkedin className="h-5 w-5" />
                          </a>
                        )}
                        {ownerProfile.social_youtube && (
                          <a 
                            href={ownerProfile.social_youtube}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="YouTube"
                          >
                            <Youtube className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {(ownerProfile.social_website || ownerProfile.social_website_2 || 
                    ownerProfile.social_website_3 || ownerProfile.social_website_4 || 
                    ownerProfile.social_website_5) && (
                    <div>
                      <h4 className="font-semibold mb-2">Websites</h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          ownerProfile.social_website,
                          ownerProfile.social_website_2,
                          ownerProfile.social_website_3,
                          ownerProfile.social_website_4,
                          ownerProfile.social_website_5
                        ].map((url, index) => url && (
                          <a 
                            key={index}
                            href={url}
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Badge variant="outline" className="gap-1 hover:bg-accent cursor-pointer">
                              <Globe className="h-3 w-3" />
                              {new URL(url).hostname.replace('www.', '')}
                            </Badge>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Training Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {trainingModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip="Sign Out">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
