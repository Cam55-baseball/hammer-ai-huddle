import { TestingDayNotices } from "@/components/organization/TestingDayNotices";
import { StaffPlanTiles } from "@/components/staff/StaffPlanTiles";
import { AddOnsSection } from "@/components/dashboard/AddOnsSection";
import { videoGradesShown, VIDEO_GRADE_PLACEHOLDER } from "@/lib/reportCard/visibility";
import { useProgramsRetired } from "@/hooks/useProgramsRetired";
import { scrubRetiredFromList } from "../../supabase/functions/_shared/archive/retiredPrograms";
import { HMLoadingFallback } from "@/components/loading/HMLoadingScreen";
// Force module rebuild - Mar 2026
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useScoutAccess } from "@/hooks/useScoutAccess";
import { usePlayerModuleAccess } from "@/hooks/usePlayerModuleAccess";
import { plansForSport } from "@/utils/tierAccess";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CircleDot, Target, Zap, Upload, Lock, Icon, Construction, Sparkles, BookMarked, RefreshCw, ShoppingBag, ExternalLink, Building2, Gamepad2, Check } from "lucide-react";
import { TIER_CONFIG } from "@/constants/tiers";
import { baseball } from "@lucide/lab";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FollowRequestsPanel } from "@/components/FollowRequestsPanel";
import { PlanTiles } from "@/components/dashboard/PlanTiles";
import { DashboardModuleSkeleton } from "@/components/skeletons/DashboardModuleSkeleton";
import { PostGameLogPrompt } from "@/components/games/PostGameLogPrompt";
import { CoachScoutGamePlanCard } from "@/components/CoachScoutGamePlanCard";
import { IdentityCommandCard } from "@/components/identity/IdentityCommandCard";
import { CommunicationAI } from "@/components/dashboard/CommunicationAI";
import { TodaysHammerPick } from "@/components/dashboard/TodaysHammerPick";
import { HammerDailyPlan } from "@/components/hammer/HammerDailyPlan";
// HumanPerformanceCard now rendered inside HammerDailyPlan itself.
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Sparkles as SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { usePlayerOrganization } from "@/hooks/usePlayerOrganization";
import dashboardHero1 from "@/assets/dashboard-hero.jpg";
import dashboardHero2 from "@/assets/dashboard-hero-1.jpg";
import dashboardHero3 from "@/assets/dashboard-hero-2.jpg";
import dashboardHero4 from "@/assets/dashboard-hero-3.jpg";
import { usePurchaseAvailability } from "@/hooks/usePurchaseAvailability";
import { openWebsiteCheckout } from "@/lib/purchase/websiteHandoff";

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

/**
 * Hammers Today Plan — collapsible Dashboard mount. Persists open/closed per
 * day in localStorage so it auto-opens once daily and respects user choice the
 * rest of the day. Reads the same canonical organism context as /command, so
 * Dashboard and Command Center stay in lockstep — never random.
 */
