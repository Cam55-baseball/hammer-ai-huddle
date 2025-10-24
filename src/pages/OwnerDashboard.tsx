import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Users, BarChart3, Settings, Video } from "lucide-react";

interface User {
  id: string;
  full_name: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

const OwnerDashboard = () => {
  const { isOwner, loading } = useOwnerAccess();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isOwner) {
      navigate("/");
    } else if (isOwner) {
      loadDashboardData();
    }
  }, [isOwner, loading, navigate]);

  const loadDashboardData = async () => {
    try {
      const [usersResponse, rolesResponse, videosResponse, subsResponse] = await Promise.all([
        supabase.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("videos").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("subscriptions").select("*"),
      ]);

      if (usersResponse.data) setUsers(usersResponse.data);
      if (rolesResponse.data) setUserRoles(rolesResponse.data);
      if (videosResponse.data) setVideos(videosResponse.data);
      if (subsResponse.data) setSubscriptions(subsResponse.data);
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
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
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome, Owner</h2>
            <p className="text-muted-foreground">Comprehensive oversight and management of all app modules</p>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                  <p className="text-sm text-muted-foreground">Active Subscriptions</p>
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
                  <p className="text-sm text-muted-foreground">Videos Analyzed</p>
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
                  <p className="text-sm text-muted-foreground">Avg Score</p>
                  <p className="text-2xl font-bold">{avgScore}/100</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList>
              <TabsTrigger value="users">User Management</TabsTrigger>
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
              <Card className="p-6">
                <h3 className="text-2xl font-bold mb-4">Subscription Overview</h3>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Free</p>
                    <p className="text-2xl font-bold">
                      {subscriptions.filter((s) => s.plan === "free").length}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Pro</p>
                    <p className="text-2xl font-bold">
                      {subscriptions.filter((s) => s.plan === "pro").length}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Team</p>
                    <p className="text-2xl font-bold">
                      {subscriptions.filter((s) => s.plan === "team").length}
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
