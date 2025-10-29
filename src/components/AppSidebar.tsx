import { useState, useEffect } from "react";
import { Home, Trophy, Cloud, Target, Settings, LogOut, Shield, Users, UserPlus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useScoutAccess } from "@/hooks/useScoutAccess";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
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
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const { isScout } = useScoutAccess();
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);

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
    { title: "Hitting Analysis", url: "/analyze/hitting", icon: Target },
    { title: "Pitching Analysis", url: "/analyze/pitching", icon: Target },
    { title: "Throwing Analysis", url: "/analyze/throwing", icon: Target },
  ];

  const accountItems = [
    { title: "Profile", url: "/profile", icon: Settings },
    ...(isOwner ? [{ title: "Owner Dashboard", url: "/owner", icon: Shield }] : []),
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
          <img src={logo} alt="Hammers Modality" className="h-8 w-8 object-contain" />
          <h2 className="text-lg font-bold text-sidebar-foreground">Hammers Modality</h2>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {ownerProfile && (
          <SidebarGroup className="border-b border-sidebar-border pb-4">
            <SidebarGroupLabel>Coach Bio</SidebarGroupLabel>
            <div className="px-4 py-2 space-y-2">
              <div className="flex items-center gap-3">
                {ownerProfile.avatar_url && (
                  <img 
                    src={ownerProfile.avatar_url} 
                    alt={ownerProfile.full_name || 'Coach'}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                )}
                <p className="font-semibold text-sm">{ownerProfile.full_name}</p>
              </div>
              {ownerProfile.bio && (
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {ownerProfile.bio}
                </p>
              )}
            </div>
          </SidebarGroup>
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
