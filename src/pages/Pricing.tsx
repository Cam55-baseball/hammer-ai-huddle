import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Pricing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { role?: string; sport?: string; modules?: string[] };
  
  const selectedRole = state?.role || localStorage.getItem('selectedRole');
  const selectedSport = state?.sport || localStorage.getItem('selectedSport');
  const selectedModules = state?.modules || JSON.parse(localStorage.getItem('selectedModules') || '[]');

  useEffect(() => {
    if (!selectedRole || !selectedSport || selectedModules.length === 0) {
      navigate("/");
    }
  }, [selectedRole, selectedSport, selectedModules, navigate]);

  const handleGetStarted = () => {
    navigate("/auth", { 
      state: { 
        role: selectedRole, 
        sport: selectedSport, 
        modules: selectedModules,
        fromPricing: true
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-12">
          <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl">H</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">
            Start your journey to peak performance
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h3 className="font-semibold mb-4">Your Selection:</h3>
          <div className="flex flex-wrap gap-3">
            <span className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm">
              <strong>Role:</strong> {selectedRole}
            </span>
            <span className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm">
              <strong>Sport:</strong> {selectedSport}
            </span>
            {selectedModules.map((module: string) => (
              <span key={module} className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm capitalize">
                {module}
              </span>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Free Trial</h3>
              <div className="text-4xl font-bold mb-4">$0</div>
              <p className="text-sm text-muted-foreground mb-6">14 days</p>
              <ul className="text-left space-y-3 mb-8 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>5 video analyses per module</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Basic motion tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Performance metrics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Progress tracking</span>
                </li>
              </ul>
              <Button onClick={handleGetStarted} variant="outline" className="w-full">
                Start Free Trial
              </Button>
            </div>
          </Card>

          <Card className="p-6 border-primary relative hover:shadow-lg transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-semibold">
              MOST POPULAR
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-4">$29</div>
              <p className="text-sm text-muted-foreground mb-6">per month</p>
              <ul className="text-left space-y-3 mb-8 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Unlimited video analyses</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Advanced motion capture</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>AI-powered insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Compare with pros</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Training recommendations</span>
                </li>
              </ul>
              <Button onClick={handleGetStarted} className="w-full">
                Get Started
              </Button>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Team</h3>
              <div className="text-4xl font-bold mb-4">$99</div>
              <p className="text-sm text-muted-foreground mb-6">per month</p>
              <ul className="text-left space-y-3 mb-8 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Up to 15 team members</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Team analytics dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Coach collaboration tools</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Priority support</span>
                </li>
              </ul>
              <Button onClick={handleGetStarted} variant="outline" className="w-full">
                Contact Sales
              </Button>
            </div>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/select-modules", { state: { role: selectedRole, sport: selectedSport } })}
          >
            ← Back to Modules
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          No credit card required for free trial. Cancel anytime.
        </p>
      </div>
    </div>
  );
};

export default Pricing;
