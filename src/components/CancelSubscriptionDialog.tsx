import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  full_name: string;
  email: string;
  subscribed_modules: string[];
}

interface CancelSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onSuccess: () => void;
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: CancelSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCancel = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-cancel-user-subscriptions",
        {
          body: { userId: user.id },
        }
      );

      if (error) throw error;

      toast({
        title: "Subscriptions Canceled",
        description: data.message || "All user subscriptions have been canceled.",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error canceling subscriptions:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel subscriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getModuleBadges = () => {
    return user.subscribed_modules.map((module) => {
      const [sport, moduleName] = module.includes("_") 
        ? module.split("_") 
        : ["baseball", module];
      
      const isSoftball = sport.toLowerCase() === "softball";
      
      return (
        <Badge 
          key={module}
          variant={isSoftball ? "secondary" : "default"}
          className={isSoftball ? "bg-pink-500 text-white" : "bg-blue-500 text-white"}
        >
          {sport.charAt(0).toUpperCase() + sport.slice(1)} - {moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}
        </Badge>
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel User Subscriptions
          </DialogTitle>
          <DialogDescription>
            This will immediately cancel all active Stripe subscriptions for this user.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm font-medium mb-1">User:</p>
            <p className="text-sm text-muted-foreground">{user.full_name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Active Modules to Cancel:</p>
            <div className="flex flex-wrap gap-2">
              {user.subscribed_modules.length > 0 ? (
                getModuleBadges()
              ) : (
                <p className="text-sm text-muted-foreground">No active modules</p>
              )}
            </div>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive font-medium">
              ⚠️ This will:
            </p>
            <ul className="text-sm text-destructive mt-2 space-y-1 list-disc list-inside">
              <li>Cancel all active Stripe subscriptions immediately</li>
              <li>Remove all module access</li>
              <li>Update the database to reflect canceled status</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
