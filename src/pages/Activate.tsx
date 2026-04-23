import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";
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
  const firstName = profile?.first_name || "";

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

  const recordChoice = async (choice: "paid" | "free" | "deferred") => {
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

  const handleStartFree = async () => {
    await recordChoice("free");
    // Free subscription was already created by the create_free_subscription trigger.
    // Just confirm and route.
    if (user) {
      await supabase
        .from("subscriptions")
        .upsert({ user_id: user.id, plan: "free", status: "active" }, { onConflict: "user_id" });
    }
    toast({
      title: "You're in — 7-day free trial active",
      description: "Explore the dashboard. Upgrade anytime.",
    });
    navigate("/dashboard", { replace: true });
  };

  const handleDecideLater = async () => {
    await recordChoice("deferred");
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
            Final step
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            You're set{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            Pick how you want to train. You can change anytime.
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
                          Popular
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
                  Choose {tier.displayName}
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 p-5 rounded-lg border border-dashed border-border bg-card/50 text-center">
          <p className="text-sm font-medium mb-2">Not ready to commit?</p>
          <Button variant="secondary" onClick={handleStartFree} className="w-full sm:w-auto">
            Start free for 7 days
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Limited features. Upgrade anytime from your dashboard.
          </p>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={handleDecideLater}
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            I'll decide later
          </button>
        </div>
      </div>
    </div>
  );
};

export default Activate;
