import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import { TIER_CONFIG, TIER_ORDER } from "@/constants/tiers";
import { conversionCopy } from "@/demo/prescriptions/conversionCopy";
import { getDemoAbVariant, tierForVariant } from "@/lib/demoAbVariant";

const SIM_LABEL: Record<string, string> = {
  hitting: "hitting",
  program: "training program",
  vault: "performance history",
};

const Checkout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, session, loading: authLoading } = useAuth();
  const { modules: subscribedModules, refetch, loading: subLoading } = useSubscription();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const { toast } = useToast();
  const state = location.state as { tier?: string; sport?: string };

  // Demo context from query params
  const fromSlug = searchParams.get("from") ?? "";
  const isFromDemo = fromSlug !== "" || searchParams.get("prefill") !== null;
  const simId = searchParams.get("sim") ?? searchParams.get("prefill") ?? "";
  const reason = (searchParams.get("reason") as "minor" | "moderate" | "critical") || "moderate";
  const gap = searchParams.get("gap") ?? "";
  const pct = parseInt(searchParams.get("pct") ?? "0", 10) || 0;
  const yourValue = searchParams.get("your") ?? "";
  const eliteValue = searchParams.get("elite") ?? "";
  const projected = searchParams.get("projected") ?? "";

  const abVariant = useMemo(() => getDemoAbVariant(user?.id ?? null), [user?.id]);
  const recommendedTier = isFromDemo ? tierForVariant(abVariant) : "golden2way";

  const initialTier =
    state?.tier || localStorage.getItem("selectedTier") || (isFromDemo ? recommendedTier : "");
  const [selectedTier, setSelectedTier] = useState<string>(initialTier);
  const selectedSport = state?.sport || localStorage.getItem("selectedSport") || "baseball";
  const [showOtherOptions, setShowOtherOptions] = useState(false);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showManualLink, setShowManualLink] = useState(false);
  const [showSuccessState, setShowSuccessState] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const successHandledRef = useRef(false);
  const attemptIdRef = useRef<string | null>(null);

  const tierConfig = selectedTier ? TIER_CONFIG[selectedTier] : null;
  const dailyPrice = tierConfig ? Math.ceil(tierConfig.price / 30) : 0;

  const copy = useMemo(
    () => (isFromDemo ? conversionCopy(simId || "hitting", reason, gap, { pct }) : null),
    [isFromDemo, simId, reason, gap, pct],
  );
  const simLabel = SIM_LABEL[simId] ?? "performance";

  useEffect(() => {
    if (authLoading || ownerLoading || adminLoading) return;

    if (!user) {
      localStorage.setItem("selectedTier", selectedTier);
      localStorage.setItem("selectedSport", selectedSport);
      navigate("/auth", {
        replace: true,
        state: { returnTo: `/checkout${location.search}`, tier: selectedTier, sport: selectedSport },
      });
      return;
    }

    const status = searchParams.get("status") || searchParams.get("checkout");
    if (status === "success") {
      if (successHandledRef.current) return;
      successHandledRef.current = true;

      toast({
        title: "Access unlocked",
        description: "Your training tier is now active.",
      });

      localStorage.setItem(
        "pendingModuleActivation",
        JSON.stringify({
          module: selectedTier,
          sport: selectedSport,
          timestamp: Date.now(),
        }),
      );

      // Mark abandonment row as completed
      const stripeSessionId = searchParams.get("session_id");
      if (stripeSessionId) {
        void supabase
          .from("checkout_attempts")
          .update({ completed_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("stripe_session_id", stripeSessionId);
      }

      refetch();
      setShowSuccessState(true);
      // Phase 6: post-checkout continuity
      setTimeout(() => {
        const ctx = simId || searchParams.get("sim") || "";
        const dest = ctx
          ? `/select-modules?context=${encodeURIComponent(ctx)}&from=demo${gap ? `&gap=${encodeURIComponent(gap)}` : ""}`
          : "/dashboard";
        navigate(dest, { replace: true });
      }, 800);
      return;
    } else if (status === "cancel" || status === "cancelled") {
      localStorage.removeItem("pendingModuleActivation");
      toast({
        title: "Checkout cancelled",
        description: "No charge was made. Choose a tier to continue.",
      });
      navigate("/activate", { replace: true });
      return;
    }
  }, [authLoading, ownerLoading, adminLoading, user, navigate, searchParams, refetch, selectedTier, selectedSport, simId, gap, location.search, toast]);

  const redirectToStripe = (url: string) => {
    try {
      if (window.top) window.top.location.href = url;
      else window.location.href = url;
    } catch {
      try {
        window.location.assign(url);
      } catch {
        /* fallback */
      }
    }
    setTimeout(() => setShowManualLink(true), 1500);
  };

  const handleCreateCheckout = async () => {
    if (!selectedTier) {
      toast({ title: "No tier selected", description: "Please select a training tier.", variant: "destructive" });
      return;
    }

    setCheckoutLoading(true);
    popupRef.current = window.open("", "_blank", "") || null;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          toast({ title: "Session Expired", description: "Please log in again.", variant: "destructive" });
          navigate("/auth", { state: { returnTo: "/checkout", tier: selectedTier, sport: selectedSport } });
          return;
        }
      }

      if (isOwner || isAdmin) {
        toast({ title: "Full Access Granted", description: "As an owner/admin, you have free access to all tiers." });
        navigate("/dashboard");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          tier: selectedTier,
          sport: selectedSport,
          simId: simId || undefined,
          severity: reason,
          gap: gap || undefined,
          pct: pct || undefined,
          from: fromSlug || undefined,
          abVariant: isFromDemo ? abVariant : undefined,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Phase 7: capture checkout attempt
        if (user) {
          const { data: inserted } = await supabase
            .from("checkout_attempts")
            .insert({
              user_id: user.id,
              email: user.email ?? null,
              tier: selectedTier,
              sport: selectedSport,
              sim_id: simId || null,
              severity: reason || null,
              gap: gap || null,
              pct: pct || null,
              from_slug: fromSlug || null,
              ab_variant: isFromDemo ? abVariant : null,
              stripe_session_id: data.sessionId ?? null,
            })
            .select("id")
            .single();
          if (inserted) attemptIdRef.current = inserted.id;
        }

        setCheckoutUrl(data.url);
        toast({ title: "Redirecting to Checkout", description: "You'll be redirected to complete your payment..." });

        setTimeout(() => setShowManualLink(true), 2000);

        if (popupRef.current && !popupRef.current.closed) {
          try {
            popupRef.current.location.href = data.url;
            return;
          } catch {
            popupRef.current.close();
          }
        }
        redirectToStripe(data.url);
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
      toast({
        title: "Checkout Failed",
        description: error.message?.includes("Auth session missing")
          ? "Your session expired. Please refresh and try again."
          : error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (showSuccessState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-background to-muted/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-6" />
        <h2 className="text-xl font-semibold text-foreground">Access unlocked.</h2>
        <p className="text-sm text-muted-foreground mt-1">Building your system…</p>
      </div>
    );
  }

  if (authLoading || subLoading || ownerLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isOwner || isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">{isOwner ? t("subscriptionTiers.ownerAccess") : t("subscriptionTiers.adminAccess")}</h2>
          <p className="text-muted-foreground mb-6">{t("subscriptionTiers.unlimitedAccessMessage")}</p>
          <Button onClick={() => navigate("/dashboard")} className="w-full">
            {t("subscriptionTiers.goToDashboard")}
          </Button>
        </Card>
      </div>
    );
  }

  if (!tierConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">{t("subscriptionTiers.noTierSelected")}</h2>
          <p className="text-muted-foreground mb-6">{t("subscriptionTiers.selectTierFromPricing")}</p>
          <Button onClick={() => navigate("/pricing")} className="w-full">
            {t("subscriptionTiers.viewPricing")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-4">
        {/* Phase 1: Contextual demo header */}
        {isFromDemo && copy && (
          <Card className="border-primary/40 bg-gradient-to-b from-primary/10 to-transparent p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1">
              You're unlocking your {simLabel} system
            </p>
            <h2 className="text-lg font-black leading-tight mb-3">{copy.headline}</h2>
            <div className="flex flex-wrap gap-2">
              {gap && (
                <span className="rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                  Fix your {gap} gap
                </span>
              )}
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Close your {reason} performance gap
              </span>
              {projected && (
                <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold">
                  Projected: {projected}
                </span>
              )}
            </div>
            {(yourValue || eliteValue) && (
              <p className="mt-3 text-xs text-muted-foreground">
                {yourValue && <>Your result: <strong className="text-foreground">{yourValue}</strong></>}
                {yourValue && eliteValue && " · "}
                {eliteValue && <>Elite: <strong className="text-foreground">{eliteValue}</strong></>}
              </p>
            )}
          </Card>
        )}

        <Card className="p-8">
          {/* Phase 2: Single recommended plan */}
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Recommended for you based on your result
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-1">
            {t("subscriptionTiers.subscribeTo", { tier: t(`subscriptionTiers.${selectedTier}.name`) })}
          </h1>
          <p className="text-xs text-muted-foreground mb-5">Most athletes who hit your gap choose this.</p>

          {/* Phase 3: Price presentation */}
          <div className="mb-5 rounded-lg border bg-card p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black">${tierConfig.price}</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cancel anytime</p>
            <p className="text-sm font-semibold text-primary mt-2">
              Less than ${dailyPrice} per day to fix this gap
            </p>
          </div>

          <div className="mb-5 p-4 rounded-lg border bg-muted/30">
            <h3 className="font-semibold mb-3 text-sm">
              {t("subscriptionTiers.includes", { tier: t(`subscriptionTiers.${selectedTier}.name`) })}
            </h3>
            <ul className="space-y-2">
              {tierConfig.includes.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {showManualLink && checkoutUrl && (
            <div className="mb-4 p-4 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-100 mb-2">
                {t("subscriptionTiers.notRedirected")}
              </p>
              <Button asChild className="w-full" variant="secondary">
                <a href={checkoutUrl} target="_top" rel="noopener noreferrer">
                  {t("subscriptionTiers.openCheckout")}
                </a>
              </Button>
            </div>
          )}

          <Button onClick={handleCreateCheckout} disabled={checkoutLoading} className="w-full mb-3" size="lg">
            {checkoutLoading ? t("subscriptionTiers.processing") : t("subscriptionTiers.proceedToPayment")}
          </Button>

          {/* Phase 4: Risk reversal */}
          <div className="mb-3 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-bold">7-day performance guarantee</p>
              <p className="text-xs text-muted-foreground">
                If you don't see measurable progress, we'll refund you.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowOtherOptions((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center"
          >
            {showOtherOptions ? "Hide other options" : "See other options"}
          </button>

          {showOtherOptions && (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {TIER_ORDER.map((tk) => {
                const tc = TIER_CONFIG[tk];
                const isActive = selectedTier === tk;
                return (
                  <button
                    key={tk}
                    type="button"
                    onClick={() => setSelectedTier(tk)}
                    className={`rounded-md border p-3 text-left transition ${
                      isActive ? "border-primary bg-primary/10" : "hover:bg-muted/40"
                    }`}
                  >
                    <p className="text-xs font-bold">{tc.displayName}</p>
                    <p className="text-lg font-black">${tc.price}<span className="text-[10px] font-normal text-muted-foreground">/mo</span></p>
                  </button>
                );
              })}
            </div>
          )}

          <Button variant="ghost" onClick={() => navigate("/pricing")} className="w-full mt-3 text-xs">
            {t("subscriptionTiers.backToPricing")}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;
