/**
 * Danger zone — self-service account deletion (Apple Guideline 5.1.1(v)).
 * Lives at the bottom of the profile page. Owner/admin accounts are blocked
 * both here and inside the `delete-account` edge function.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  userId: string;
  /** True when the signed-in account holds the owner or admin role. */
  isStaff: boolean;
  /** True when the account currently has an active paid subscription. */
  hasActiveSubscription: boolean;
}

export function DeleteAccountSection({ userId, isStaff, hasActiveSubscription }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkedAthletes, setLinkedAthletes] = useState(0);
  const [linkedToOthers, setLinkedToOthers] = useState(false);
  const { toast } = useToast();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [asParent, asAthlete] = await Promise.all([
        supabase
          .from("parent_athlete_links")
          .select("id", { count: "exact", head: true })
          .eq("parent_user_id", userId)
          .eq("status", "accepted"),
        supabase
          .from("parent_athlete_links")
          .select("id", { count: "exact", head: true })
          .eq("athlete_user_id", userId)
          .eq("status", "accepted"),
      ]);
      if (cancelled) return;
      setLinkedAthletes(asParent.count ?? 0);
      setLinkedToOthers((asAthlete.count ?? 0) > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      try {
        await signOut();
      } catch {
        /* the account is already gone; sign-out failures are not fatal */
      }
      navigate("/account-deleted", { replace: true });
    } catch (error) {
      console.error("Account deletion failed:", error);
      toast({
        title: "Account not deleted",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Your account is unchanged — please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 mt-6 border-destructive/40">
      <h3 className="text-xl font-bold mb-1 text-destructive flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        Danger zone
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Permanently delete your account and everything in it. This cannot be undone.
      </p>

      {isStaff ? (
        <p className="text-sm text-muted-foreground">
          Owner and admin accounts cannot be deleted from the app, so the app can never be
          locked out of its own administration. Remove the admin role first, or ask another
          owner to remove this account.
        </p>
      ) : (
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (loading) return;
          setOpen(next);
          if (!next) setConfirmText("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete my account
            </DialogTitle>
            <DialogDescription>
              This permanently deletes your account. It cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <p className="text-sm text-destructive font-medium mb-2">
                The following will be deleted permanently:
              </p>
              <ul className="text-sm text-destructive space-y-1 list-disc list-inside">
                <li>Your profile and account details</li>
                <li>Your uploaded videos and video notes</li>
                <li>Your report cards and grades</li>
                <li>Your training history and logged sessions</li>
                <li>Any saved plans, drills and preferences</li>
              </ul>
            </div>

            {hasActiveSubscription && (
              <div className="rounded-md border p-3">
                <p className="text-sm font-medium mb-1">Your subscription</p>
                <p className="text-sm text-muted-foreground">
                  Your active subscription will be cancelled as part of this deletion.
                  Deleting your account does not automatically refund you for the current
                  or any past billing period.
                </p>
              </div>
            )}

            {linkedAthletes > 0 && (
              <div className="rounded-md border p-3">
                <p className="text-sm font-medium mb-1">
                  {linkedAthletes === 1
                    ? "1 linked athlete"
                    : `${linkedAthletes} linked athletes`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Their accounts and data will not be deleted. They will simply be unlinked
                  from you, and will keep everything they have recorded.
                </p>
              </div>
            )}

            {linkedToOthers && (
              <div className="rounded-md border p-3">
                <p className="text-sm font-medium mb-1">Linked parent or coach</p>
                <p className="text-sm text-muted-foreground">
                  Your links to any parent or coach will be removed. Their own accounts are
                  not affected.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="delete-account-confirm" className="text-destructive font-medium">
                Type DELETE to confirm
              </Label>
              <Input
                id="delete-account-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                className="border-destructive focus:ring-destructive"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Keep my account
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || confirmText !== "DELETE"}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete my account permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
