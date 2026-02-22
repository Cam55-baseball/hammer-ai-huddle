import { useEffect, useState, useRef } from "react";
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
import { Check } from "lucide-react";
import { TIER_CONFIG } from "@/constants/tiers";

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
  const selectedTier = state?.tier || localStorage.getItem('selectedTier') || '';
  const selectedSport = state?.sport || localStorage.getItem('selectedSport') || 'baseball';
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showManualLink, setShowManualLink] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const successHandledRef = useRef(false);

  const tierConfig = selectedTier ? TIER_CONFIG[selectedTier] : null;

  useEffect(() => {
    if (authLoading || ownerLoading || adminLoading) return;

    if (!user) {
      localStorage.setItem('selectedTier', selectedTier);
      localStorage.setItem('selectedSport', selectedSport);
      navigate("/auth", { 
        replace: true,
        state: { returnTo: '/checkout', tier: selectedTier, sport: selectedSport }
      });
      return;
    }

    const status = searchParams.get('status') || searchParams.get('checkout');
    if (status === 'success') {
      if (successHandledRef.current) return;
      successHandledRef.current = true;
      
      toast({
        title: "Payment Successful!",
        description: "Your training tier is now active. Redirecting to dashboard...",
      });
      
      localStorage.setItem('pendingModuleActivation', JSON.stringify({
        module: selectedTier,
        sport: selectedSport,
        timestamp: Date.now()
      }));
      
      refetch();
      navigate("/dashboard", { replace: true });
      return;
    } else if (status === 'cancel' || status === 'cancelled') {
      localStorage.removeItem('pendingModuleActivation');
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. You can try again anytime.",
        variant: "destructive",
      });
    }
  }, [authLoading, ownerLoading, adminLoading, user, navigate, searchParams, refetch, selectedTier, selectedSport]);

  const redirectToStripe = (url: string) => {
    try {
      if (window.top) window.top.location.href = url;
      else window.location.href = url;
    } catch (e) {
      try { window.location.assign(url); } catch (e2) { /* fallback */ }
    }
    setTimeout(() => setShowManualLink(true), 1500);
  };

  const handleCreateCheckout = async () => {
    if (!selectedTier) {
      toast({ title: "No tier selected", description: "Please select a training tier.", variant: "destructive" });
      return;
    }

    setCheckoutLoading(true);
    popupRef.current = window.open('', '_blank', '') || null;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          toast({ title: "Session Expired", description: "Please log in again.", variant: "destructive" });
          navigate("/auth", { state: { returnTo: '/checkout', tier: selectedTier, sport: selectedSport } });
          return;
        }
      }

      if (isOwner || isAdmin) {
        toast({ title: "Full Access Granted", description: "As an owner/admin, you have free access to all tiers." });
        navigate("/dashboard");
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier: selectedTier, sport: selectedSport }
      });

      if (error) throw error;

      if (data?.url) {
        setCheckoutUrl(data.url);
        toast({ title: "Redirecting to Checkout", description: "You'll be redirected to complete your payment..." });
        
        setTimeout(() => setShowManualLink(true), 2000);
        
        if (popupRef.current && !popupRef.current.closed) {
          try {
            popupRef.current.location.href = data.url;
            return;
          } catch (e) {
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
        description: error.message?.includes('Auth session missing') 
          ? "Your session expired. Please refresh and try again."
          : error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

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
          <h2 className="text-2xl font-bold mb-4">{isOwner ? t('subscriptionTiers.ownerAccess') : t('subscriptionTiers.adminAccess')}</h2>
          <p className="text-muted-foreground mb-6">{t('subscriptionTiers.unlimitedAccessMessage')}</p>
          <Button onClick={() => navigate('/dashboard')} className="w-full">{t('subscriptionTiers.goToDashboard')}</Button>
        </Card>
      </div>
    );
  }

  if (!tierConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">{t('subscriptionTiers.noTierSelected')}</h2>
          <p className="text-muted-foreground mb-6">{t('subscriptionTiers.selectTierFromPricing')}</p>
          <Button onClick={() => navigate('/pricing')} className="w-full">{t('subscriptionTiers.viewPricing')}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-2">{t('subscriptionTiers.subscribeTo', { tier: t(`subscriptionTiers.${selectedTier}.name`) })}</h1>
          <p className="text-muted-foreground mb-6">
            {selectedSport === 'softball' ? t('onboarding.softball') : t('onboarding.baseball')} · ${tierConfig.price}{t('subscriptionTiers.perMonth')}
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>{t('subscriptionTiers.havePromoCode')}</strong>
            </p>
          </div>

          <div className="mb-6 p-4 rounded-lg border bg-card">
            <h3 className="font-semibold mb-3">{t('subscriptionTiers.includes', { tier: t(`subscriptionTiers.${selectedTier}.name`) })}</h3>
            <ul className="space-y-2">
              {tierConfig.includes.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">{t('subscriptionTiers.totalPerMonth')}</span>
              <span className="text-2xl font-bold">${tierConfig.price}{t('subscriptionTiers.perMonth')}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{t('subscriptionTiers.billedMonthly')}</p>
          </div>

          {showManualLink && checkoutUrl && (
            <div className="mb-4 p-4 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-100 mb-2">
                {t('subscriptionTiers.notRedirected')}
              </p>
              <Button asChild className="w-full" variant="secondary">
                <a href={checkoutUrl} target="_top" rel="noopener noreferrer">{t('subscriptionTiers.openCheckout')}</a>
              </Button>
            </div>
          )}

          <Button onClick={handleCreateCheckout} disabled={checkoutLoading} className="w-full mb-4" size="lg">
            {checkoutLoading ? t('subscriptionTiers.processing') : t('subscriptionTiers.proceedToPayment')}
          </Button>

          <Button variant="ghost" onClick={() => navigate("/pricing")} className="w-full">
            {t('subscriptionTiers.backToPricing')}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;
