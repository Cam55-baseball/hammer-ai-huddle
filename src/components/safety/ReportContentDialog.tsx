/**
 * Apple Guideline 1.2 — report a user or a piece of content.
 */
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "sexual_content", label: "Sexual content" },
  { value: "violence", label: "Violence or threats" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "spam", label: "Spam" },
  { value: "unauthorized_video", label: "Someone else's video used without permission" },
  { value: "other", label: "Other" },
];

export const REPORT_REASON_LABELS: Record<string, string> = Object.fromEntries(
  REPORT_REASONS.map((r) => [r.value, r.label]),
);

export interface ReportTarget {
  /** The user who owns the content, or the user being reported. */
  reportedUserId?: string | null;
  /** e.g. "video", "shared_report", "shared_activity", "profile" */
  contentType: string;
  contentId?: string | null;
  /** Shown in the dialog so the person knows what they are reporting. */
  label?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ReportTarget;
}

export function ReportContentDialog({ open, onOpenChange, target }: Props) {
  const { user } = useAuth();
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!user?.id || !reason) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("content_reports").insert({
        reporter_id: user.id,
        reported_user_id: target.reportedUserId ?? null,
        content_type: target.contentType,
        content_id: target.contentId ?? null,
        reason,
        details: details.trim() || null,
      });
      if (error) throw error;

      toast.success("Report sent", {
        description: "Thanks for telling us. We review every report within 24 hours.",
      });
      setReason("");
      setDetails("");
      onOpenChange(false);
    } catch (e) {
      console.warn("[safety] report failed", e);
      toast.error("We could not send that report", {
        description: "Check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report {target.label ?? "this"}</DialogTitle>
          <DialogDescription>
            Tell us what is wrong. We review every report within 24 hours and remove content and
            accounts that break the rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Why are you reporting this?</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-1">
              {REPORT_REASONS.map((r) => (
                <div key={r.value} className="flex items-center gap-2">
                  <RadioGroupItem value={r.value} id={`report-${r.value}`} />
                  <Label htmlFor={`report-${r.value}`} className="text-sm font-normal">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-details">Anything else? (optional)</Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add anything that helps us understand."
              rows={3}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!reason || submitting}>
            {submitting ? "Sending…" : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
