import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { TIER_CONFIG, TIER_ORDER } from "@/constants/tiers";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Activate = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useUserProfile();
  const { modules, loading: subLoading, initialized } = useSubscription();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const { toast } = useToast();

  const sport = (localStorage.getItem("selectedSport") as "baseball" | "softball") || "baseball";

  // Guard: redirect users who shouldn't see this screen
  useEffect(() => {
    if (authLoading || profileLoading || subLoading || ownerLoading || adminLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (isOwner || isAdmin) {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (initialized && modules.length > 0) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, profileLoading, subLoading, ownerLoading, adminLoading, user, isOwner, isAdmin, initialized, modules, navigate]);

  const recordChoice = async (choice: "paid" | "free") => {
    try {
      await updateProfile({ activation_choice: choice });
    } catch {
      // Non-fatal; analytics field
    }
  };

  const handlePickTier = async (tierKey: string) => {
    await recordChoice("paid");
    localStorage.setItem("selectedTier", tierKey);
    localStorage.setItem("selectedSport", sport);
    navigate("/checkout", { state: { tier: tierKey, sport } });
  };

  const handleContinueFree = async () => {
    await recordChoice("free");
    if (user) {
      await supabase
        .from("subscriptions")
        .upsert({ user_id: user.id, plan: "free", status: "active" }, { onConflict: "user_id" });
    }
    toast({
      title: "Free access enabled",
      description: "Upgrade anytime from your dashboard.",
    });
    navigate("/dashboard", { replace: true });
  };

  if (authLoading || profileLoading || ownerLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Activate your access
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Choose Your Access
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            Unlock full access instantly or continue with free tools. Upgrade anytime.
          </p>
        </header>

        <div className="space-y-4">
          {TIER_ORDER.map((tierKey) => {
            const tier = TIER_CONFIG[tierKey];
            const isFeatured = tierKey === "5tool";
            return (
              <Card
                key={tierKey}
                className={`p-5 cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 ${
                  isFeatured ? "border-primary/40 bg-primary/[0.02]" : ""
                }`}
                onClick={() => handlePickTier(tierKey)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold">{tier.displayName}</h3>
                      {isFeatured && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                          Most Popular
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1 mt-2">
                      {tier.includes.slice(0, 3).map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          <span className="truncate">{f}</span>
                        </li>
                      ))}
                      {tier.includes.length > 3 && (
                        <li className="text-xs text-muted-foreground/70 pl-5">
                          +{tier.includes.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold">${tier.price}</div>
                    <div className="text-xs text-muted-foreground">/month</div>
                  </div>
                </div>
                <Button className="w-full mt-4" size="sm">
                  Unlock Full Access
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>All discounts and promotions are securely applied at checkout.</span>
        </div>

        <div className="mt-8 pt-6 border-t border-border/60 text-center">
          <button
            onClick={handleContinueFree}
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
          >
            Continue with Free Access →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Activate;
