import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import SelectUserRole from "./pages/SelectUserRole";
import SelectSportScout from "./pages/SelectSportScout";
import ScoutApplication from "./pages/ScoutApplication";
import ScoutApplicationPending from "./pages/ScoutApplicationPending";
import SelectSport from "./pages/SelectSport";
import SelectRole from "./pages/SelectRole";
import SelectModules from "./pages/SelectModules";
import Pricing from "./pages/Pricing";
import Checkout from "./pages/Checkout";
import ProfileSetup from "./pages/ProfileSetup";
import Dashboard from "./pages/Dashboard";
import MyFollowers from "./pages/MyFollowers";
import AnalyzeVideo from "./pages/AnalyzeVideo";
import OwnerDashboard from "./pages/OwnerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ScoutDashboard from "./pages/ScoutDashboard";
import InitializeOwner from "./pages/InitializeOwner";
import Profile from "./pages/Profile";
import Rankings from "./pages/Rankings";
import Weather from "./pages/Weather";
import Subscribers from "./pages/Subscribers";
import PlayersClub from "./pages/PlayersClub";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/select-user-role" element={<SelectUserRole />} />
          <Route path="/select-sport-scout" element={<SelectSportScout />} />
          <Route path="/scout-application" element={<ScoutApplication />} />
          <Route path="/scout-application-pending" element={<ScoutApplicationPending />} />
          <Route path="/select-sport" element={<SelectSport />} />
            {/* SelectRole is deprecated - use SelectUserRole instead */}
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
            <Route path="/coming-soon" element={<ComingSoon />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
