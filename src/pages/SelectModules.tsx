import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2, Star, Check } from "lucide-react";
import { TIER_CONFIG, TIER_ORDER } from "@/constants/tiers";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SelectModules = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { modules: subscribedModules, loading: subscriptionLoading } = useSubscription();
  const state = location.state as { sport?: string; mode?: 'add' };
  
  const isAddMode = state?.mode === 'add';
  const [selectedSport, setSelectedSport] = useState<string>(
    state?.sport || localStorage.getItem('selectedSport') || 'baseball'
  );
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user && !isAddMode) navigate("/auth");
  }, [authLoading, user, isAddMode, navigate]);

  const handleContinue = () => {
    if (!selectedTier) return;
    localStorage.setItem('selectedSport', selectedSport);
    navigate("/checkout", { 
      state: { tier: selectedTier, sport: selectedSport } 
    });
  };

  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl">H</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            {isAddMode ? t('selectModules.addModuleTitle') : 'Select Your Training Tier'}
          </h1>
          <p className="text-muted-foreground">
            Choose the tier that matches your training goals
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

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {TIER_ORDER.map((tierKey) => {
            const tier = TIER_CONFIG[tierKey];
            const isSelected = selectedTier === tierKey;
            const isBestValue = tierKey === 'golden2way';
            const isMostPopular = tierKey === '5tool';

            return (
              <Card
                key={tierKey}
                className={`p-6 transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'hover:border-muted-foreground/50'
                } ${isBestValue ? 'border-primary/50' : ''}`}
                onClick={() => setSelectedTier(tierKey)}
              >
                {isMostPopular && (
                  <Badge className="absolute -top-2 right-4 bg-primary text-primary-foreground text-xs">
                    <Star className="h-3 w-3 mr-1" /> Popular
                  </Badge>
                )}
                {isBestValue && (
                  <Badge className="absolute -top-2 right-4 bg-primary text-primary-foreground text-xs">
                    Best Value
                  </Badge>
                )}

                <h3 className="text-xl font-bold mb-1">{tier.displayName}</h3>
                <p className="text-2xl font-bold mb-3">
                  ${tier.price}<span className="text-sm text-muted-foreground">/month</span>
                </p>
                <ul className="space-y-1.5">
                  {tier.includes.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-3 w-3 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-4 max-w-lg mx-auto">
          <Button 
            variant="outline" 
            onClick={() => isAddMode ? navigate("/dashboard") : navigate("/select-sport")}
            className="flex-1"
          >
            ← Back
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!selectedTier}
            className="flex-1"
            size="lg"
          >
            Continue →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SelectModules;
