/**
 * Roadmap 7c — Report a Problem. The report is always saved first; the email
 * to the owner is sent (and retried) separately, so a broken email never loses a report.
 */
import { useState } from "react";
import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function ReportProblemButton({ className }: { className?: string }) {
  const { user } = useOptionalAuth();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const submit = async () => {
    const message = msg.trim().slice(0, 4000);
    if (!message) return;
    setBusy(true);
    const { error } = await supabase.from("problem_reports").insert({
      user_id: user.id, message, page: window.location.pathname,
      app_info: { ua: navigator.userAgent.slice(0, 200), w: window.innerWidth, h: window.innerHeight, at: new Date().toISOString() },
    });
    setBusy(false);
    if (error) { toast.error("Couldn't save your report. Please try again."); return; }
    toast.success("Thanks — your report is saved and on its way to us.");
    setMsg(""); setOpen(false);
    void supabase.functions.invoke("report-problem-mailer", { body: {} }).catch(() => undefined);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className={className}><Bug className="mr-1.5 h-4 w-4" />Report a problem</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Report a problem</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Tell us what happened and what you expected. We save it right away.</p>
        <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={4000} rows={5} placeholder="What went wrong?" />
        <Button onClick={submit} disabled={busy || !msg.trim()}>{busy ? "Saving…" : "Send report"}</Button>
      </DialogContent>
    </Dialog>
  );
}
