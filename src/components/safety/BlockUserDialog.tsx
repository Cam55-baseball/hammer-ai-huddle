/**
 * Apple Guideline 1.2 — block another user.
 */
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { blockUser } from "@/lib/safety/blocks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockedUserId: string;
  displayName?: string;
  onBlocked?: () => void;
}

export function BlockUserDialog({
  open,
  onOpenChange,
  blockedUserId,
  displayName,
  onBlocked,
}: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const who = displayName || "this person";

  async function confirm() {
    if (!user?.id) return;
    setBusy(true);
    try {
      await blockUser(user.id, blockedUserId);
      toast.success(`${displayName ?? "User"} blocked`, {
        description: "Any link between you has been removed. You can undo this in relationship settings.",
      });
      onBlocked?.();
      onOpenChange(false);
    } catch (e) {
      console.warn("[safety] block failed", e);
      toast.error("We could not block that person", {
        description: "Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Block {who}?</DialogTitle>
          <DialogDescription>Here is what happens when you block someone.</DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 text-sm text-muted-foreground [&>li]:ml-5 [&>li]:list-disc">
          <li>Any parent, coach, or scout link between you is removed.</li>
          <li>Neither of you can see the other's profile or shared content.</li>
          <li>Neither of you can send the other a new link or invite.</li>
          <li>You can undo this any time from Blocked users in relationship settings.</li>
        </ul>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={busy}>
            {busy ? "Blocking…" : "Block"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
