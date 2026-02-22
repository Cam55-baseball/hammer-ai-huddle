import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Info, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TIER_CONFIG, TIER_ORDER } from "@/constants/tiers";

const Pricing = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const state = location.state as { sport?: string; tier?: string };
  
  const [selectedSport, setSelectedSport] = useState<string>(
    state?.sport || localStorage.getItem('selectedSport') || 'baseball'
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { 
        state: { returnTo: '/pricing', sport: selectedSport }
      });
    }
  }, [user, authLoading, navigate, selectedSport]);

  const handleSelectTier = (tierKey: string) => {
    localStorage.setItem('selectedSport', selectedSport);
    navigate("/checkout", { 
      state: { tier: tierKey, sport: selectedSport } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl">H</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Choose Your Training Tier</h1>
          <p className="text-muted-foreground">
            Elite training programs for baseball and softball athletes
          </p>
        </div>

        {/* Sport Toggle */}
        <div className="flex justify-center mb-8">
          <Tabs value={selectedSport} onValueChange={setSelectedSport}>
            <TabsList className="grid w-64 grid-cols-2">
              <TabsTrigger value="baseball">Baseball</TabsTrigger>
              <TabsTrigger value="softball">Softball</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Alert className="mb-6 max-w-2xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Prices shown before promotions. Apply promo codes (including 100% off) during checkout.
          </AlertDescription>
        </Alert>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {TIER_ORDER.map((tierKey) => {
            const tier = TIER_CONFIG[tierKey];
            const isMostPopular = tierKey === '5tool';
            const isBestValue = tierKey === 'golden2way';

            return (
              <Card 
                key={tierKey}
                className={`p-6 relative transition-all hover:shadow-lg ${
                  isBestValue ? 'border-primary border-2' : 
                  isMostPopular ? 'border-primary/50 border-2' : ''
                }`}
              >
                {isMostPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Star className="h-3 w-3" /> Most Popular
                  </div>
                )}
                {isBestValue && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Best Value
                  </div>
                )}

                <div className="text-center mb-6 pt-2">
                  <h3 className="text-xl font-bold mb-2">{tier.displayName}</h3>
                  <div className="text-4xl font-bold mb-1">
                    ${tier.price}
                    <span className="text-lg text-muted-foreground">/month</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {tier.includes.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  onClick={() => handleSelectTier(tierKey)}
                  className="w-full" 
                  size="lg"
                  variant={isBestValue ? "default" : isMostPopular ? "default" : "outline"}
                >
                  Start Training
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
