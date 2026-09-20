/**
 * Step 13 Part C — "Something's off".
 *
 * One tap files a note with a snapshot of today's card and, if the athlete
 * wants, a sentence in their own words. The note carries the athlete's id and
 * nothing else about them.
 */
import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type CardSnapshotItem = {
  slot?: string | null;
  movement_slug?: string | null;
  movement_name?: string | null;
  sets?: number | null;
  reps?: number | null;
  cns_cost?: number | null;
};

export function WkSomethingOff({
  planDate,
  items,
}: {
  planDate: string;
  items: CardSnapshotItem[];
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!user?.id) return;
    setBusy(true);
    const snapshot = items.slice(0, 40).map((i) => ({
      slot: i.slot ?? null,
      slug: i.movement_slug ?? null,
      name: i.movement_name ?? null,
      sets: i.sets ?? null,
      reps: i.reps ?? null,
      cns_cost: i.cns_cost ?? null,
    }));
    const { error } = await supabase.from("ti_watch_notes").insert({
      severity: "info",
      category: "athlete_report",
      user_id: user.id,
      title: "An athlete flagged today's card",
      detail: { plan_date: planDate, card: snapshot, athlete_note: text.trim() || null },
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not send that", description: error.message, variant: "destructive" });
      return;
    }
    setText("");
    setOpen(false);
    toast({ title: "Thanks — we're looking at it" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground underline underline-offset-2"
        >
          <Flag className="h-3 w-3" />
          Something's off
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Something's off with today?</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          We'll send today's session with your message. Nothing else about you goes with it.
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell us in a sentence (optional)"
          className="text-sm"
        />
        <Button onClick={send} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send
        </Button>
      </DialogContent>
    </Dialog>
  );
}
