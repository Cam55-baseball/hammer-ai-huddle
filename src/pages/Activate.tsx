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

type TierCopy = {
  tag: string;
  isFeatured?: boolean;
  valueStatement: string;
  outcomes: [string, string, string];
};

const TIER_COPY: Record<string, TierCopy> = {
  pitcher: {
    tag: "For Serious Arms",
    valueStatement: "Own the Mound. Command Every Pitch.",
    outcomes: [
      "Develop elite arm strength and pitch command",
      "Follow a proven system trusted by college-level pitchers",
      "Turn bullpens into game-day dominance",
    ],
  },
  "5tool": {
    tag: "Most Popular",
    isFeatured: true,
    valueStatement: "Train Like a Pro. Compete With Confidence.",
    outcomes: [
      "Build elite-level instincts and decision making",
      "Follow a proven system used by high-level players",
      "Turn practice into game-speed performance",
    ],
  },
  golden2way: {
    tag: "Full System Access",
    valueStatement: "Everything You Need to Separate Yourself.",
    outcomes: [
      "Master both sides of the game with one system",
      "Train with the same framework as elite two-way players",
      "Compound every rep into long-term separation",
    ],
  },
};

const Activate = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useUserProfile();
  const { modules, loading: subLoading, initialized } = useSubscription();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const { toast } = useToast();

  const sport = (localStorage.getItem("selectedSport") as "baseball" | "softball") || "baseball";

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
      // Non-fatal analytics field
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
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Activate your access
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Choose Your Access
          </h1>
          <p className="text-muted-foreground mt-3 text-base">
            Get full access instantly or continue with free tools. Upgrade anytime.
          </p>
        </header>

        <div className="space-y-5 md:space-y-6">
          {TIER_ORDER.map((tierKey) => {
            const tier = TIER_CONFIG[tierKey];
            const copy = TIER_COPY[tierKey];
            const featured = !!copy.isFeatured;
            return (
              <Card
                key={tierKey}
                className={`p-6 transition-all hover:shadow-xl ${
                  featured
                    ? "ring-2 ring-primary border-primary/40 bg-primary/[0.03] md:scale-[1.03] shadow-lg"
                    : "hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-xl font-bold">{tier.displayName}</h3>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap ${
                      featured
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {copy.tag}
                  </span>
                </div>

                <p className="text-lg sm:text-xl font-bold leading-snug text-foreground mt-2 mb-4">
                  {copy.valueStatement}
                </p>

                <ul className="space-y-2 mb-5">
                  {copy.outcomes.map((outcome, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/85">
                      <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold">${tier.price}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  variant={featured ? "default" : "default"}
                  onClick={() => handlePickTier(tierKey)}
                >
                  Unlock Full Access
                </Button>
                <p className="text-[11px] text-muted-foreground text-center mt-2">
                  Secure checkout. Promotions applied at checkout.
                </p>
              </Card>
            );
          })}

          {/* Free option — visually minimized, still intentional */}
          <Card className="p-5 bg-muted/40 border-border/60 shadow-none">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h3 className="text-base font-semibold text-muted-foreground">Free Access</h3>
            </div>
            <p className="text-sm font-medium text-foreground/80 mb-3">
              Start with the fundamentals
            </p>
            <ul className="space-y-1.5 mb-4">
              {[
                "Access select training content",
                "Get familiar with the system",
                "Upgrade anytime for full access",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleContinueFree}
            >
              Continue Free
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Activate;
