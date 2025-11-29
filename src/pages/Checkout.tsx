import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

const MODULE_PRICE = 200;

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, session, loading: authLoading } = useAuth();
  const { modules: subscribedModules, refetch, loading: subLoading } = useSubscription();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const { toast } = useToast();
  const state = location.state as { module?: string; sport?: string; returnTo?: string };
  const selectedModule = state?.module || localStorage.getItem('selectedModule');
  const selectedSport = state?.sport || localStorage.getItem('selectedSport') || 'baseball';
  const returnTo = state?.returnTo;
  const isAddMode = returnTo === '/dashboard';
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    // PRIORITY 1: Check for payment success params FIRST (before auth checks)
    const status = searchParams.get('status') || searchParams.get('checkout');
    const sessionId = searchParams.get('session_id');
    
    if (status === 'success' && sessionId) {
      console.log('Checkout: Payment successful, verifying payment...', { sessionId });
      
      const verifyPayment = async () => {
        try {
          toast({
            title: "Verifying Payment",
            description: "Please wait while we activate your modules...",
          });

          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { sessionId },
          });

          if (error) {
            console.error('Checkout: Verification error:', error);
            toast({
              title: "Verification Failed",
              description: "Please refresh the page or contact support if modules don't appear.",
              variant: "destructive",
            });
            return;
          }

          if (data?.success) {
            console.log('Checkout: Payment verified successfully:', data);
            
            const moduleList = data.modules.join(', ');
            let successMessage = `Modules activated: ${moduleList}`;
            
            if (data.coupon) {
              successMessage += `\nDiscount applied: ${data.coupon.discount}% off`;
            }
            
            toast({
              title: "Payment Successful!",
              description: successMessage,
            });
            
            // Refresh session and subscription
            await supabase.auth.refreshSession();
            await refetch();
            
            // Clear URL params
            setSearchParams({});
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => navigate('/dashboard'), 2000);
          } else {
            toast({
              title: "Verification Failed",
              description: "Please contact support if your modules don't appear.",
              variant: "destructive",
            });
          }
        } catch (err) {
          console.error('Checkout: Verification exception:', err);
          toast({
            title: "Verification Error",
            description: "Please refresh the page or contact support.",
            variant: "destructive",
          });
        }
      };

      verifyPayment();
      return; // Stop here, don't do auth checks yet
    }
    
    // Handle cancelled payment
    if (status === 'cancel' || status === 'cancelled') {
      console.log('Checkout: Payment cancelled');
      localStorage.removeItem('pendingModuleActivation');
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. You can try again anytime.",
        variant: "destructive",
      });
      setSearchParams({});
      return;
    }

    // PRIORITY 2: Now check auth status for other flows
    if (authLoading || ownerLoading || adminLoading) {
      console.log('Checkout: Still loading...', { authLoading, ownerLoading, adminLoading });
      return;
    }

    // Only redirect to auth if we're CERTAIN the user is not logged in
    if (!user) {
      console.log('Checkout: No user found, redirecting to auth');
      // Save state for return
      localStorage.setItem('selectedModule', selectedModule || '');
      localStorage.setItem('selectedSport', selectedSport);
      navigate("/auth", { 
        replace: true,
        state: {
          returnTo: '/checkout',
          module: selectedModule,
          sport: selectedSport,
          mode: isAddMode ? 'add' : 'new'
        }
      });
      return;
    }
  }, [authLoading, ownerLoading, adminLoading, user, navigate, searchParams, toast, refetch, isAddMode, selectedModule, selectedSport, session, setSearchParams]);


  const handleCreateCheckout = async () => {
    if (!selectedModule) {
      toast({
        title: "No module selected",
        description: "Please select a module to continue.",
        variant: "destructive",
      });
      return;
    }

    setCheckoutLoading(true);

    try {
      // Refresh session to ensure valid token before checkout
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (!sessionData.session || sessionError) {
        console.log('Checkout: Session invalid, attempting refresh...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          toast({
            title: "Session Expired",
            description: "Please log in again to continue.",
            variant: "destructive",
          });
          navigate("/auth", { 
            state: { 
              returnTo: '/checkout',
              module: selectedModule,
              sport: selectedSport
            }
          });
          return;
        }
      }

      if (isOwner || isAdmin) {
        toast({
          title: "Full Access Granted",
          description: "As an owner/admin, you have free access to all modules.",
        });
        navigate("/dashboard");
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          modules: [selectedModule],
          sport: selectedSport
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Save state before redirect so we can return properly
        localStorage.setItem('checkoutReturnUrl', window.location.pathname);
        localStorage.setItem('checkoutModule', selectedModule);
        localStorage.setItem('checkoutSport', selectedSport);
        
        toast({
          title: "Redirecting to Checkout",
          description: "You'll be redirected to complete your payment...",
        });
        
        // Direct redirect to Stripe
        console.log('Checkout: Redirecting to Stripe URL', data.url);
        window.location.href = data.url;
        return;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      
      const errorMsg = error.message || "Failed to create checkout session";
      toast({
        title: "Checkout Failed",
        description: errorMsg.includes('Auth session missing') 
          ? "Your session expired. Please refresh the page and try again."
          : errorMsg,
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
          <h2 className="text-2xl font-bold mb-4">{isOwner ? 'Owner' : 'Admin'} Access</h2>
          <p className="text-muted-foreground mb-6">
            You have unlimited access to all modules without any payment required.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="w-full">
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-4">
            {isAddMode ? 'Add Training Module' : 'Subscribe to Training Module'}
          </h1>
          <p className="text-muted-foreground mb-4">
            {isAddMode 
              ? 'Review and confirm your new module subscription' 
              : 'Review and confirm your first module subscription'}
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Have a promo code?</strong> You'll be able to apply it during checkout. 
              Discounts (including 100% off codes) will be reflected in your final billing.
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              📌 <strong>Important:</strong> After purchasing your module click 'Back to dashboard' button or sign back in to access your new modules.
            </p>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Selected Module</h2>
            <div className="p-4 rounded-lg border border-primary bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">{selectedModule} Analysis</p>
                  <p className="text-sm text-muted-foreground">${MODULE_PRICE}/month</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>

          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold">${MODULE_PRICE}/month</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Billed monthly, cancel anytime
            </p>
          </div>


          <Button 
            onClick={handleCreateCheckout}
            disabled={!selectedModule || checkoutLoading}
            className="w-full mb-4"
            size="lg"
          >
            {checkoutLoading ? "Processing..." : "Proceed to Payment"}
          </Button>

          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="w-full">
            ← Back to Dashboard
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;
