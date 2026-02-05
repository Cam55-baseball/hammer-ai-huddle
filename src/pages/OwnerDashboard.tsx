import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Target, CircleDot, Zap, Search, BookMarked, User, ShieldCheck, Menu, LogOut, Users, Video as VideoIcon, CreditCard, Settings as SettingsIcon, FileText, ArrowLeft, Clock, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScoutApplicationCard } from "@/components/ScoutApplicationCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { OwnerSidebar, type OwnerSection } from "@/components/owner/OwnerSidebar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface UserProfile {
  id: string;
  full_name: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
  status?: string;
}

interface AdminRequest {
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  full_name: string | null;
}

const sectionLabels: Record<OwnerSection, string> = {
  'overview': 'Overview',
  'users': 'User Management',
  'admin-requests': 'Admin Requests',
  'scout-applications': 'Scout Applications',
  'videos': 'Recent Videos',
  'subscriptions': 'Subscriptions',
  'settings': 'Settings',
  'player-search': 'Player Search',
};

const OwnerDashboard = () => {
  const { isOwner, loading } = useOwnerAccess();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
  const [scoutApplications, setScoutApplications] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [moduleStats, setModuleStats] = useState<{
    hitting: number;
    pitching: number;
    throwing: number;
  }>({ hitting: 0, pitching: 0, throwing: 0 });
  const [playerSearch, setPlayerSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [rankingsVisible, setRankingsVisible] = useState(true);
  const [activeSection, setActiveSection] = useState<OwnerSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isOwner) {
      navigate("/");
    } else if (isOwner) {
      loadDashboardData();
    }
  }, [isOwner, loading, navigate]);

  const loadDashboardData = async () => {
    try {
      const [usersResponse, rolesResponse, videosResponse, subsResponse, adminReqResponse, scoutAppResponse] = await Promise.all([
        supabase.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role, status"),
        supabase.from("videos").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("subscriptions").select("*"),
        supabase
          .from("user_roles")
          .select("user_id, role, status, created_at, profiles(full_name)")
          .eq("role", "admin")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("scout_applications")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (usersResponse.data) setUsers(usersResponse.data);
      if (rolesResponse.data) setUserRoles(rolesResponse.data);
      if (videosResponse.data) setVideos(videosResponse.data);
      if (subsResponse.data) setSubscriptions(subsResponse.data);
      if (scoutAppResponse.data) setScoutApplications(scoutAppResponse.data);
      
      if (adminReqResponse.data) {
        const requests: AdminRequest[] = adminReqResponse.data.map((req: any) => ({
          user_id: req.user_id,
          role: req.role,
          status: req.status,
          created_at: req.created_at,
          full_name: req.profiles?.full_name || 'Unknown User'
        }));
        setAdminRequests(requests);
      }

      const { data: moduleSubs } = await supabase
        .from("subscriptions")
        .select("subscribed_modules")
        .eq("status", "active");

      const moduleCount = { hitting: 0, pitching: 0, throwing: 0 };
      moduleSubs?.forEach((sub) => {
        sub.subscribed_modules?.forEach((module: string) => {
          const moduleName = module.includes("_") ? module.split("_")[1] : module;
          if (moduleName in moduleCount) {
            moduleCount[moduleName as keyof typeof moduleCount]++;
          }
        });
      });
      setModuleStats(moduleCount);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    const fetchRankingsVisibility = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'rankings_visible')
          .maybeSingle();
        
        if (data) {
          const settingValue = data.setting_value as { enabled: boolean };
          setRankingsVisible(settingValue?.enabled ?? true);
        }
      } catch (error) {
        console.error('Error fetching rankings visibility:', error);
      }
    };

    if (isOwner) {
      fetchRankingsVisibility();
    }
  }, [isOwner]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleAssignRole = async (userId: string, role: "admin" | "player") => {
    try {
      const { error } = await supabase.from("user_roles").insert([{ 
        user_id: userId, 
        role,
        status: 'active'
      }]);

      if (error) throw error;

      toast({
        title: role === 'admin' ? "Admin Appointed" : "Role Assigned",
        description: role === 'admin' 
          ? "Admin privileges granted successfully."
          : `Role ${role} assigned successfully`,
      });

      await loadDashboardData();
    } catch (error: any) {
      console.error("Error assigning role:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign role",
        variant: "destructive",
      });
    }
  };

  const getUserRole = (userId: string) => {
    const userRole = userRoles.find((r) => r.user_id === userId);
    if (userRole?.role === 'admin' && userRole?.status !== 'active') {
      return 'player';
    }
    return userRole?.role || "player";
  };

  const isActiveAdmin = (userId: string) => {
    const userRole = userRoles.find((r) => r.user_id === userId);
    return userRole?.role === 'admin' && userRole?.status === 'active';
  };

  // Check if user has ANY admin role entry (any status - active, pending, rejected)
  const hasAdminRole = (userId: string) => {
    return userRoles.some((r) => r.user_id === userId && r.role === 'admin');
  };

  // Get the admin role status (active, pending, rejected, or null)
  const getAdminStatus = (userId: string) => {
    const role = userRoles.find((r) => r.user_id === userId && r.role === 'admin');
    return role?.status || null;
  };

  const handleApproveAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ status: 'active' })
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      toast({
        title: "Admin Approved",
        description: "User now has admin access",
      });

      await loadDashboardData();
    } catch (error: any) {
      console.error("Error approving admin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve admin",
        variant: "destructive",
      });
    }
  };

  const handleRejectAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ status: 'rejected' })
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      toast({
        title: "Admin Rejected",
        description: "Admin request has been rejected",
      });

      await loadDashboardData();
    } catch (error: any) {
      console.error("Error rejecting admin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject admin",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      toast({
        title: "Admin Revoked",
        description: "Admin privileges have been removed",
      });

      await loadDashboardData();
    } catch (error: any) {
      console.error("Error removing admin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove admin role",
        variant: "destructive",
      });
    }
  };

  const searchPlayers = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${searchTerm}%`)
        .limit(10);

      if (!profiles) return;

      const playersWithCounts = await Promise.all(
        profiles.map(async (player) => {
          const { count } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', player.id)
            .eq('saved_to_library', true);
          
          return { ...player, sessionCount: count || 0 };
        })
      );
      
      setSearchResults(playersWithCounts);
    } catch (error) {
      console.error('Error searching players:', error);
    }
  };

  const handleRankingsVisibilityToggle = async (enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('app_settings')
        .update({ 
          setting_value: { enabled },
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('setting_key', 'rankings_visible');

      if (error) throw error;

      setRankingsVisible(enabled);
      toast({
        title: "Settings Updated",
        description: enabled ? "Rankings are now visible" : "Rankings are now hidden",
      });
    } catch (error: any) {
      console.error('Error updating rankings visibility:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isOwner) {
    return null;
  }

  const totalUsers = users.length;
  const activeSubscriptions = subscriptions.filter((s) => s.status === "active").length;
  const totalVideosAnalyzed = videos.length;
  const avgScore =
    videos.length > 0
      ? Math.round(
          videos
            .filter((v) => v.efficiency_score)
            .reduce((acc, v) => acc + (v.efficiency_score || 0), 0) /
            videos.filter((v) => v.efficiency_score).length
        )
      : 0;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - Single instance */}
      <OwnerSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        pendingAdminRequests={adminRequests.length}
        pendingScoutApplications={scoutApplications.filter(a => a.status === 'pending').length}
        mobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
      />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b bg-card px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setMobileMenuOpen(true)}
                className="shrink-0"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="gap-2 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <div className="min-w-0">
                <h1 className="font-semibold text-sm md:text-base truncate">Owner Dashboard</h1>
                <p className="text-xs text-muted-foreground hidden md:block">
                  {sectionLabels[activeSection]}
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2 shrink-0">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {/* Section Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold">{sectionLabels[activeSection]}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {activeSection === 'overview' && 'Platform analytics and key metrics'}
              {activeSection === 'users' && 'Manage user accounts and admin privileges'}
              {activeSection === 'admin-requests' && 'Review pending admin access requests'}
              {activeSection === 'scout-applications' && 'Review scout and coach applications'}
              {activeSection === 'videos' && 'Recently analyzed training videos'}
              {activeSection === 'subscriptions' && 'Active module subscriptions'}
              {activeSection === 'settings' && 'Configure app-wide settings'}
              {activeSection === 'player-search' && 'Search and view player profiles'}
            </p>
          </div>

          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Users</p>
                  <p className="text-3xl font-bold mt-1">{totalUsers}</p>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subscriptions</p>
                  <p className="text-3xl font-bold mt-1">{activeSubscriptions}</p>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <VideoIcon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Videos</p>
                  <p className="text-3xl font-bold mt-1">{totalVideosAnalyzed}</p>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg. Score</p>
                  <p className="text-3xl font-bold mt-1">{avgScore}%</p>
                </Card>
              </div>

              {/* Quick Stats */}
              <Card className="p-5">
                <h3 className="font-semibold mb-4">Module Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="font-medium">Hitting</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{moduleStats.hitting}</span>
                    </div>
                    <Progress value={activeSubscriptions > 0 ? (moduleStats.hitting / activeSubscriptions) * 100 : 0} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CircleDot className="h-4 w-4 text-primary" />
                        <span className="font-medium">Pitching</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{moduleStats.pitching}</span>
                    </div>
                    <Progress value={activeSubscriptions > 0 ? (moduleStats.pitching / activeSubscriptions) * 100 : 0} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="font-medium">Throwing</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{moduleStats.throwing}</span>
                    </div>
                    <Progress value={activeSubscriptions > 0 ? (moduleStats.throwing / activeSubscriptions) * 100 : 0} className="h-2" />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* User Management Section */}
          {activeSection === 'users' && (
            <Card className="overflow-hidden">
              <div className="divide-y">
                {users.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No users yet
                  </div>
                ) : (
                  users.map((user) => (
                    <div
                      key={user.id}
                      className={cn(
                        "flex items-center justify-between p-4 transition-colors",
                        isActiveAdmin(user.id) && "bg-success/5",
                        getAdminStatus(user.id) === 'pending' && "bg-amber-50/50 dark:bg-amber-950/20"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-muted">
                            {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{user.full_name || "No name"}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-muted-foreground capitalize">
                              {getUserRole(user.id)}
                            </span>
                            {isActiveAdmin(user.id) && (
                              <Badge variant="outline" className="text-success border-success/50 gap-1 text-xs">
                                <ShieldCheck className="h-3 w-3" />
                                Active
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              · Joined {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {/* Active Admin: Show badge + revoke button */}
                        {isActiveAdmin(user.id) && (
                          <>
                            <Badge className="bg-success hover:bg-success text-success-foreground gap-1 hidden sm:flex">
                              <ShieldCheck className="h-3 w-3" />
                              Admin
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => handleRemoveAdmin(user.id)}
                            >
                              Revoke
                            </Button>
                          </>
                        )}
                        
                        {/* Pending Admin: Show pending badge + approve/reject */}
                        {getAdminStatus(user.id) === 'pending' && (
                          <>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 gap-1 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-700">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                            <Button size="sm" onClick={() => handleApproveAdmin(user.id)}>
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleRejectAdmin(user.id)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        
                        {/* Rejected Admin: Show rejected badge + reinstate option */}
                        {getAdminStatus(user.id) === 'rejected' && (
                          <>
                            <Badge variant="outline" className="text-muted-foreground gap-1">
                              <XCircle className="h-3 w-3" />
                              Rejected
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleApproveAdmin(user.id)}
                            >
                              Reinstate
                            </Button>
                          </>
                        )}
                        
                        {/* Regular User (no admin role at all): Show Make Admin button */}
                        {!hasAdminRole(user.id) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignRole(user.id, "admin")}
                          >
                            Make Admin
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {/* Admin Requests Section */}
          {activeSection === 'admin-requests' && (
            <Card className="overflow-hidden">
              <div className="divide-y">
                {adminRequests.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No pending admin requests</p>
                  </div>
                ) : (
                  adminRequests.map((request) => (
                    <div key={request.user_id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-muted">
                            {request.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{request.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Requested {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 ml-2">
                        <Button size="sm" onClick={() => handleApproveAdmin(request.user_id)}>
                          Approve
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => handleRejectAdmin(request.user_id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {/* Scout Applications Section */}
          {activeSection === 'scout-applications' && (
            <Card className="p-5">
              <Tabs defaultValue="pending" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
                  <TabsTrigger value="pending" className="gap-1">
                    Pending
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {scoutApplications.filter(a => a.status === 'pending').length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
                
                <TabsContent value="pending" className="space-y-3 mt-4">
                  {scoutApplications.filter(a => a.status === 'pending').length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No pending applications</p>
                    </div>
                  ) : (
                    scoutApplications
                      .filter(a => a.status === 'pending')
                      .map(app => (
                        <ScoutApplicationCard 
                          key={app.id} 
                          application={app}
                          onUpdate={loadDashboardData}
                        />
                      ))
                  )}
                </TabsContent>
                
                <TabsContent value="approved" className="space-y-3 mt-4">
                  {scoutApplications.filter(a => a.status === 'approved').length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">No approved applications</p>
                  ) : (
                    scoutApplications
                      .filter(a => a.status === 'approved')
                      .map(app => (
                        <ScoutApplicationCard 
                          key={app.id} 
                          application={app}
                          onUpdate={loadDashboardData}
                        />
                      ))
                  )}
                </TabsContent>
                
                <TabsContent value="rejected" className="space-y-3 mt-4">
                  {scoutApplications.filter(a => a.status === 'rejected').length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">No rejected applications</p>
                  ) : (
                    scoutApplications
                      .filter(a => a.status === 'rejected')
                      .map(app => (
                        <ScoutApplicationCard 
                          key={app.id} 
                          application={app}
                          onUpdate={loadDashboardData}
                        />
                      ))
                  )}
                </TabsContent>
                
                <TabsContent value="all" className="space-y-3 mt-4">
                  {scoutApplications.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">No applications yet</p>
                  ) : (
                    scoutApplications.map(app => (
                      <ScoutApplicationCard 
                        key={app.id} 
                        application={app}
                        onUpdate={loadDashboardData}
                      />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          )}

          {/* Videos Section */}
          {activeSection === 'videos' && (
            <Card className="overflow-hidden">
              <div className="divide-y">
                {videos.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <VideoIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No videos analyzed yet</p>
                  </div>
                ) : (
                  videos.map((video) => (
                    <div key={video.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium capitalize truncate">
                            {video.sport} - {video.module}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant={video.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                              {video.status}
                            </Badge>
                            {video.efficiency_score && (
                              <span className="text-sm text-muted-foreground">
                                Score: {video.efficiency_score}/100
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              · {new Date(video.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {/* Subscriptions Section */}
          {activeSection === 'subscriptions' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Hitting</p>
                    <p className="text-xs text-muted-foreground">Training module</p>
                  </div>
                </div>
                <p className="text-3xl font-bold">{moduleStats.hitting}</p>
                <p className="text-sm text-muted-foreground mb-3">active subscribers</p>
                <Progress 
                  value={activeSubscriptions > 0 ? (moduleStats.hitting / activeSubscriptions) * 100 : 0} 
                  className="h-2" 
                />
              </Card>
              
              <Card className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CircleDot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Pitching</p>
                    <p className="text-xs text-muted-foreground">Training module</p>
                  </div>
                </div>
                <p className="text-3xl font-bold">{moduleStats.pitching}</p>
                <p className="text-sm text-muted-foreground mb-3">active subscribers</p>
                <Progress 
                  value={activeSubscriptions > 0 ? (moduleStats.pitching / activeSubscriptions) * 100 : 0} 
                  className="h-2" 
                />
              </Card>
              
              <Card className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Throwing</p>
                    <p className="text-xs text-muted-foreground">Training module</p>
                  </div>
                </div>
                <p className="text-3xl font-bold">{moduleStats.throwing}</p>
                <p className="text-sm text-muted-foreground mb-3">active subscribers</p>
                <Progress 
                  value={activeSubscriptions > 0 ? (moduleStats.throwing / activeSubscriptions) * 100 : 0} 
                  className="h-2" 
                />
              </Card>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <Card className="p-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="space-y-1">
                    <Label htmlFor="rankings-visibility" className="text-base font-medium">
                      Rankings Visibility
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Control whether rankings are visible to all users in the app
                    </p>
                  </div>
                  <Switch
                    id="rankings-visibility"
                    checked={rankingsVisible}
                    onCheckedChange={handleRankingsVisibilityToggle}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Player Search Section */}
          {activeSection === 'player-search' && (
            <div className="space-y-4">
              <Card className="p-5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by player name..."
                    value={playerSearch}
                    onChange={(e) => {
                      setPlayerSearch(e.target.value);
                      searchPlayers(e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>
              </Card>
              
              {searchResults.length > 0 && (
                <Card className="overflow-hidden">
                  <div className="divide-y">
                    {searchResults.map((player) => (
                      <div key={player.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 shrink-0">
                            {player.avatar_url && <AvatarImage src={player.avatar_url} />}
                            <AvatarFallback className="bg-muted">
                              {player.full_name?.charAt(0)?.toUpperCase() || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{player.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {player.sessionCount} sessions saved
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0 ml-2">
                          <Button
                            onClick={() => navigate(`/profile?userId=${player.id}`)}
                            size="sm"
                            variant="outline"
                          >
                            <User className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Profile</span>
                          </Button>
                          <Button
                            onClick={() => navigate(`/players-club?playerId=${player.id}`)}
                            size="sm"
                          >
                            <BookMarked className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Library</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              
              {playerSearch.length >= 2 && searchResults.length === 0 && (
                <Card className="p-8 text-center text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No players found matching "{playerSearch}"</p>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default OwnerDashboard;
