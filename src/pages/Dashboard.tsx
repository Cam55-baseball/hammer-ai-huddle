// Force module rebuild - Mar 2026
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useScoutAccess } from "@/hooks/useScoutAccess";
import { getActiveTier } from "@/utils/tierAccess";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CircleDot, Target, Zap, Upload, Lock, Icon, Construction, Sparkles, BookMarked, RefreshCw, ShoppingBag, ExternalLink, Building2, Gamepad2 } from "lucide-react";
import { baseball } from "@lucide/lab";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FollowRequestsPanel } from "@/components/FollowRequestsPanel";
import { ModuleManagementCard } from "@/components/ModuleManagementCard";
import { DashboardModuleSkeleton } from "@/components/skeletons/DashboardModuleSkeleton";
import { GamePlanCard } from "@/components/GamePlanCard";
import { CoachScoutGamePlanCard } from "@/components/CoachScoutGamePlanCard";
import { toast } from "sonner";
import { usePlayerOrganization } from "@/hooks/usePlayerOrganization";
import dashboardHero1 from "@/assets/dashboard-hero.jpg";
import dashboardHero2 from "@/assets/dashboard-hero-1.jpg";
import dashboardHero3 from "@/assets/dashboard-hero-2.jpg";
import dashboardHero4 from "@/assets/dashboard-hero-3.jpg";

type ModuleType = "hitting" | "pitching" | "throwing" | "pitcher" | "5tool" | "golden2way";
type SportType = "baseball" | "softball";

