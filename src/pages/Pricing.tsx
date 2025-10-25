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
  
  const modulePrice = 200;
  const totalPrice = selectedModules.length * modulePrice;

  useEffect(() => {
    if (!selectedRole || !selectedSport || selectedModules.length === 0) {
      navigate("/");
    }
  }, [selectedRole, selectedSport, selectedModules, navigate]);

  const handleGetStarted = () => {
    navigate("/checkout");
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
          <div className="flex flex-wrap gap-3 mb-4">
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
          <div className="pt-4 border-t border-border">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-muted-foreground">{selectedModules.length} module(s) selected</span>
              <span className="font-semibold">$200 per module/month</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-2xl font-bold text-primary">${totalPrice}/month</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 border-primary relative hover:shadow-lg transition-all">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Individual Plan</h3>
              <div className="text-4xl font-bold mb-4">${totalPrice}</div>
              <p className="text-sm text-muted-foreground mb-6">$200 per module selected</p>
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
                Subscribe Now
              </Button>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Team Plan</h3>
              <div className="text-4xl font-bold mb-4">${totalPrice * 15}</div>
              <p className="text-sm text-muted-foreground mb-6">{selectedModules.length} module(s) × 15 members</p>
              <ul className="text-left space-y-3 mb-8 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Everything in Individual Plan</span>
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
      </div>
    </div>
  );
};

export default Pricing;
