import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        title: t('cancelSubscriptionDialog.subscriptionsCanceled'),
        description: data.message || t('cancelSubscriptionDialog.allSubscriptionsCanceled'),
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error canceling subscriptions:", error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('cancelSubscriptionDialog.failedToCancel'),
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
            {t('cancelSubscriptionDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('cancelSubscriptionDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm font-medium mb-1">{t('cancelSubscriptionDialog.user')}</p>
            <p className="text-sm text-muted-foreground">{user.full_name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">{t('cancelSubscriptionDialog.activeModulesToCancel')}</p>
            <div className="flex flex-wrap gap-2">
              {user.subscribed_modules.length > 0 ? (
                getModuleBadges()
              ) : (
                <p className="text-sm text-muted-foreground">{t('cancelSubscriptionDialog.noActiveModules')}</p>
              )}
            </div>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive font-medium">
              {t('cancelSubscriptionDialog.warningTitle')}
            </p>
            <ul className="text-sm text-destructive mt-2 space-y-1 list-disc list-inside">
              <li>{t('cancelSubscriptionDialog.warningItem1')}</li>
              <li>{t('cancelSubscriptionDialog.warningItem2')}</li>
              <li>{t('cancelSubscriptionDialog.warningItem3')}</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('cancelSubscriptionDialog.confirmCancellation')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}