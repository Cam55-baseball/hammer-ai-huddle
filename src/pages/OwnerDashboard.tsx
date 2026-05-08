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
import { Target, CircleDot, Zap, Search, BookMarked, User, ShieldCheck, Menu, LogOut, Users, Video as VideoIcon, CreditCard, Settings as SettingsIcon, FileText, ArrowLeft, Clock, XCircle, Library, Film, Package, Send, Loader2, Plus, Pencil, Trash2, X, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OwnerOverview } from "@/components/owner/OwnerOverview";
import { getBuilds, updateBuild, deleteBuild, type BuildItem } from "@/lib/ownerBuildStorage";
import { useVideoLibrary } from "@/hooks/useVideoLibrary";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VideoLibraryManager } from "@/components/owner/VideoLibraryManager";
import { PromoEngineTab } from "@/components/promo-engine/PromoEngineTab";
import { DrillCmsManager } from "@/components/owner/DrillCmsManager";
import { OwnerEngineSettingsPanel } from "@/components/owner/OwnerEngineSettingsPanel";
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
  'builds': 'Builds',
  'users': 'User Management',
  'admin-requests': 'Admin Requests',
  'scout-applications': 'Scout Applications',
  'videos': 'Recent Videos',
  'video-library': 'Video Library Manager',
  'promo-engine': 'Promo Engine',
  'drill-cms': 'Drill CMS',
  'engine-settings': 'Engine Settings',
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
  const [builds, setBuilds] = useState<BuildItem[]>([]);
  const [pendingBuildId, setPendingBuildId] = useState<string | null>(null);
  const { videos: libraryVideos } = useVideoLibrary({ limit: 200 });
  const [editingBuild, setEditingBuild] = useState<BuildItem | null>(null);
  const [buildDraft, setBuildDraft] = useState<{ name: string; price: string; description: string; videoId: string; videoIds: string[] }>({
    name: '',
    price: '',
    description: '',
    videoId: '',
    videoIds: [],
  });
  const [bundlePickerValue, setBundlePickerValue] = useState('');
  const [confirmDeleteBuildId, setConfirmDeleteBuildId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (activeSection === 'builds') {
      setBuilds(getBuilds());
    }
  }, [activeSection]);

  const openEditBuild = (b: BuildItem) => {
    const p = b.meta?.price;
    setBuildDraft({
      name: b.name ?? '',
      price: typeof p === 'number' ? String(p) : typeof p === 'string' ? p : '',
      description: typeof b.meta?.description === 'string' ? b.meta.description : '',
      videoId: typeof b.meta?.videoId === 'string' ? b.meta.videoId : '',
      videoIds: Array.isArray(b.meta?.videoIds) ? [...b.meta.videoIds] : [],
    });
    setBundlePickerValue('');
    setEditingBuild(b);
  };

  const buildPriceNum = Number(buildDraft.price);
  const buildPriceValid = Number.isFinite(buildPriceNum) && buildPriceNum >= 0.5;
  const buildNameValid = buildDraft.name.trim().length > 0;
  const buildBundleValid = editingBuild?.type !== 'bundle' || buildDraft.videoIds.length > 0;
  const canSaveBuild = buildNameValid && buildPriceValid && buildBundleValid;
  const buildVideoTitle = (id: string) => libraryVideos.find((v) => v.id === id)?.title ?? id;
  const buildAvailableToAdd = libraryVideos.filter((v) => !buildDraft.videoIds.includes(v.id));

  const saveBuildEdit = () => {
    if (!editingBuild || !canSaveBuild) return;
    const normalized = Math.round(buildPriceNum * 100) / 100;
    const metaPatch: Record<string, any> = { price: normalized };
    if (editingBuild.type === 'program') {
      metaPatch.description = buildDraft.description;
      metaPatch.videoId = buildDraft.videoId || null;
    } else if (editingBuild.type === 'bundle') {
      metaPatch.videoIds = buildDraft.videoIds;
      metaPatch.videoId = buildDraft.videoIds[0] ?? null;
    }
    const next = updateBuild(editingBuild.id, { name: buildDraft.name.trim(), meta: metaPatch });
    if (next) {
      setBuilds((prev) => prev.map((b) => (b.id === next.id ? next : b)));
      toast({ title: 'Build updated', description: `${next.name} • $${normalized.toFixed(2)}` });
    }
    setEditingBuild(null);
  };

  const handleDeleteBuild = () => {
    if (!confirmDeleteBuildId) return;
    const ok = deleteBuild(confirmDeleteBuildId);
    if (ok) {
      setBuilds((prev) => prev.filter((b) => b.id !== confirmDeleteBuildId));
      toast({ title: 'Build deleted' });
    } else {
      toast({ title: 'Could not delete', variant: 'destructive' });
    }
    setConfirmDeleteBuildId(null);
  };

  const handleSellBuild = async (build: BuildItem) => {
    setPendingBuildId(build.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-build-checkout', {
        body: { build },
      });
      if (error || !data?.url) {
        toast({
          title: 'Could not start checkout',
          description: error?.message ?? 'Please try again.',
          variant: 'destructive',
        });
        return;
      }
      // Open Stripe Checkout in a new tab — the preview iframe blocks top-level redirects.
      const win = window.open(data.url, '_blank', 'noopener,noreferrer');
      if (!win) {
        // Popup blocked → fall back to current-tab navigation.
        window.location.href = data.url;
      } else {
        toast({
          title: 'Checkout opened',
          description: 'Complete the payment in the new tab.',
        });
      }
    } catch (err) {
      toast({
        title: 'Checkout error',
        description: err instanceof Error ? err.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setPendingBuildId(null);
    }
  };

  const handleViewBuyers = async (build: BuildItem) => {
    const { data, error } = await supabase
      .from('user_build_access')
      .select('user_id, granted_at')
      .eq('build_id', build.id)
      .order('granted_at', { ascending: false });
    console.log('[Buyers]', build.id, { rows: data ?? [], error });
    toast({
      title: 'Buyers logged to console',
      description: `${data?.length ?? 0} buyer(s) for "${build.name || 'Untitled'}"`,
    });
  };

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
              <div className="min-w-0 flex items-center gap-1.5 text-sm">
                <span className="text-muted-foreground">Owner</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold truncate">{sectionLabels[activeSection]}</span>
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
          {/* Section subtitle (compact) */}
          <div className="mb-5">
            <h2 className="text-xl font-semibold">{sectionLabels[activeSection]}</h2>
          </div>

          {/* Overview Section */}
          {activeSection === 'overview' && (
            <OwnerOverview
              totalUsers={totalUsers}
              activeSubscriptions={activeSubscriptions}
              totalVideosAnalyzed={totalVideosAnalyzed}
              avgScore={avgScore}
              pendingAdminRequests={adminRequests.length}
              pendingScoutApplications={scoutApplications.filter(a => a.status === 'pending').length}
              recentUsers={users.slice(0, 6)}
              recentVideos={videos.slice(0, 6)}
              recentScoutApplications={scoutApplications.slice(0, 6).map(a => ({
                id: a.id,
                status: a.status,
                created_at: a.created_at,
                full_name: a.full_name ?? a.applicant_name ?? null,
              }))}
              onJump={setActiveSection}
            />
          )}

          {/* Builds Section */}
          {activeSection === 'builds' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Builds</h3>
                <div className="flex items-center gap-2">
                  <Button variant="link" size="sm" onClick={() => navigate('/owner/builds')} className="h-auto p-0 text-xs">
                    Full library →
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1.5" />
                        New
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate('/owner/open_program_builder')}>
                        Program
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/owner/open_bundle_builder')}>
                        Bundle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/owner/open_consultation_flow')}>
                        Consultation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div>
                {builds.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground text-sm">
                      No builds yet — click <span className="font-semibold">+ New</span> above to get started.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {builds.map((b) => (
                      <Card key={b.id} className="p-4 flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold truncate">{b.name || 'Untitled'}</h4>
                            <Badge variant="secondary" className="text-[10px] capitalize">{b.type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(b.createdAt).toLocaleString()}
                          </p>
                          {b.type === 'bundle' && Array.isArray(b.meta?.videoIds) ? (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {b.meta.videoIds.length} video{b.meta.videoIds.length === 1 ? '' : 's'}
                            </p>
                          ) : b.meta?.videoId ? (
                            <p className="text-[11px] font-mono text-muted-foreground mt-1 truncate">
                              video: {b.meta.videoId}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 flex flex-col gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleSellBuild(b)}
                            disabled={pendingBuildId === b.id}
                          >
                            {pendingBuildId === b.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                Opening…
                              </>
                            ) : (
                              <>
                                <Send className="h-3.5 w-3.5 mr-1.5" />
                                Sell / Share
                              </>
                            )}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEditBuild(b)}>
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                            onClick={() => setConfirmDeleteBuildId(b.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Delete
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleViewBuyers(b)}>
                            <Users className="h-3.5 w-3.5 mr-1.5" />
                            View Buyers
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Build Edit Dialog */}
          <Dialog open={!!editingBuild} onOpenChange={(o) => !o && setEditingBuild(null)}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit {editingBuild?.type ?? 'build'}</DialogTitle>
                <DialogDescription>Update the details below. Changes save locally.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ob-edit-name">Name</Label>
                  <Input
                    id="ob-edit-name"
                    value={buildDraft.name}
                    onChange={(e) => setBuildDraft((d) => ({ ...d, name: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-edit-price">Price (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      id="ob-edit-price"
                      type="text"
                      inputMode="decimal"
                      value={buildDraft.price}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) {
                          setBuildDraft((d) => ({ ...d, price: v }));
                        }
                      }}
                      className="pl-8"
                      placeholder="49.00"
                    />
                  </div>
                  {!buildPriceValid && buildDraft.price.length > 0 && (
                    <p className="text-xs text-destructive">Minimum $0.50</p>
                  )}
                </div>

                {editingBuild?.type === 'program' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="ob-edit-desc">Description</Label>
                      <Textarea
                        id="ob-edit-desc"
                        value={buildDraft.description}
                        onChange={(e) => setBuildDraft((d) => ({ ...d, description: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Anchor Video</Label>
                      <div className="flex gap-2">
                        <Select
                          value={buildDraft.videoId}
                          onValueChange={(v) => setBuildDraft((d) => ({ ...d, videoId: v }))}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Choose from library…" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {libraryVideos.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                <span className="truncate">{v.title}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {buildDraft.videoId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setBuildDraft((d) => ({ ...d, videoId: '' }))}
                            aria-label="Clear video"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {editingBuild?.type === 'bundle' && (
                  <div className="space-y-2">
                    <Label>Videos in Bundle ({buildDraft.videoIds.length})</Label>
                    <Select
                      value={bundlePickerValue}
                      onValueChange={(id) => {
                        if (!id || buildDraft.videoIds.includes(id)) return;
                        setBuildDraft((d) => ({ ...d, videoIds: [...d.videoIds, id] }));
                        setBundlePickerValue('');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={buildAvailableToAdd.length === 0 ? 'All videos added' : 'Add from library…'} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {buildAvailableToAdd.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            <span className="truncate">{v.title}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {buildDraft.videoIds.length === 0 ? (
                      <p className="text-xs text-destructive italic">At least one video required.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {buildDraft.videoIds.map((id, idx) => (
                          <li
                            key={id}
                            className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-1.5"
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                              <span className="text-sm truncate">{buildVideoTitle(id)}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() =>
                                setBuildDraft((d) => ({ ...d, videoIds: d.videoIds.filter((v) => v !== id) }))
                              }
                              aria-label={`Remove ${buildVideoTitle(id)}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="ghost" onClick={() => setEditingBuild(null)}>Cancel</Button>
                <Button onClick={saveBuildEdit} disabled={!canSaveBuild}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Build Delete Confirm */}
          <AlertDialog open={!!confirmDeleteBuildId} onOpenChange={(o) => !o && setConfirmDeleteBuildId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this build?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{builds.find((b) => b.id === confirmDeleteBuildId)?.name || 'Untitled'}" will be removed permanently. Existing buyers keep access; this only removes it from your library and stops new sales.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteBuild}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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

          {/* Video Library Manager Section */}
          {activeSection === 'video-library' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => navigate('/owner/builds')}>
                  <Library className="h-4 w-4 mr-2" />
                  View Your Builds
                </Button>
              </div>
              <VideoLibraryManager />
            </div>
          )}

          {/* Promo Engine Section */}
          {activeSection === 'promo-engine' && (
            <PromoEngineTab />
          )}

          {/* Drill CMS Section */}
          {activeSection === 'drill-cms' && (
            <DrillCmsManager />
          )}

          {/* Engine Settings Section */}
          {activeSection === 'engine-settings' && (
            <OwnerEngineSettingsPanel />
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
