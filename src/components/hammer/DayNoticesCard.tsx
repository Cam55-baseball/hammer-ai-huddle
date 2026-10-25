/**
 * Step 24 item 2 — every load or volume notice for today, in one place in the
 * "Before you start" drawer, each one checked off as read by the athlete.
 *
 * The same notices also appear on the card they concern. This surface is the
 * athlete's single list; it never changes the plan.
 */
import { useEffect, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Notice, noticeKey, surfaceForNotice } from "@/lib/hammer/notices/noticeRouting";
import { athleteNoticeCopy } from "@/lib/hammer/notices/athleteNoticeCopy";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SURFACE_LABEL: Record<string, string> = {
  lift: "Lift",
  swing: "Hitting",
  throw: "Throwing",
  speed: "Speed",
  jump: "Jumps",
  conditioning: "Conditioning",
  day: "Today",
};

const storeKey = (planDate: string) => `hammer.today.noticesRead.${planDate}`;

export function DayNoticesCard({
  notices,
  planDate,
  extraLines = [],
}: {
  notices: ReadonlyArray<Notice>;
  planDate: string;
  extraLines?: readonly string[];
}) {
  const [read, setRead] = useState<string[]>([]);
  const { user } = useAuth();
  const [recoveryAcked, setRecoveryAcked] = useState(false);
  const [acking, setAcking] = useState(false);
  const acknowledgeRecovery = async () => {
    if (!user || acking) return;
    setAcking(true);
    const reason = notices.length === 1 ? notices[0].reason : "mixed";
    const { error } = await supabase.from("wk_recovery_acks" as any).upsert({ user_id: user.id, ack_date: planDate,
      reduction_reason: reason, reduction_payload: { reductions: notices } }, { onConflict: "user_id,ack_date,reduction_reason" });
    setAcking(false);
    if (error) { toast.error("Could not record acknowledgment"); return; }
    setRecoveryAcked(true);
  };

  useEffect(() => {
    try {
      setRead(JSON.parse(localStorage.getItem(storeKey(planDate)) ?? "[]"));
    } catch {
      setRead([]);
    }
  }, [planDate]);

  const markRead = (key: string) => {
    setRead((prev) => {
      const next = prev.includes(key) ? prev : [...prev, key];
      try {
        localStorage.setItem(storeKey(planDate), JSON.stringify(next));
      } catch {
        /* reading a notice is never blocked by storage */
      }
      return next;
    });
  };

  if (notices.length === 0 && extraLines.length === 0) return null;

  const unique = notices.filter((notice, index) => notices.findIndex(other => surfaceForNotice(other) === surfaceForNotice(notice) && athleteNoticeCopy(other).trim().toLowerCase() === athleteNoticeCopy(notice).trim().toLowerCase()) === index);
  const seen = new Set(unique.map(notice => athleteNoticeCopy(notice).trim().toLowerCase()));
  const changes = extraLines.filter(line => { const key = line.trim().toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });
  return (
    <details className="border-b border-border py-3">
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">
          Why today's plan changed
      </summary>
      <div className="space-y-2">
        {notices.length > 0 && user && <Button size="sm" variant="outline" disabled={acking || recoveryAcked} onClick={acknowledgeRecovery}>{recoveryAcked ? "Lighter day acknowledged" : "Take the lighter day"}</Button>}
        {changes.map(line => <p key={line} className="border-l-2 border-primary pl-3 text-xs leading-relaxed">{line}</p>)}
        {unique.map((notice) => {
          const key = noticeKey(planDate, notice);
          const isRead = read.includes(key);
          return (
            <div
              key={key}
              className={`rounded-md border p-2 text-xs ${
                isRead ? "border-border bg-muted/30 text-muted-foreground" : "border-amber-500/40 bg-amber-500/5"
              }`}
            >
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {SURFACE_LABEL[surfaceForNotice(notice)] ?? "Today"}
              </div>
              <p className="leading-relaxed">{athleteNoticeCopy(notice)}</p>
              {isRead ? (
                <div className="mt-2 flex items-center gap-1 text-[11px] font-medium">
                  <Check className="h-3.5 w-3.5" /> Read
                </div>
              ) : (
                <Button size="sm" className="mt-2 h-7" onClick={() => markRead(key)}>
                  Got it
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}
