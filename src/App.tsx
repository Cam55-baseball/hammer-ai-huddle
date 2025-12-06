// Force rebuild to clear stale module references - Dec 2025
import { Suspense, lazy, useEffect, ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageLoadingSkeleton } from "./components/skeletons/PageLoadingSkeleton";

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
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const MyFollowers = lazyWithRetry(() => import("./pages/MyFollowers"));
const AnalyzeVideo = lazyWithRetry(() => import("./pages/AnalyzeVideo"));
const OwnerDashboard = lazyWithRetry(() => import("./pages/OwnerDashboard"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const ScoutDashboard = lazyWithRetry(() => import("./pages/ScoutDashboard"));
const InitializeOwner = lazyWithRetry(() => import("./pages/InitializeOwner"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const Rankings = lazyWithRetry(() => import("./pages/Rankings"));
const Weather = lazyWithRetry(() => import("./pages/Weather"));
const Subscribers = lazyWithRetry(() => import("./pages/Subscribers"));
const PlayersClub = lazyWithRetry(() => import("./pages/PlayersClub"));
const Nutrition = lazyWithRetry(() => import("./pages/Nutrition"));
const BounceBackBay = lazyWithRetry(() => import("./pages/BounceBackBay"));
const MindFuel = lazyWithRetry(() => import("./pages/MindFuel"));
const ProductionLab = lazyWithRetry(() => import("./pages/ProductionLab"));
const ProductionStudio = lazyWithRetry(() => import("./pages/ProductionStudio"));
const ComingSoon = lazyWithRetry(() => import("./pages/ComingSoon"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => {
  // Clean up cache-bust param on successful load
  useEffect(() => {
    cleanupCacheBustParam();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoadingSkeleton />}>
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
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-followers" element={<MyFollowers />} />
              <Route path="/analyze/:module" element={<AnalyzeVideo />} />
              <Route path="/owner" element={<OwnerDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/scout-dashboard" element={<ScoutDashboard />} />
              <Route path="/initialize-owner" element={<InitializeOwner />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/weather" element={<Weather />} />
              <Route path="/subscribers" element={<Subscribers />} />
              <Route path="/players-club" element={<PlayersClub />} />
              <Route path="/nutrition" element={<Nutrition />} />
              <Route path="/mind-fuel" element={<MindFuel />} />
              <Route path="/bounce-back-bay" element={<BounceBackBay />} />
              <Route path="/production-lab" element={<ProductionLab />} />
              <Route path="/production-studio" element={<ProductionStudio />} />
              <Route path="/coming-soon" element={<ComingSoon />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
