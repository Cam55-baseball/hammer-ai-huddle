import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CircleDot, Target, Zap, Upload, Lock, Icon, Construction, Sparkles, BookMarked, RefreshCw } from "lucide-react";
import { baseball } from "@lucide/lab";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FollowRequestsPanel } from "@/components/FollowRequestsPanel";
import { ModuleManagementCard } from "@/components/ModuleManagementCard";
import { toast } from "sonner";
import dashboardHeroImage from "@/assets/dashboard-hero.jpg";

type ModuleType = "hitting" | "pitching" | "throwing";
type SportType = "baseball" | "softball";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { modules: subscribedModules, module_details, loading: subLoading, refetch, hasAccessForSport, getModuleDetails, onModulesChange, enableFastPolling } = useSubscription();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const navigate = useNavigate();
  const [selectedSport, setSelectedSport] = useState<SportType>(() => {
    const saved = localStorage.getItem('selectedSport');
    if (saved === 'baseball' || saved === 'softball') {
      return saved as SportType;
    }
    return "baseball";
  });
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSportSwitchDialog, setShowSportSwitchDialog] = useState(false);
  const [pendingSportSwitch, setPendingSportSwitch] = useState<SportType | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    refetch();
    loadProgress();
  }, [authLoading, user, navigate]);
  
  // Detect sport from subscribed modules if localStorage is empty
  useEffect(() => {
    const saved = localStorage.getItem('selectedSport');
    if (saved === 'baseball' || saved === 'softball') return;
    
    if (subscribedModules.length > 0) {
      const hasSoftball = subscribedModules.some(m => m.startsWith('softball_'));
      const hasBaseball = subscribedModules.some(m => m.startsWith('baseball_'));
      
      if (hasSoftball && !hasBaseball) {
        setSelectedSport('softball');
        localStorage.setItem('selectedSport', 'softball');
      } else if (hasBaseball && !hasSoftball) {
        setSelectedSport('baseball');
        localStorage.setItem('selectedSport', 'baseball');
      } else if (hasSoftball) {
        setSelectedSport('softball');
        localStorage.setItem('selectedSport', 'softball');
      }
    }
  }, [subscribedModules]);
  
  // Module activation notification system
  useEffect(() => {
    // Check if we're waiting for a new module activation
    const pendingActivation = localStorage.getItem('pendingModuleActivation');
    if (!pendingActivation) return;
    
    try {
      const { module, sport, timestamp } = JSON.parse(pendingActivation);
      const elapsed = Date.now() - timestamp;
      
      // Only track for up to 5 minutes after payment
      if (elapsed > 5 * 60 * 1000) {
        localStorage.removeItem('pendingModuleActivation');
        return;
      }
      
      // Enable fast polling (5 second intervals)
      enableFastPolling(true);
      console.log('[Dashboard] Watching for module activation:', `${sport}_${module}`);
      
      // Set up module detection
      const expectedKey = `${sport}_${module}`;
      
      // Check if module already exists
      if (subscribedModules.includes(expectedKey)) {
        console.log('[Dashboard] Module already active:', expectedKey);
        toast.success("🎉 Module Activated!", {
          description: `Your ${module} module is now ready to use!`,
          duration: 8000,
        });
        localStorage.removeItem('pendingModuleActivation');
        // Disable fast polling after detection
        setTimeout(() => enableFastPolling(false), 1000);
        return;
      }
      
      // Subscribe to module changes
      const unsubscribe = onModulesChange((newModules) => {
        if (newModules.includes(expectedKey)) {
          console.log('[Dashboard] New module detected:', expectedKey);
          toast.success("🎉 Module Activated!", {
            description: `Your ${module} module is now ready to use! Click any module to start analyzing.`,
            duration: 10000,
          });
          localStorage.removeItem('pendingModuleActivation');
          // Disable fast polling after detection
          setTimeout(() => enableFastPolling(false), 1000);
          unsubscribe();
        }
      });
      
      // Timeout after 5 minutes
      const timeout = setTimeout(() => {
        console.log('[Dashboard] Module activation timeout, stopping watch');
        localStorage.removeItem('pendingModuleActivation');
        enableFastPolling(false);
        unsubscribe();
      }, 5 * 60 * 1000);
      
      return () => {
        clearTimeout(timeout);
        unsubscribe();
        enableFastPolling(false);
      };
    } catch (error) {
      console.error('[Dashboard] Error parsing pending activation:', error);
      localStorage.removeItem('pendingModuleActivation');
    }
  }, [subscribedModules, enableFastPolling, onModulesChange]);

  const loadProgress = async () => {
    try {
      const progressResponse = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user!.id);

      if (progressResponse.error) throw progressResponse.error;
      setProgress(progressResponse.data || []);
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSportChange = (sport: string) => {
    const newSport = sport as SportType;
    
    // Check if user has dismissed the warning
    const dontShowWarning = localStorage.getItem('dontShowSportWarning') === 'true';
    
    // If trying to switch to a different sport and warning not dismissed
    if (newSport !== selectedSport && !dontShowWarning) {
      setPendingSportSwitch(newSport);
      setShowSportSwitchDialog(true);
      return;
    }
    
    // Otherwise proceed with the switch
    setSelectedSport(newSport);
    localStorage.setItem('selectedSport', newSport);
    toast.info(`Switched to ${newSport === 'baseball' ? 'Baseball' : 'Softball'} modules`);
  };

  const handleConfirmSportSwitch = () => {
    if (pendingSportSwitch) {
      setSelectedSport(pendingSportSwitch);
      localStorage.setItem('selectedSport', pendingSportSwitch);
      
      if (dontShowAgain) {
        localStorage.setItem('dontShowSportWarning', 'true');
      }
      
      toast.info(`Switched to ${pendingSportSwitch === 'baseball' ? 'Baseball' : 'Softball'} modules`);
    }
    setShowSportSwitchDialog(false);
    setPendingSportSwitch(null);
    setDontShowAgain(false);
  };

  const handleCancelSportSwitch = () => {
    setShowSportSwitchDialog(false);
    setPendingSportSwitch(null);
    setDontShowAgain(false);
  };

  const handleModuleSelect = (module: ModuleType) => {
    const isOwnerOrAdmin = isOwner || isAdmin;
    const hasAccess = hasAccessForSport(module, selectedSport, isOwnerOrAdmin);
    
    if (!hasAccess) {
      localStorage.setItem('pendingModule', module);
      localStorage.setItem('pendingSport', selectedSport);
      navigate("/pricing", { 
        state: { mode: 'add', sport: selectedSport, module: module } 
      });
      return;
    }
    
    navigate(`/analyze/${module}?sport=${selectedSport}`);
  };

  const getModuleProgress = (module: ModuleType) => {
    return progress.find((p) => p.module === module && p.sport === selectedSport);
  };

  const handleRefreshAccess = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Subscription status refreshed");
    } catch (error) {
      console.error("Error refreshing subscription:", error);
      toast.error("Failed to refresh subscription status");
    } finally {
      setIsRefreshing(false);
    }
  };

  const getEfficiencyScoreDisplay = (module: ModuleType) => {
    const moduleProgress = getModuleProgress(module);
    const hasAccess = hasAccessForSport(module, selectedSport, isOwner || isAdmin);
    
    // Only show if user has access to the module
    if (!hasAccess) return null;
    
    // Show if there's progress data
    if (moduleProgress?.average_efficiency_score !== null && 
        moduleProgress?.average_efficiency_score !== undefined) {
      return (
        <div className="w-full px-4 py-2 bg-primary/5 rounded-lg border border-primary/20">
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Average Score
            </p>
            <p className="text-2xl font-bold text-primary">
              {moduleProgress.average_efficiency_score}%
            </p>
          </div>
        </div>
      );
    }
    
    // Show placeholder if no data yet
    return (
      <div className="w-full px-4 py-2 bg-muted/30 rounded-lg border border-muted">
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Average Score
          </p>
          <p className="text-sm text-muted-foreground">
            No data yet
          </p>
        </div>
      </div>
    );
  };

  if (authLoading || loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FollowRequestsPanel />
        
        <div>
          <h1 className="text-3xl font-bold text-foreground">Training Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.user_metadata?.full_name}</p>
        </div>

        {/* Hero Image Card */}
        <Card className="relative overflow-hidden border-2 border-black shadow-lg" style={{ minHeight: '200px' }}>
          <img 
            src={dashboardHeroImage} 
            alt="Baseball player fielding" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <h2 className="text-white text-3xl md:text-4xl font-bold text-center px-4">
              Let's level the playing field!
            </h2>
          </div>
        </Card>


        {/* Sport Switch Confirmation Dialog */}
        <AlertDialog open={showSportSwitchDialog} onOpenChange={setShowSportSwitchDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Switch to {pendingSportSwitch === 'baseball' ? 'Baseball' : 'Softball'}?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>Baseball and Softball modules are separate and contain different:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Video analysis contexts</li>
                  <li>Progress tracking</li>
                  <li>Training data</li>
                </ul>
                <p className="text-sm font-medium">Your current videos and progress are sport-specific.</p>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="dont-show" 
                    checked={dontShowAgain}
                    onCheckedChange={(checked) => setDontShowAgain(checked === true)}
                  />
                  <label 
                    htmlFor="dont-show" 
                    className="text-sm cursor-pointer select-none"
                  >
                    Don't show this again
                  </label>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelSportSwitch}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmSportSwitch}>Switch</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Sport Selector with Refresh Button */}
        <div className="flex items-center gap-4 flex-wrap">
          <Tabs value={selectedSport} onValueChange={handleSportChange}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="baseball">Baseball</TabsTrigger>
              <TabsTrigger value="softball">Softball</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAccess}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Access
          </Button>
        </div>

        {/* Module Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Hitting Module */}
          <Card
            className={`p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] ${
              !hasAccessForSport("hitting", selectedSport, isOwner || isAdmin) ? "opacity-60" : ""
            }`}
            onClick={() => handleModuleSelect("hitting")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="mb-3 flex justify-center">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Icon 
                    iconNode={baseball} 
                    size={24}
                    className={selectedSport === 'softball' ? 'text-[#FFD700]' : 'text-primary'}
                  />
                </div>
              </div>
              <div className="p-4 rounded-full bg-primary/10">
                <Target className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                Hitting
                {!hasAccessForSport("hitting", selectedSport, isOwner || isAdmin) && <Lock className="h-5 w-5" />}
              </h3>
              {getEfficiencyScoreDisplay("hitting")}
              <p className="text-muted-foreground">
                Analyze swing mechanics, kinetic sequence, and bat speed
              </p>
              {getModuleProgress("hitting") && hasAccessForSport("hitting", selectedSport, isOwner || isAdmin) && (
                <div className="text-sm">
                  <p className="font-semibold">
                    Videos Analyzed: {getModuleProgress("hitting").videos_analyzed}
                  </p>
                </div>
              )}
              <Button 
                className="w-full" 
                variant={hasAccessForSport("hitting", selectedSport, isOwner || isAdmin) ? "default" : "outline"}
              >
                {hasAccessForSport("hitting", selectedSport, isOwner || isAdmin) ? (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Start Analysis
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Subscribe
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Pitching Module */}
          <Card
            className={`p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] ${
              !hasAccessForSport("pitching", selectedSport, isOwner || isAdmin) ? "opacity-60" : ""
            }`}
            onClick={() => handleModuleSelect("pitching")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="mb-3 flex justify-center">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Icon 
                    iconNode={baseball} 
                    size={24}
                    className={selectedSport === 'softball' ? 'text-[#FFD700]' : 'text-primary'}
                  />
                </div>
              </div>
              <div className="p-4 rounded-full bg-primary/10">
                <CircleDot className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                Pitching
                {!hasAccessForSport("pitching", selectedSport, isOwner || isAdmin) && <Lock className="h-5 w-5" />}
              </h3>
              {getEfficiencyScoreDisplay("pitching")}
              <p className="text-muted-foreground">
                Analyze delivery mechanics, arm action, and sequencing
              </p>
              {getModuleProgress("pitching") && hasAccessForSport("pitching", selectedSport, isOwner || isAdmin) && (
                <div className="text-sm">
                  <p className="font-semibold">
                    Videos Analyzed: {getModuleProgress("pitching").videos_analyzed}
                  </p>
                </div>
              )}
              <Button 
                className="w-full" 
                variant={hasAccessForSport("pitching", selectedSport, isOwner || isAdmin) ? "default" : "outline"}
              >
                {hasAccessForSport("pitching", selectedSport, isOwner || isAdmin) ? (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Start Analysis
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Subscribe
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Throwing Module */}
          <Card
            className={`p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] ${
              !hasAccessForSport("throwing", selectedSport, isOwner || isAdmin) ? "opacity-60" : ""
            }`}
            onClick={() => handleModuleSelect("throwing")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="mb-3 flex justify-center">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Icon 
                    iconNode={baseball} 
                    size={24}
                    className={selectedSport === 'softball' ? 'text-[#FFD700]' : 'text-primary'}
                  />
                </div>
              </div>
              <div className="p-4 rounded-full bg-primary/10">
                <Zap className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                Throwing
                {!hasAccessForSport("throwing", selectedSport, isOwner || isAdmin) && <Lock className="h-5 w-5" />}
              </h3>
              {getEfficiencyScoreDisplay("throwing")}
              <p className="text-muted-foreground">
                Analyze arm action, footwork, and energy transfer
              </p>
              {getModuleProgress("throwing") && hasAccessForSport("throwing", selectedSport, isOwner || isAdmin) && (
                <div className="text-sm">
                  <p className="font-semibold">
                    Videos Analyzed: {getModuleProgress("throwing").videos_analyzed}
                  </p>
                </div>
              )}
              <Button 
                className="w-full" 
                variant={hasAccessForSport("throwing", selectedSport, isOwner || isAdmin) ? "default" : "outline"}
              >
                {hasAccessForSport("throwing", selectedSport, isOwner || isAdmin) ? (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Start Analysis
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Subscribe
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