function DashboardTodayPlan({
  beforeStartPortalTarget,
}: {
  beforeStartPortalTarget: HTMLElement | null;
}) {
  const dayKey = `hammer.today.dashboard.open.${new Date().toISOString().slice(0, 10)}`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(dayKey);
      return v === null ? true : v === "1";
    } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem(dayKey, open ? "1" : "0"); } catch { /* ignore */ }
  }, [open, dayKey]);
  return (
    <section className="rounded-2xl border-2 border-primary/30 bg-card overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
            aria-expanded={open}
          >
            <div className="flex items-center gap-2 min-w-0">
              <SparklesIcon className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight">Hammers Today Plan</div>
                <p className="text-[11px] text-muted-foreground leading-tight truncate">
                  Built from your latest organism data — never random.
                </p>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent forceMount hidden={!open} className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="p-3 sm:p-4 border-t border-border/60 space-y-3">
            <TodaysHammerPick />
            <HammerDailyPlan beforeStartPortalTarget={beforeStartPortalTarget} />
            {/* HumanPerformanceCard moved inside HammerDailyPlan (positioned under Today's Wisdom). */}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, session, loading: authLoading, isAuthStable } = useAuth();
  const subscription = useSubscription();
  const { modules: subscribedModules, module_details, loading: subLoading, refetch, hasAccessForSport, getModuleDetails, onModulesChange, enableFastPolling } = subscription;
  const { canShowPurchaseUI, mode: purchaseMode, isStaffAccount, roleLoading: purchaseRoleLoading } = usePurchaseAvailability();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const { isScout, isCoach, loading: scoutLoading } = useScoutAccess();
  // Player surfaces are gated on a PURCHASED player module (server-verified),
  // never on role. Staff who buy one get the player plan in addition to theirs.
  const { hasPlayerAccess } = usePlayerModuleAccess();
  const navigate = useNavigate();
  const { retired: programsRetired } = useProgramsRetired();
  const { selectedSport, setSelectedSport, handleSportChange, dialog: sportSwitchDialog } = useSportSwitch(() => savedSport() ?? "baseball");
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [beforeStartPortalTarget, setBeforeStartPortalTarget] = useState<HTMLDivElement | null>(null);
  
  // Tier-based display: only the purchased tier card shows "Start Training"
  // Owner Nov 6 r5: tiles marked Unlocked come from the one shared activePlans judge.
  const heldPlans: string[] = plansForSport(subscription, selectedSport);
  const isTierUnlocked = (tier: string) => isOwner || isAdmin || heldPlans.includes(tier);
  const hasAnyTier = isOwner || isAdmin || heldPlans.length > 0;

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
      
      // setSelectedSport also saves the sport on this device.
      if (hasSoftball && !hasBaseball) {
        setSelectedSport('softball');
      } else if (hasBaseball && !hasSoftball) {
        setSelectedSport('baseball');
      } else if (hasSoftball) {
        setSelectedSport('softball');
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

  // Plan squares (and their tap rules) moved to the "Find Your Training Plan" page — owner Nov 6.

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
    if (videoGradesShown() && moduleProgress?.average_efficiency_score !== null && 
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

  if (authLoading || loading || subLoading || scoutLoading)  return <HMLoadingFallback />;

  // Owner Nov 6: one "Find Your Training Plan" button replaces everything that sat under the toggle.
  const findPlanButton = (
    <Button
      className="w-full min-h-11 font-semibold"
      onClick={() => navigate(trainingPlansUrl(selectedSport))}
      data-find-training-plan
    >
      Find Your Training Plan
    </Button>
  );

  const moduleCardsSection = (
    <>
      {/* Sport Selector with Refresh Button */}
      <SportToggleRow selectedSport={selectedSport} onSportChange={handleSportChange} onRefresh={handleRefreshAccess} isRefreshing={isRefreshing} />
      {findPlanButton}
    </>
  );

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-5 overflow-x-hidden max-w-full">
        <FollowRequestsPanel />
        <TestingDayNotices />
        
        <div data-tour="landing" data-tour-context>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
          <div className="flex items-center gap-2">
            <p className="text-sm sm:text-base text-muted-foreground">{t('dashboard.welcomeBack')} {user?.user_metadata?.full_name}</p>
            <OrgBadge />
          </div>
        </div>

        {/* Hero Image Card */}
        <Card className="relative overflow-hidden border-2 border-black shadow-lg aspect-[21/9] sm:aspect-[32/9] w-full max-w-full">
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

        {/* Module cards above Game Plan when user has no tier (players only) */}
        {!purchaseRoleLoading && !isStaffAccount && !hasAnyTier && moduleCardsSection}

        {hasPlayerAccess && <IdentityCommandCard />}

        {/* Exact athlete order: Identity → standalone Before You Start →
            Hammers Today Plan. The ref-backed host prevents portal timing races. */}
        {(isScout || isCoach) && (
          <CoachScoutGamePlanCard isCoach={isCoach} isScout={isScout} />
        )}

        {/* Recent game still unlogged — ask once, link straight to the logger. */}
        {hasPlayerAccess && (
          <div className="pb-3">
            <PostGameLogPrompt />
          </div>
        )}

        {hasPlayerAccess && (
          <>
            <div ref={setBeforeStartPortalTarget} className="pb-3 sm:pb-5" />
            <section className="pb-2" data-tour="today-plan">
              <DashboardTodayPlan beforeStartPortalTarget={beforeStartPortalTarget} />
            </section>
          </>
        )}


        {/* My Daily Game Plan lives on its own page (side menu). */}

        {/* Develop This Week and Recent development picks live as drawers in The General. */}

        {/* Sport Switch Confirmation Dialog */}
        {sportSwitchDialog}

        {/* Module cards below Game Plan when user has a tier, or is coach/scout */}
        {!purchaseRoleLoading && !isStaffAccount && hasAnyTier && moduleCardsSection}

        {/* Staff accounts have no toggle; their button sits where the merch square was. */}
        {!purchaseRoleLoading && isStaffAccount && findPlanButton}
      </div>
    </DashboardLayout>
  );
}
