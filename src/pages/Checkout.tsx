import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const MODULES = [
  { id: "hitting", name: "Hitting", price: 200 },
  { id: "pitching", name: "Pitching", price: 200 },
  { id: "throwing", name: "Throwing", price: 200 },
];

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { modules: subscribedModules, loading: subLoading, refetch } = useSubscription();
  const { toast } = useToast();
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [creatingCheckout, setCreatingCheckout] = useState(false);

  const checkoutStatus = searchParams.get("checkout");

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    // Handle successful checkout
    if (checkoutStatus === "success") {
      toast({
        title: "Subscription Successful!",
        description: "Your subscription has been activated. Refreshing your account...",
      });
      
      // Refresh subscription data
      setTimeout(() => {
        refetch();
        navigate("/dashboard", { replace: true });
      }, 2000);
    } else if (checkoutStatus === "cancelled") {
      toast({
        title: "Checkout Cancelled",
        description: "Your subscription was not completed.",
        variant: "destructive",
      });
    }
  }, [authLoading, user, checkoutStatus, navigate, toast, refetch]);

  const handleToggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleCreateCheckout = async () => {
    if (selectedModules.length === 0) {
      toast({
        title: "No Modules Selected",
        description: "Please select at least one module to subscribe.",
        variant: "destructive",
      });
      return;
    }

    setCreatingCheckout(true);

    try {
      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error || !sessionData.session) throw new Error("Not authenticated");

      const { data, error: invokeError } = await supabase.functions.invoke('create-checkout', {
        body: { modules: selectedModules },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (invokeError) throw invokeError;

      if (data?.url) {
        window.open(data.url, '_blank');
        
        toast({
          title: "Opening Checkout",
          description: "Complete your payment in the new tab. This page will automatically update once your subscription is active.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setCreatingCheckout(false);
    }
  };

  const totalPrice = selectedModules.length * 200;

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Subscribe to Modules</h1>
          <p className="text-muted-foreground text-lg">
            Select the training modules you want to access
          </p>
        </div>

        {subscribedModules.length > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2 text-primary">Currently Subscribed:</h3>
            <div className="flex flex-wrap gap-2">
              {subscribedModules.map((module) => (
                <span key={module} className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm capitalize">
                  {module}
                </span>
              ))}
            </div>
          </div>
        )}

        <Card className="p-8 mb-6">
          <h2 className="text-2xl font-bold mb-6">Select Modules</h2>
          
          <div className="space-y-4 mb-8">
            {MODULES.map((module) => {
              const isSubscribed = subscribedModules.includes(module.id);
              const isSelected = selectedModules.includes(module.id);
              
              return (
                <div
                  key={module.id}
                  className={`border rounded-lg p-4 transition-all ${
                    isSubscribed 
                      ? "border-primary bg-primary/5" 
                      : isSelected 
                      ? "border-primary" 
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={module.id}
                        checked={isSelected}
                        onCheckedChange={() => handleToggleModule(module.id)}
                        disabled={isSubscribed}
                      />
                      <label
                        htmlFor={module.id}
                        className="text-lg font-semibold cursor-pointer"
                      >
                        {module.name}
                        {isSubscribed && (
                          <span className="ml-2 text-sm text-primary font-normal">
                            (Active)
                          </span>
                        )}
                      </label>
                    </div>
                    <span className="text-xl font-bold">${module.price}/mo</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xl font-bold">Total:</span>
              <span className="text-3xl font-bold text-primary">${totalPrice}/month</span>
            </div>

            <Button
              onClick={handleCreateCheckout}
              disabled={selectedModules.length === 0 || creatingCheckout}
              className="w-full"
              size="lg"
            >
              {creatingCheckout ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Checkout...
                </>
              ) : (
                "Proceed to Payment"
              )}
            </Button>
          </div>
        </Card>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
