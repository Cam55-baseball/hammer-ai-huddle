/**
 * ConnectionsStep — invite a parent (safeguarding pathway) and/or link a coach.
 *
 * Server writes are best-effort against existing tables:
 *  - parent_invite_dispatches (email invite record)
 * All fields optional; nothing here blocks progress.
 */
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { writeDraftSlot, readDraftSlot } from "@/lib/onboarding/draftStore";

interface ConnDraft {
  parent_email?: string;
  coach_code?: string;
  invited_at?: string;
}

interface Props { onContinue: () => void; onBack: () => void; }

export function ConnectionsStep({ onContinue, onBack }: Props) {
  const { user } = useAuth();
  const [parentEmail, setParentEmail] = useState("");
  const [coachCode, setCoachCode] = useState("");
  const [inviting, setInviting] = useState(false);
  const [invitedAt, setInvitedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const d = await readDraftSlot<ConnDraft>(user.id, "connections");
      if (!d) return;
      if (d.parent_email) setParentEmail(d.parent_email);
      if (d.coach_code) setCoachCode(d.coach_code);
      if (d.invited_at) setInvitedAt(d.invited_at);
    })();
  }, [user?.id]);

  const persist = (patch: Partial<ConnDraft>) => {
    if (!user?.id) return;
    writeDraftSlot(user.id, "connections", {
      parent_email: parentEmail || undefined,
      coach_code: coachCode || undefined,
      invited_at: invitedAt ?? undefined,
      ...patch,
    });
  };

  const sendParentInvite = async () => {
    if (!user?.id || !parentEmail) return;
    setInviting(true);
    try {
      const now = new Date().toISOString();
      const { error } = await (supabase.from("parent_invite_dispatches") as unknown as {
        insert: (v: unknown) => Promise<{ error: { message: string } | null }>;
      }).insert({
        athlete_id: user.id,
        parent_email: parentEmail,
        status: "pending",
      });
      if (error) throw error;
      setInvitedAt(now);
      persist({ invited_at: now });
      toast.success("Parent invite recorded. They'll get a link to confirm.");
    } catch (e) {
      console.warn("[onboarding] parent invite failed", e);
      toast.warning("Saved invite locally — we'll retry sending later.");
      const now = new Date().toISOString();
      setInvitedAt(now);
      persist({ invited_at: now });
    } finally {
      setInviting(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Connections</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Loop in a parent (required for minors' recruiting features) or a coach.
        You can add these later in Settings — nothing is sent until you tap invite.
      </p>

      <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
        <Label htmlFor="parent-email" className="text-xs font-medium">Parent / guardian email</Label>
        <div className="flex gap-2">
          <Input id="parent-email" type="email" value={parentEmail}
            onChange={(e) => { setParentEmail(e.target.value); persist({ parent_email: e.target.value }); }}
            placeholder="parent@example.com" />
          <Button size="sm" onClick={sendParentInvite} disabled={inviting || !parentEmail}>
            {inviting ? "Sending…" : invitedAt ? "Resend" : "Invite"}
          </Button>
        </div>
        {invitedAt && (
          <p className="text-[11px] text-muted-foreground">
            Invited {new Date(invitedAt).toLocaleString()}
          </p>
        )}
      </div>

      <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
        <Label htmlFor="coach-code" className="text-xs font-medium">Coach / team code (optional)</Label>
        <Input id="coach-code" value={coachCode}
          onChange={(e) => { setCoachCode(e.target.value); persist({ coach_code: e.target.value }); }}
          placeholder="e.g. TIGERS-2026" />
        <p className="text-[11px] text-muted-foreground">
          If your coach shared a team code, we'll link you when you finish onboarding.
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Button>
        <Button onClick={onContinue}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </section>
  );
}
