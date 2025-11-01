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
import { Target, CircleDot, Zap, Search, BookMarked, User } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScoutApplicationCard } from "@/components/ScoutApplicationCard";

interface User {
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

const OwnerDashboard = () => {
  const { isOwner, loading } = useOwnerAccess();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
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

      // Fetch module subscriptions
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleAssignRole = async (userId: string, role: "admin" | "player") => {
    try {
      const { error } = await supabase.from("user_roles").insert([{ user_id: userId, role }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role ${role} assigned successfully`,
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
    return userRoles.find((r) => r.user_id === userId)?.role || "player";
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

      // Get session counts for each player
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

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">H</span>
            </div>
            <h1 className="text-xl font-bold">Owner Dashboard</h1>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome, Owner</h2>
          <p className="text-muted-foreground">Comprehensive oversight and management of all app modules</p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card className="p-6">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Users</p>
              <p className="text-3xl font-bold">{totalUsers}</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Subscriptions</p>
              <p className="text-3xl font-bold">{activeSubscriptions}</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Videos</p>
              <p className="text-3xl font-bold">{totalVideosAnalyzed}</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Efficiency</p>
              <p className="text-3xl font-bold">{avgScore}%</p>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="admin-requests">
              Admin Requests {adminRequests.length > 0 && `(${adminRequests.length})`}
            </TabsTrigger>
            <TabsTrigger value="scout-applications">
              Scout Applications {scoutApplications.filter(a => a.status === 'pending').length > 0 && `(${scoutApplications.filter(a => a.status === 'pending').length})`}
            </TabsTrigger>
            <TabsTrigger value="videos">Recent Videos</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="player-search">Player Profile Search</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-2xl font-bold mb-4">All Users</h3>
              <div className="space-y-2">
                {users.length === 0 ? (
                  <p className="text-muted-foreground">No users yet</p>
                ) : (
                  users.map((user) => (
                    <div
                      key={user.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold">{user.full_name || "No name"}</p>
                        <p className="text-sm text-muted-foreground">
                          Role: <span className="capitalize">{getUserRole(user.id)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Joined: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {getUserRole(user.id) !== "admin" && (
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
          </TabsContent>

          <TabsContent value="admin-requests" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-2xl font-bold mb-4">Pending Admin Requests</h3>
              <div className="space-y-2">
                {adminRequests.length === 0 ? (
                  <p className="text-muted-foreground">No pending admin requests</p>
                ) : (
                  adminRequests.map((request) => (
                    <div key={request.user_id} className="p-4 border rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{request.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Requested: {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleApproveAdmin(request.user_id)}>
                          Approve
                        </Button>
                        <Button 
                          variant="destructive" 
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
          </TabsContent>

          <TabsContent value="scout-applications" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-2xl font-bold mb-4">Scout/Coach Applications</h3>
              <Tabs defaultValue="pending" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="pending">
                    Pending ({scoutApplications.filter(a => a.status === 'pending').length})
                  </TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
                
                <TabsContent value="pending" className="space-y-4">
                  {scoutApplications.filter(a => a.status === 'pending').length === 0 ? (
                    <p className="text-muted-foreground">No pending applications</p>
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
                
                <TabsContent value="approved" className="space-y-4">
                  {scoutApplications.filter(a => a.status === 'approved').length === 0 ? (
                    <p className="text-muted-foreground">No approved applications</p>
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
                
                <TabsContent value="rejected" className="space-y-4">
                  {scoutApplications.filter(a => a.status === 'rejected').length === 0 ? (
                    <p className="text-muted-foreground">No rejected applications</p>
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
                
                <TabsContent value="all" className="space-y-4">
                  {scoutApplications.length === 0 ? (
                    <p className="text-muted-foreground">No applications yet</p>
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
          </TabsContent>

          <TabsContent value="videos" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-2xl font-bold mb-4">Recent Video Analyses</h3>
              <div className="space-y-2">
                {videos.length === 0 ? (
                  <p className="text-muted-foreground">No videos analyzed yet</p>
                ) : (
                  videos.map((video) => (
                    <div key={video.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold capitalize">
                            {video.sport} - {video.module}
                          </p>
                          <p className="text-sm text-muted-foreground">Status: {video.status}</p>
                          {video.efficiency_score && (
                            <p className="text-sm">Score: {video.efficiency_score}/100</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(video.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            {/* Module Subscriptions Card */}
            <Card className="p-6">
              <h3 className="text-2xl font-bold mb-4">Module Subscriptions</h3>
              <p className="text-muted-foreground mb-6">
                Active subscribers by training module
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-5 w-5 text-primary" />
                    <p className="font-semibold text-lg">Hitting</p>
                  </div>
                  <p className="text-3xl font-bold">{moduleStats.hitting}</p>
                  <p className="text-sm text-muted-foreground">subscribers</p>
                  <Progress 
                    value={activeSubscriptions > 0 ? (moduleStats.hitting / activeSubscriptions) * 100 : 0} 
                    className="h-2 mt-2" 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <CircleDot className="h-5 w-5 text-primary" />
                    <p className="font-semibold text-lg">Pitching</p>
                  </div>
                  <p className="text-3xl font-bold">{moduleStats.pitching}</p>
                  <p className="text-sm text-muted-foreground">subscribers</p>
                  <Progress 
                    value={activeSubscriptions > 0 ? (moduleStats.pitching / activeSubscriptions) * 100 : 0} 
                    className="h-2 mt-2" 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-5 w-5 text-primary" />
                    <p className="font-semibold text-lg">Throwing</p>
                  </div>
                  <p className="text-3xl font-bold">{moduleStats.throwing}</p>
                  <p className="text-sm text-muted-foreground">subscribers</p>
                  <Progress 
                    value={activeSubscriptions > 0 ? (moduleStats.throwing / activeSubscriptions) * 100 : 0} 
                    className="h-2 mt-2" 
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="player-search" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Search Player Profiles & Libraries</h3>
              <div className="space-y-4">
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
                
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((player) => (
                      <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            {player.avatar_url && <AvatarImage src={player.avatar_url} />}
                            <AvatarFallback>{player.full_name?.charAt(0) || 'P'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{player.full_name}</p>
                            <p className="text-sm text-muted-foreground">{player.sessionCount} sessions saved</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => navigate(`/profile?userId=${player.id}`)}
                            size="sm"
                            variant="outline"
                          >
                            <User className="h-4 w-4 mr-2" />
                            View Profile
                          </Button>
                          <Button
                            onClick={() => navigate(`/players-club?playerId=${player.id}`)}
                            size="sm"
                          >
                            <BookMarked className="h-4 w-4 mr-2" />
                            View Library
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default OwnerDashboard;
