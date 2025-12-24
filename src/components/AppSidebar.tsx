import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Home, Trophy, Cloud, Target, Settings, LogOut, Shield, Users, UserPlus, Users2, Instagram, Twitter, Facebook, Linkedin, Youtube, Globe, Mail, Check, BookMarked, Apple, Loader2, HeartPulse, Dumbbell, ChevronDown, Brain, Lock, Star, ShoppingBag, Eye, LayoutGrid } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useScoutAccess } from "@/hooks/useScoutAccess";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import { useVaultPendingStatus } from "@/hooks/useVaultPendingStatus";
import { useSportTheme } from "@/contexts/SportThemeContext";
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
  credentials?: string[] | null;
  original_bio?: string | null;
  original_credentials?: string[] | null;
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

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function getCachedTranslation(language: string): OwnerProfile | null {
  try {
    const cached = localStorage.getItem(`ownerProfile_${language}`);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(`ownerProfile_${language}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedTranslation(language: string, data: OwnerProfile): void {
  try {
    localStorage.setItem(`ownerProfile_${language}`, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {
    // localStorage might be full, ignore
  }
}

export function AppSidebar() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const { isScout } = useScoutAccess();
  const { modules } = useSubscription();
  const { hasPendingItems, pendingCount } = useVaultPendingStatus();
  const { isSoftball } = useSportTheme();
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [ownerBioOpen, setOwnerBioOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<'baseball' | 'softball'>('baseball');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    hitting: true,
    pitching: true,
  });

  // Check if user has vault access (any module subscription or owner/admin)
  const hasVaultAccess = isOwner || isAdmin || modules.length > 0;

  const toggleModule = (key: string) => {
    // Haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    setExpandedModules(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  useEffect(() => {
    const savedSport = localStorage.getItem('selectedSport') as 'baseball' | 'softball';
    if (savedSport) {
      setSelectedSport(savedSport);
    }
  }, []);

  useEffect(() => {
    const fetchOwnerProfile = async () => {
      // Check cache first
      const cached = getCachedTranslation(currentLanguage);
      if (cached) {
        setOwnerProfile(cached);
        return;
      }

      setIsTranslating(currentLanguage !== 'en');
      
      try {
        const { data, error } = await supabase.functions.invoke('get-owner-profile', {
          body: { targetLanguage: currentLanguage }
        });
        
        if (!error && data) {
          setOwnerProfile(data);
          // Cache the result
          setCachedTranslation(currentLanguage, data);
        }
      } catch (error) {
        console.error('Error fetching owner profile:', error);
      } finally {
        setIsTranslating(false);
      }
    };

    fetchOwnerProfile();
  }, [currentLanguage]);

  const mainNavItems = [
    { title: t('navigation.dashboard'), url: "/dashboard", icon: Home },
    ...(!isScout ? [{ title: t('navigation.myFollowers'), url: "/my-followers", icon: Users }] : []),
    { title: t('navigation.rankings'), url: "/rankings", icon: Trophy },
    { title: t('navigation.nutrition'), url: "/nutrition", icon: Apple },
    { title: t('navigation.mindFuel', 'Mind Fuel'), url: "/mind-fuel", icon: Brain },
    { title: t('navigation.bounceBackBay'), url: "/bounce-back-bay", icon: HeartPulse },
    { title: t('navigation.weather'), url: "/weather", icon: Cloud },
    ...(isScout ? [{ title: t('navigation.scoutDashboard'), url: "/scout-dashboard", icon: UserPlus }] : []),
  ];

  const trainingModules = [
    { 
      key: 'hitting',
      title: t('dashboard.modules.hittingAnalysis'), 
      url: `/analyze/hitting?sport=${selectedSport}`, 
      icon: Target,
      subModules: [
        {
          title: t('workoutModules.productionLab.title'),
          url: "/production-lab",
          icon: Dumbbell,
          description: t('workoutModules.productionLab.subtitle') || "6-week workout"
        },
        {
          title: t('texVision.title', 'Tex Vision'),
          url: "/tex-vision",
          icon: Eye,
          description: t('texVision.subtitle', 'Neuro-Visual Performance')
        }
      ]
    },
    {
      key: 'pitching',
      title: t('dashboard.modules.pitchingAnalysis'), 
      url: `/analyze/pitching?sport=${selectedSport}`, 
      icon: Target,
      subModules: [
        {
          title: t('workoutModules.productionStudio.title'),
          url: "/production-studio",
          icon: Dumbbell,
          description: t('workoutModules.productionStudio.subtitle') || "6-week workout"
        }
      ]
    },
    { key: 'throwing', title: t('dashboard.modules.throwingAnalysis'), url: `/analyze/throwing?sport=${selectedSport}`, icon: Target },
    { key: 'players-club', title: t('navigation.playersClub'), url: "/players-club", icon: BookMarked },
  ];

  const accountItems = [
    { title: t('navigation.profile'), url: "/profile", icon: Settings },
    { title: t('navigation.myCustomActivities', 'My Activities'), url: "/my-custom-activities", icon: LayoutGrid },
    ...(isOwner ? [
      { title: t('navigation.ownerDashboard'), url: "/owner", icon: Shield },
      { title: t('navigation.scoutApplications'), url: "/owner?tab=scout-applications", icon: UserPlus },
      { title: t('navigation.subscribers'), url: "/subscribers", icon: Users2 }
    ] : []),
    ...(isAdmin ? [{ title: t('navigation.adminDashboard'), url: "/admin", icon: Users }] : []),
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
              <SidebarGroupLabel className="flex items-center justify-between w-full">
                <span className="flex items-center gap-2">
                  {t('sidebar.ownerBio')}
                  {isTranslating && <Loader2 className="h-3 w-3 animate-spin" />}
                </span>
                <a
                  href="https://hammers-modality-shop.fourthwall.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold 
                             bg-gradient-to-r from-primary to-primary/70 rounded-full
                             hover:scale-105 hover:shadow-[0_0_12px_hsl(var(--primary)/0.5)] 
                             transition-all duration-200 text-primary-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ShoppingBag className="h-3 w-3" />
                  Merch
                </a>
              </SidebarGroupLabel>
              <button
                onClick={() => setOwnerBioOpen(true)}
                className="w-full px-4 py-2 hover:bg-accent/50 rounded-md text-left transition-colors owner-bio-section"
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
                  <p className="text-xs text-muted-foreground italic">{t('sidebar.clickToViewFullBio')}</p>
                </div>
              </button>
            </SidebarGroup>

            {/* Full Owner Bio Dialog */}
            <Dialog open={ownerBioOpen} onOpenChange={setOwnerBioOpen}>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('sidebar.aboutTheOwner')}</DialogTitle>
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
                      <h4 className="font-semibold mb-2">{t('sidebar.about')}</h4>
                      <p className="text-sm text-muted-foreground">{ownerProfile.bio}</p>
                    </div>
                  )}

                  {ownerProfile.credentials && ownerProfile.credentials.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">{t('sidebar.experienceAndCredentials')}</h4>
                      <div className="space-y-2">
                        {ownerProfile.credentials.map((cred, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{cred}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(ownerProfile.social_instagram || ownerProfile.social_twitter || 
                    ownerProfile.social_facebook || ownerProfile.social_linkedin || 
                    ownerProfile.social_youtube || ownerProfile.social_tiktok) && (
                    <div>
                      <h4 className="font-semibold mb-2">{t('sidebar.socialMedia')}</h4>
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
                      <h4 className="font-semibold mb-2">{t('sidebar.websites')}</h4>
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

        {/* The Vault - Featured Section */}
        <SidebarGroup className="border-b border-sidebar-border pb-3">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem className="sidebar-item">
                <SidebarMenuButton
                  onClick={() => navigate("/vault")}
                  isActive={isActive("/vault")}
                  tooltip={t('navigation.vault', 'The Vault')}
                  className={`group sidebar-item-hover relative ${
                    isSoftball 
                      ? 'bg-gradient-to-r from-yellow-200/10 to-yellow-100/10 hover:from-yellow-200/20 hover:to-yellow-100/20'
                      : 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 hover:from-amber-500/20 hover:to-yellow-500/20'
                  } ${hasVaultAccess && hasPendingItems ? 'animate-vault-pulse' : ''}`}
                >
                  {isActive("/vault") && <span className="sidebar-active-indicator" />}
                  {hasVaultAccess ? (
                    <Star className={`h-4 w-4 sidebar-icon transition-all duration-200 group-hover:scale-110 ${
                      isSoftball ? 'text-yellow-300' : 'text-amber-500'
                    }`} />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground sidebar-icon transition-all duration-200 group-hover:scale-110" />
                  )}
                  <span className="font-medium transition-colors duration-200">{t('navigation.vault', 'The Vault')}</span>
                  {hasVaultAccess && hasPendingItems && pendingCount > 0 && (
                    <span className={`ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      isSoftball ? 'bg-yellow-300 text-black' : 'bg-amber-500 text-white'
                    }`}>
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="group-label-animated flex items-center gap-2 cursor-default">
            {t('navigation.mainNavigation')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item, index) => (
                <SidebarMenuItem 
                  key={item.title}
                  className="sidebar-item"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="group sidebar-item-hover relative"
                  >
                    {isActive(item.url) && <span className="sidebar-active-indicator" />}
                    <item.icon className="h-4 w-4 sidebar-icon transition-all duration-200 group-hover:scale-110 group-hover:text-primary" />
                    <span className="transition-colors duration-200">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="group-label-animated flex items-center gap-2 cursor-default">
            {t('navigation.trainingModules')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="training-modules-menu">
              {trainingModules.map((item, index) => (
                <div key={item.key}>
                  {'subModules' in item && item.subModules && item.subModules.length > 0 ? (
                    <Collapsible 
                      open={expandedModules[item.key]} 
                      onOpenChange={() => toggleModule(item.key)}
                    >
                      {/* Parent Module with Chevron */}
                      <SidebarMenuItem 
                        className="sidebar-item"
                        style={{ animationDelay: `${(index + mainNavItems.length) * 50}ms` }}
                      >
                        <div className="flex items-center w-full">
                          <SidebarMenuButton
                            onClick={() => navigate(item.url)}
                            isActive={isActive(item.url.split('?')[0])}
                            tooltip={item.title}
                            className="group sidebar-item-hover relative flex-1"
                          >
                            {isActive(item.url.split('?')[0]) && <span className="sidebar-active-indicator" />}
                            <item.icon className="h-4 w-4 sidebar-icon transition-all duration-200 group-hover:scale-110 group-hover:rotate-12 group-hover:text-primary" />
                            <span className="transition-colors duration-200">{item.title}</span>
                          </SidebarMenuButton>
                          
                          <CollapsibleTrigger asChild>
                            <button className="p-2 min-w-[44px] min-h-[44px] mr-2 flex items-center justify-center hover:bg-accent rounded-md transition-all duration-200 active:scale-95 touch-manipulation">
                              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${expandedModules[item.key] ? 'rotate-180' : ''}`} />
                            </button>
                          </CollapsibleTrigger>
                        </div>
                      </SidebarMenuItem>
                      
                      {/* Sub-Modules with animation */}
                      <CollapsibleContent className="collapsible-content">
                        {item.subModules.map((subModule) => (
                          <SidebarMenuItem 
                            key={subModule.url}
                            className="sidebar-sub-item"
                          >
                            <SidebarMenuButton
                              onClick={() => navigate(subModule.url)}
                              isActive={isActive(subModule.url)}
                              tooltip={`${subModule.title} - ${subModule.description}`}
                              className="group sidebar-item-hover relative py-2"
                            >
                              {isActive(subModule.url) && <span className="sidebar-active-indicator" />}
                              <subModule.icon className="h-4 w-4 flex-shrink-0 sidebar-icon transition-all duration-200 group-hover:scale-110 text-primary/70 group-hover:text-primary" />
                              <span className="text-sm font-medium truncate transition-colors duration-200">{subModule.title}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    /* Items without sub-modules */
                    <SidebarMenuItem 
                      className="sidebar-item"
                      style={{ animationDelay: `${(index + mainNavItems.length) * 50}ms` }}
                    >
                      <SidebarMenuButton
                        onClick={() => navigate(item.url)}
                        isActive={isActive(item.url.split('?')[0])}
                        tooltip={item.title}
                        className="group sidebar-item-hover relative"
                      >
                        {isActive(item.url.split('?')[0]) && <span className="sidebar-active-indicator" />}
                        <item.icon className="h-4 w-4 sidebar-icon transition-all duration-200 group-hover:scale-110 group-hover:rotate-12 group-hover:text-primary" />
                        <span className="transition-colors duration-200">{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="group-label-animated flex items-center gap-2 cursor-default">
            {t('navigation.account')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item, index) => (
                <SidebarMenuItem 
                  key={item.title}
                  className="sidebar-item"
                  style={{ animationDelay: `${(index + mainNavItems.length + trainingModules.length + 2) * 50}ms` }}
                >
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="group sidebar-item-hover relative"
                  >
                    {isActive(item.url) && <span className="sidebar-active-indicator" />}
                    <item.icon className="h-4 w-4 sidebar-icon transition-all duration-200 group-hover:scale-110 group-hover:text-primary" />
                    <span className="transition-colors duration-200">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem className="sidebar-item" style={{ animationDelay: '400ms' }}>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip={t('navigation.signOut')}
              className="group sidebar-item-hover hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 transition-all duration-200 group-hover:scale-110 group-hover:rotate-12 group-hover:text-destructive" />
              <span className="transition-colors duration-200 group-hover:text-destructive">{t('navigation.signOut')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
