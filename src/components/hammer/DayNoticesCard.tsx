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
}: {
  notices: ReadonlyArray<Notice>;
  planDate: string;
}) {
  const [read, setRead] = useState<string[]>([]);

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

  if (!notices || notices.length === 0) return null;

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Notices for today
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {notices.map((notice) => {
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
              <p className="leading-relaxed">{notice.detail}</p>
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
      </CardContent>
    </Card>
  );
}
