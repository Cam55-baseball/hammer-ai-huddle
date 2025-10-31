import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Users, BarChart3, Settings, Video, Target, CircleDot, Zap, Tag } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Progress } from "@/components/ui/progress";

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
  const [dataLoading, setDataLoading] = useState(true);
  const [moduleStats, setModuleStats] = useState<{
    hitting: number;
    pitching: number;
    throwing: number;
  }>({ hitting: 0, pitching: 0, throwing: 0 });
  const [couponStats, setCouponStats] = useState<{
    totalCodes: number;
    ambassadorCodes: number;
    totalUsers: number;
  }>({ totalCodes: 0, ambassadorCodes: 0, totalUsers: 0 });

  useEffect(() => {
    if (!loading && !isOwner) {
      navigate("/");
    } else if (isOwner) {
      loadDashboardData();
    }
  }, [isOwner, loading, navigate]);

  const loadDashboardData = async () => {
    try {
      const [usersResponse, rolesResponse, videosResponse, subsResponse, adminReqResponse] = await Promise.all([
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
      ]);

      if (usersResponse.data) setUsers(usersResponse.data);
      if (rolesResponse.data) setUserRoles(rolesResponse.data);
      if (videosResponse.data) setVideos(videosResponse.data);
      if (subsResponse.data) setSubscriptions(subsResponse.data);
      
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

      // Fetch coupon statistics
      const { data: allCoupons } = await supabase
        .from("subscriptions")
        .select("coupon_code")
        .eq("status", "active")
        .not("coupon_code", "is", null);

      const uniqueCoupons = new Set(allCoupons?.map(c => c.coupon_code) || []);

      const { data: ambassadorData } = await supabase
        .from("coupon_metadata")
        .select("coupon_code")
        .eq("is_ambassador", true);

      setCouponStats({
        totalCodes: uniqueCoupons.size,
        ambassadorCodes: ambassadorData?.length || 0,
        totalUsers: allCoupons?.length || 0
      });
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
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Subscriptions</p>
                <p className="text-2xl font-bold">{activeSubscriptions}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Videos</p>
                <p className="text-2xl font-bold">{totalVideosAnalyzed}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Efficiency</p>
                <p className="text-2xl font-bold">{avgScore}%</p>
              </div>
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
            <TabsTrigger value="videos">Recent Videos</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
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

            {/* Coupon Code Usage Card */}
            <Card className="p-6">
              <h3 className="text-2xl font-bold mb-4">Coupon Code Usage</h3>
              <p className="text-muted-foreground mb-6">
                Active discount codes and their usage statistics
              </p>
              
              {/* Summary stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground mb-1">Total Codes</p>
                  <p className="text-2xl font-bold">{couponStats.totalCodes}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground mb-1">Ambassador Codes</p>
                  <p className="text-2xl font-bold">{couponStats.ambassadorCodes}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground mb-1">Total Users</p>
                  <p className="text-2xl font-bold">{couponStats.totalUsers}</p>
                </div>
              </div>

              {/* Detailed table - link to /subscribers page */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  View detailed breakdown and manage coupon metadata
                </p>
                <Button 
                  onClick={() => navigate('/subscribers')}
                  variant="outline"
                >
                  View Details →
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default OwnerDashboard;
