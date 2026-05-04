// Force rebuild to clear stale module references - Dec 2025
import { Suspense, lazy, useEffect, ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageLoadingSkeleton } from "./components/skeletons/PageLoadingSkeleton";
import { SportThemeProvider } from "./contexts/SportThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { QuickEditProfileProvider } from "./components/profile/QuickEditProfile";
// Preloaded lazy imports — triggers fetch at boot, not on navigation
const dashboardImport = () => import("./pages/Dashboard");
const scoutDashboardImport = () => import("./pages/ScoutDashboard");

// Fire preloads immediately at module load time
const dashboardPreload = dashboardImport();
const scoutDashboardPreload = scoutDashboardImport();

// Lazy components that resolve from the already-in-flight preload
const Dashboard = lazy(() => dashboardPreload.catch(() => dashboardImport()));
const ScoutDashboard = lazy(() => scoutDashboardPreload.catch(() => scoutDashboardImport()));

// Clean up cache-busting param after successful load
const cleanupCacheBustParam = () => {
  const url = new URL(window.location.href);
  if (url.searchParams.has('_cb')) {
    url.searchParams.delete('_cb');
    window.history.replaceState({}, '', url.toString());
  }
};

// Helper function to retry dynamic imports with cache-busting
const lazyWithRetry = <T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 3
) => {
  return lazy(async () => {
    for (let i = 0; i < retries; i++) {
      try {
        return await componentImport();
      } catch (error) {
        console.warn(`Dynamic import failed (attempt ${i + 1}/${retries}):`, error);
        if (i === retries - 1) throw error;
        // Wait with exponential backoff before retry
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
      }
    }
    throw new Error('Failed to load module after retries');
  });
};

