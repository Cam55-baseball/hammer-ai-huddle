import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageLoadingSkeleton } from "./components/skeletons/PageLoadingSkeleton";

// Lazy load all pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SelectUserRole = lazy(() => import("./pages/SelectUserRole"));
const SelectSportScout = lazy(() => import("./pages/SelectSportScout"));
const ScoutApplication = lazy(() => import("./pages/ScoutApplication"));
const ScoutApplicationPending = lazy(() => import("./pages/ScoutApplicationPending"));
const SelectSport = lazy(() => import("./pages/SelectSport"));
const SelectModules = lazy(() => import("./pages/SelectModules"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Checkout = lazy(() => import("./pages/Checkout"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MyFollowers = lazy(() => import("./pages/MyFollowers"));
const AnalyzeVideo = lazy(() => import("./pages/AnalyzeVideo"));
const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ScoutDashboard = lazy(() => import("./pages/ScoutDashboard"));
const InitializeOwner = lazy(() => import("./pages/InitializeOwner"));
const Profile = lazy(() => import("./pages/Profile"));
const Rankings = lazy(() => import("./pages/Rankings"));
const Weather = lazy(() => import("./pages/Weather"));
const Subscribers = lazy(() => import("./pages/Subscribers"));
const PlayersClub = lazy(() => import("./pages/PlayersClub"));
const Nutrition = lazy(() => import("./pages/Nutrition"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
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
              <Route path="/coming-soon" element={<ComingSoon />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
