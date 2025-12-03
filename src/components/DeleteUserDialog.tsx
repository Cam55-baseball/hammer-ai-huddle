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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle } from "lucide-react";

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onSuccess: () => void;
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: DeleteUserDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const { toast } = useToast();

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast({
        title: t('deleteUserDialog.confirmationRequired'),
        description: t('deleteUserDialog.pleaseTypeDelete'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userId: user.id },
      });

      if (error) throw error;

      toast({
        title: t('deleteUserDialog.accountDeleted'),
        description: t('deleteUserDialog.accountDeletedDescription', { name: user.full_name }),
      });

      setConfirmText("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('deleteUserDialog.failedToDelete'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('deleteUserDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('deleteUserDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm font-medium mb-1">{t('deleteUserDialog.userToDelete')}</p>
            <p className="text-sm text-muted-foreground">{user.full_name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
            <p className="text-sm text-destructive font-medium mb-2">
              {t('deleteUserDialog.warningTitle')}
            </p>
            <ul className="text-sm text-destructive space-y-1 list-disc list-inside">
              <li>{t('deleteUserDialog.warningItem1')}</li>
              <li>{t('deleteUserDialog.warningItem2')}</li>
              <li>{t('deleteUserDialog.warningItem3')}</li>
              <li>{t('deleteUserDialog.warningItem4')}</li>
              <li>{t('deleteUserDialog.warningItem5')}</li>
              <li>{t('deleteUserDialog.warningItem6')}</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-destructive font-medium">
              {t('deleteUserDialog.confirmLabel')}
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="border-destructive focus:ring-destructive"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setConfirmText("");
              onOpenChange(false);
            }}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || confirmText !== "DELETE"}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('deleteUserDialog.deleteAccountPermanently')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}