// Lazy load all pages with retry logic for better reliability
const Index = lazyWithRetry(() => import("./pages/Index"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const SelectUserRole = lazyWithRetry(() => import("./pages/SelectUserRole"));
const SelectSportScout = lazyWithRetry(() => import("./pages/SelectSportScout"));
const ScoutApplication = lazyWithRetry(() => import("./pages/ScoutApplication"));
const ScoutApplicationPending = lazyWithRetry(() => import("./pages/ScoutApplicationPending"));
const SelectSport = lazyWithRetry(() => import("./pages/SelectSport"));
const SelectModules = lazyWithRetry(() => import("./pages/SelectModules"));
const Pricing = lazyWithRetry(() => import("./pages/Pricing"));
const Checkout = lazyWithRetry(() => import("./pages/Checkout"));
const ProfileSetup = lazyWithRetry(() => import("./pages/ProfileSetup"));
const Activate = lazyWithRetry(() => import("./pages/Activate"));

const MyFollowers = lazyWithRetry(() => import("./pages/MyFollowers"));
const AnalyzeVideo = lazyWithRetry(() => import("./pages/AnalyzeVideo"));
const OwnerDashboard = lazyWithRetry(() => import("./pages/OwnerDashboard"));
const VideoLibrary = lazyWithRetry(() => import("./pages/VideoLibrary"));
const VideoLibraryPlayer = lazyWithRetry(() => import("./pages/VideoLibraryPlayer"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));

const CoachDashboard = lazyWithRetry(() => import("./pages/CoachDashboard"));
const InitializeOwner = lazyWithRetry(() => import("./pages/InitializeOwner"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const Rankings = lazyWithRetry(() => import("./pages/Rankings"));
const Weather = lazyWithRetry(() => import("./pages/Weather"));
const Subscribers = lazyWithRetry(() => import("./pages/Subscribers"));
const PlayersClub = lazyWithRetry(() => import("./pages/PlayersClub"));
const Nutrition = lazyWithRetry(() => import("./pages/Nutrition"));
const NutritionHub = lazyWithRetry(() => import("./pages/NutritionHub"));
const BounceBackBay = lazyWithRetry(() => import("./pages/BounceBackBay"));
const MindFuel = lazyWithRetry(() => import("./pages/MindFuel"));
const ProductionLab = lazyWithRetry(() => import("./pages/ProductionLab"));
const ProductionStudio = lazyWithRetry(() => import("./pages/ProductionStudio"));
const Vault = lazyWithRetry(() => import("./pages/Vault"));
const TexVision = lazyWithRetry(() => import("./pages/TexVision"));
const ComingSoon = lazyWithRetry(() => import("./pages/ComingSoon"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const MyCustomActivities = lazyWithRetry(() => import("./pages/MyCustomActivities"));
const SharedActivity = lazyWithRetry(() => import("./pages/SharedActivity"));
const Calendar = lazyWithRetry(() => import("./pages/Calendar"));
const SpeedLab = lazyWithRetry(() => import("./pages/SpeedLab"));
const CompletePlayer = lazyWithRetry(() => import("./pages/CompletePlayer"));
const CompleteHitter = lazyWithRetry(() => import("./pages/CompleteHitter"));
const CompletePitcher = lazyWithRetry(() => import("./pages/CompletePitcher"));
const HelpDesk = lazyWithRetry(() => import("./pages/HelpDesk"));
const FiveToolPlayer = lazyWithRetry(() => import("./pages/FiveToolPlayer"));
const GoldenTwoWay = lazyWithRetry(() => import("./pages/GoldenTwoWay"));
const TheUnicorn = lazyWithRetry(() => import("./pages/TheUnicorn"));
const ExplosiveConditioning = lazyWithRetry(() => import("./pages/ExplosiveConditioning"));
const PracticeHub = lazyWithRetry(() => import("./pages/PracticeHub"));
const ProgressDashboard = lazyWithRetry(() => import("./pages/ProgressDashboard"));
const OrganizationDashboard = lazyWithRetry(() => import("./pages/OrganizationDashboard"));
const AdminVerification = lazyWithRetry(() => import("./pages/AdminVerification"));
const GameScoring = lazyWithRetry(() => import("./pages/GameScoring"));
const BaseStealingTrainer = lazyWithRetry(() => import("./pages/BaseStealingTrainer"));
const SoftballStealingTrainer = lazyWithRetry(() => import("./pages/SoftballStealingTrainer"));
const PickoffTrainer = lazyWithRetry(() => import("./pages/PickoffTrainer"));
const BaserunningIQ = lazyWithRetry(() => import("./pages/BaserunningIQ"));
const RoyalTiming = lazyWithRetry(() => import("./pages/RoyalTiming"));
const AdminEngineSettings = lazyWithRetry(() => import("./pages/AdminEngineSettings"));
const EngineHealthDashboard = lazyWithRetry(() => import("./pages/EngineHealthDashboard"));
const DrillLibraryPlayer = lazyWithRetry(() => import("./pages/DrillLibraryPlayer"));
const TrainingBlock = lazyWithRetry(() => import("./pages/TrainingBlock"));
const ProgramBuilder = lazyWithRetry(() => import("./pages/owner/ProgramBuilder"));
const BundleBuilder = lazyWithRetry(() => import("./pages/owner/BundleBuilder"));
const ConsultationFlow = lazyWithRetry(() => import("./pages/owner/ConsultationFlow"));
const BuildLibrary = lazyWithRetry(() => import("./pages/owner/BuildLibrary"));
const Success = lazyWithRetry(() => import("./pages/Success"));
const BuildAccessGate = lazyWithRetry(() => import("./pages/BuildAccessGate"));
const DemoRoot = lazyWithRetry(() => import("./pages/demo/DemoRoot"));
const DemoTier = lazyWithRetry(() => import("./pages/demo/DemoTier"));
const DemoCategory = lazyWithRetry(() => import("./pages/demo/DemoCategory"));
const DemoSubmodule = lazyWithRetry(() => import("./pages/demo/DemoSubmodule"));
const DemoUpgrade = lazyWithRetry(() => import("./pages/demo/DemoUpgrade"));
const StartHereRunner = lazyWithRetry(() => import("./pages/start-here/StartHereRunner"));
import { DemoGate } from "./components/demo/DemoGate";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  // Clean up cache-bust param on successful load
  useEffect(() => {
    cleanupCacheBustParam();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <SportThemeProvider>
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <PWAUpdatePrompt />
          <BrowserRouter>
            <QuickEditProfileProvider>
            <Suspense fallback={<PageLoadingSkeleton />}>
              <DemoGate>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/select-user-role" element={<SelectUserRole />} />
              <Route path="/select-sport-scout" element={<SelectSportScout />} />
              <Route path="/scout-application" element={<ScoutApplication />} />
              <Route path="/scout-application-pending" element={<ScoutApplicationPending />} />
              <Route path="/select-sport" element={<SelectSport />} />
              <Route path="/select-modules" element={<SelectModules />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/activate" element={<Activate />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-followers" element={<MyFollowers />} />
              <Route path="/analyze/:module" element={<AnalyzeVideo />} />
              <Route path="/video-library" element={<VideoLibrary />} />
              <Route path="/video-library/:id" element={<VideoLibraryPlayer />} />
              <Route path="/owner" element={<OwnerDashboard />} />
              <Route path="/owner/open_program_builder" element={<ProgramBuilder />} />
              <Route path="/owner/open_bundle_builder" element={<BundleBuilder />} />
              <Route path="/owner/open_consultation_flow" element={<ConsultationFlow />} />
              <Route path="/owner/builds" element={<BuildLibrary />} />
              <Route path="/success" element={<Success />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/scout-dashboard" element={<ScoutDashboard />} />
              <Route path="/coach-dashboard" element={<CoachDashboard />} />
              <Route path="/initialize-owner" element={<InitializeOwner />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/weather" element={<Weather />} />
              <Route path="/subscribers" element={<Subscribers />} />
              <Route path="/players-club" element={<PlayersClub />} />
              <Route path="/nutrition" element={<Nutrition />} />
              <Route path="/nutrition-hub" element={<NutritionHub />} />
              <Route path="/mind-fuel" element={<MindFuel />} />
              <Route path="/bounce-back-bay" element={<BounceBackBay />} />
              <Route path="/production-lab" element={<ProductionLab />} />
              <Route path="/production-studio" element={<ProductionStudio />} />
              <Route path="/vault" element={<Vault />} />
              <Route path="/tex-vision" element={<TexVision />} />
              <Route path="/coming-soon" element={<ComingSoon />} />
              <Route path="/my-custom-activities" element={<MyCustomActivities />} />
              <Route path="/shared-activity/:shareCode" element={<SharedActivity />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/speed-lab" element={<SpeedLab />} />
              <Route path="/complete-player" element={<CompletePlayer />} />
              <Route path="/complete-hitter" element={<CompleteHitter />} />
              <Route path="/complete-pitcher" element={<CompletePitcher />} />
              <Route path="/5tool-player" element={<FiveToolPlayer />} />
              <Route path="/golden-2way" element={<GoldenTwoWay />} />
              <Route path="/the-unicorn" element={<TheUnicorn />} />
              <Route path="/explosive-conditioning" element={<ExplosiveConditioning />} />
              <Route path="/practice" element={<PracticeHub />} />
              <Route path="/progress" element={<ProgressDashboard />} />
              <Route path="/organization" element={<OrganizationDashboard />} />
              <Route path="/admin-verification" element={<AdminVerification />} />
              <Route path="/game-scoring" element={<GameScoring />} />
              <Route path="/base-stealing" element={<BaseStealingTrainer />} />
              <Route path="/softball-stealing" element={<SoftballStealingTrainer />} />
              <Route path="/pickoff-trainer" element={<PickoffTrainer />} />
              <Route path="/baserunning-iq" element={<BaserunningIQ />} />
              <Route path="/royal-timing" element={<RoyalTiming />} />
              <Route path="/admin/engine-settings" element={<AdminEngineSettings />} />
              <Route path="/admin/engine-health" element={<EngineHealthDashboard />} />
              <Route path="/coach-compliance" element={<Navigate to="/coach-dashboard" replace />} />
              <Route path="/drill-library" element={<DrillLibraryPlayer />} />
              <Route path="/training-block" element={<TrainingBlock />} />
              <Route path="/help-desk" element={<HelpDesk />} />
              <Route path="/program/:id" element={<BuildAccessGate buildType="program" />} />
              <Route path="/bundle/:id" element={<BuildAccessGate buildType="bundle" />} />
              <Route path="/consultation/:id" element={<BuildAccessGate buildType="consultation" />} />
              <Route path="/start-here" element={<StartHereRunner />} />
              <Route path="/demo" element={<DemoRoot />} />
              <Route path="/demo/upgrade" element={<DemoUpgrade />} />
              <Route path="/demo/:tier" element={<DemoTier />} />
              <Route path="/demo/:tier/:category" element={<DemoCategory />} />
              <Route path="/demo/:tier/:category/:submodule" element={<DemoSubmodule />} />
              <Route path="*" element={<NotFound />} />
              </Routes>
              </DemoGate>
            </Suspense>
            </QuickEditProfileProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </SportThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