function OrgBadge() {
  const { orgName } = usePlayerOrganization();
  if (!orgName) return null;
  return (
    <Badge variant="secondary" className="text-xs">
      <Building2 className="h-3 w-3 mr-1" />
      {orgName}
    </Badge>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, session, loading: authLoading, isAuthStable } = useAuth();
  const { modules: subscribedModules, module_details, loading: subLoading, refetch, hasAccessForSport, getModuleDetails, onModulesChange, enableFastPolling } = useSubscription();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const { isScout, isCoach, loading: scoutLoading } = useScoutAccess();
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
  
  // Tier-based display: only the purchased tier card shows "Start Training"
  const activeTier = getActiveTier(subscribedModules, selectedSport);
  const isTierUnlocked = (tier: string) => isOwner || isAdmin || activeTier === tier;
  const hasAnyTier = isOwner || isAdmin || activeTier !== null;

  const heroImages = [dashboardHero1, dashboardHero2, dashboardHero3, dashboardHero4];
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  useEffect(() => {
    if (!authLoading && isAuthStable) {
      if (!user && !session) {
        navigate("/auth", { replace: true });
        return;
      }
      if (user) {
        refetch();
        loadProgress();
      }
    }
  }, [authLoading, isAuthStable, user, session, navigate]);
  
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
        toast.success(t('dashboard.moduleActivated'), {
          description: t('dashboard.moduleReadyDescription', { module }),
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
          toast.success(t('dashboard.moduleActivated'), {
            description: t('dashboard.moduleReadyDescription', { module }),
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

  // Automatic hero image slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

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
    toast.info(t('dashboard.switchedToSport', { sport: newSport === 'baseball' ? t('dashboard.baseball') : t('dashboard.softball') }));
  };

  const handleConfirmSportSwitch = () => {
    if (pendingSportSwitch) {
      setSelectedSport(pendingSportSwitch);
      localStorage.setItem('selectedSport', pendingSportSwitch);
      
      if (dontShowAgain) {
        localStorage.setItem('dontShowSportWarning', 'true');
      }
      
      toast.info(t('dashboard.switchedToSport', { sport: pendingSportSwitch === 'baseball' ? t('dashboard.baseball') : t('dashboard.softball') }));
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
    
    // For tier-based modules, check access differently
    if (module === 'pitcher') {
      const hasAccess = isOwnerOrAdmin || hasAccessForSport('pitching', selectedSport, isOwnerOrAdmin);
      if (!hasAccess) {
        navigate("/pricing", { state: { sport: selectedSport, tier: 'pitcher' } });
        return;
      }
      navigate("/complete-pitcher");
    } else if (module === '5tool') {
      const hasAccess = isOwnerOrAdmin || hasAccessForSport('hitting', selectedSport, isOwnerOrAdmin);
      if (!hasAccess) {
        navigate("/pricing", { state: { sport: selectedSport, tier: '5tool' } });
        return;
      }
      navigate("/5tool-player");
    } else if (module === 'golden2way') {
      const hasAccess = isOwnerOrAdmin || (hasAccessForSport('hitting', selectedSport, isOwnerOrAdmin) && hasAccessForSport('pitching', selectedSport, isOwnerOrAdmin));
      if (!hasAccess) {
        navigate("/pricing", { state: { sport: selectedSport, tier: 'golden2way' } });
        return;
      }
      navigate("/golden-2way");
    } else {
      // Legacy module handling
      const hasAccess = hasAccessForSport(module, selectedSport, isOwnerOrAdmin);
      if (!hasAccess) {
        navigate("/pricing", { state: { sport: selectedSport } });
        return;
      }
      navigate(`/analyze/${module}?sport=${selectedSport}`);
    }
  };

  const getModuleProgress = (module: ModuleType) => {
    return progress.find((p) => p.module === module && p.sport === selectedSport);
  };

  const handleRefreshAccess = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success(t('dashboard.subscriptionRefreshed'));
    } catch (error) {
      console.error("Error refreshing subscription:", error);
      toast.error(t('errors.somethingWentWrong'));
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
              {t('dashboard.averageScore')}
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
            {t('dashboard.averageScore')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.noDataYet')}
          </p>
        </div>
      </div>
    );
  };

  if (authLoading || loading || subLoading || scoutLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <DashboardModuleSkeleton />
            <DashboardModuleSkeleton />
            <DashboardModuleSkeleton />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
        <FollowRequestsPanel />
        
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
          <div className="flex items-center gap-2">
            <p className="text-sm sm:text-base text-muted-foreground">{t('dashboard.welcomeBack')} {user?.user_metadata?.full_name}</p>
            <OrgBadge />
          </div>
        </div>

        {/* Hero Image Card */}
        <Card className="relative overflow-hidden border-2 border-black shadow-lg aspect-[16/9] sm:aspect-[21/9] w-full max-w-full">
          <img 
            key={currentHeroIndex}
            src={heroImages[currentHeroIndex]} 
            alt="Baseball action" 
            className="w-full h-full object-cover transition-opacity duration-1000 max-w-full"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <h2 className="text-white text-xl sm:text-2xl md:text-4xl font-bold text-center px-4">
              {t('dashboard.heroTitle')}
            </h2>
          </div>
        </Card>

        {/* Module cards above Game Plan when user has no tier */}
        {!hasAnyTier && moduleCardsSection}

        {/* The Game Plan - Daily To-Do List (or Scout Game Plan for scouts-only) */}
        {(isScout || isCoach) && (
          <CoachScoutGamePlanCard isCoach={isCoach} isScout={isScout} />
        )}
        {(isOwner || isAdmin || (!isScout && !isCoach)) && (
          <GamePlanCard selectedSport={selectedSport} />
        )}

        {/* Sport Switch Confirmation Dialog */}
        <AlertDialog open={showSportSwitchDialog} onOpenChange={setShowSportSwitchDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('sportSwitch.switchTo', { sport: pendingSportSwitch === 'baseball' ? t('dashboard.baseball') : t('dashboard.softball') })}</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>{t('sportSwitch.separateModulesDescription')}</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t('sportSwitch.videoAnalysisContexts')}</li>
                  <li>{t('sportSwitch.progressTracking')}</li>
                  <li>{t('sportSwitch.trainingData')}</li>
                </ul>
                <p className="text-sm font-medium">{t('sportSwitch.sportSpecificNote')}</p>
                
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
                    {t('sportSwitch.dontShowAgain')}
                  </label>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelSportSwitch}>{t('sportSwitch.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmSportSwitch}>{t('sportSwitch.switch')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Module cards below Game Plan when user has at least one tier */}
        {hasAnyTier && moduleCardsSection}
      </div>
    </DashboardLayout>
  );
}
