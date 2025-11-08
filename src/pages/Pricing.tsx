import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Pricing = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const state = location.state as { role?: string; sport?: string; module?: string; mode?: 'add' | 'new' };
  
  const selectedRole = state?.role || localStorage.getItem('selectedRole') || localStorage.getItem('userRole');
  const selectedSport = state?.sport || localStorage.getItem('pendingSport') || localStorage.getItem('selectedSport') || 'baseball';
  const selectedModule = state?.module || localStorage.getItem('pendingModule') || localStorage.getItem('selectedModule');
  const isAddMode = state?.mode === 'add';
  
  const modulePrice = 200;

  useEffect(() => {
    // Wait for auth to finish loading before making decisions
    if (authLoading) return;
    
    if (!user) {
      // Preserve state when redirecting to auth
      navigate("/auth", { 
        state: {
          returnTo: '/pricing',
          sport: selectedSport,
          module: selectedModule,
          mode: isAddMode ? 'add' : 'new'
        }
      });
      return;
    }
    
    if (!isAddMode && (!selectedSport || !selectedModule)) {
      navigate("/select-sport");
      return;
    }
    
    if (isAddMode && !selectedModule) {
      navigate("/dashboard");
      return;
    }
  }, [user, authLoading, selectedRole, selectedSport, selectedModule, isAddMode, navigate]);

  const handleGetStarted = () => {
    // Store in localStorage as backup
    if (selectedModule) localStorage.setItem('selectedModule', selectedModule);
    if (selectedSport) localStorage.setItem('selectedSport', selectedSport);
    
    navigate("/checkout", { 
      state: { 
        role: selectedRole, 
        sport: selectedSport, 
        module: selectedModule,
        returnTo: isAddMode ? '/dashboard' : undefined
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl">H</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">{isAddMode ? 'Add Module Subscription' : 'Start Your Subscription'}</h1>
          <p className="text-muted-foreground">
            {isAddMode ? `Add ${selectedModule} to your training modules` : 'Subscribe to your first training module'}
          </p>
          {!isAddMode && (
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
              <span className="bg-muted px-3 py-1 rounded-full">Sport: {selectedSport}</span>
              <span>→</span>
              <span className="bg-muted px-3 py-1 rounded-full">Role: {selectedRole}</span>
              <span>→</span>
              <span className="bg-muted px-3 py-1 rounded-full capitalize">{selectedModule}</span>
              <span>→</span>
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full">Pricing</span>
            </div>
          )}
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="p-8 relative border-primary border-2">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
              {isAddMode ? 'Add Module' : 'Get Started'}
            </div>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2 capitalize">{selectedModule} Module</h3>
              <div className="text-4xl font-bold mb-2">
                ${modulePrice}
                <span className="text-lg text-muted-foreground">/month</span>
              </div>
              <p className="text-muted-foreground">
                {isAddMode ? 'This will be added to your current subscription' : 'Perfect for individual training'}
              </p>
            </div>

            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Price shown before promotions. If you have a promotional code (including 100% off codes), 
                apply it during checkout. Your discount will be reflected in your final billing.
              </AlertDescription>
            </Alert>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>Advanced AI Analysis</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>Unlimited Video Uploads</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>Performance Tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>Detailed Feedback Reports</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span>Mobile Access</span>
              </li>
            </ul>
            
            <Button onClick={handleGetStarted} className="w-full" size="lg">
              {isAddMode ? 'Add Module' : 'Subscribe Now'}
            </Button>
          </Card>
        </div>

        <div className="text-center mt-6">
          <Button variant="ghost" onClick={() => isAddMode ? navigate("/dashboard") : navigate("/select-modules", { state: { role: selectedRole || localStorage.getItem('userRole') || undefined, sport: selectedSport } })}>
            ← Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
