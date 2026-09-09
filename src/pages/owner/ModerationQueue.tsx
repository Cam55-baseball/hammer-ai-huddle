/**
 * Apple Guideline 1.2 — owner moderation queue.
 *
 * Pending reports newest first, with the age of each report visible so the
 * 24-hour review commitment is measurable, and three actions per report:
 * dismiss, remove the content, or suspend the reported user.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { REPORT_REASON_LABELS } from "@/components/safety/ReportContentDialog";

interface ReportRow {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  content_type: string;
  content_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

function ageLabel(iso: string): { text: string; overdue: boolean } {
  const hours = (Date.now() - new Date(iso).getTime()) / 36e5;
  const overdue = hours > 24;
  if (hours < 1) return { text: `${Math.max(1, Math.round(hours * 60))} min open`, overdue };
  if (hours < 48) return { text: `${Math.round(hours)} hr open`, overdue };
  return { text: `${Math.round(hours / 24)} days open`, overdue };
}

export default function ModerationQueue() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "resolved">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["moderation-reports", tab],
    queryFn: async (): Promise<ReportRow[]> => {
      const query = supabase
        .from("content_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      const { data, error } =
        tab === "pending"
          ? await query.eq("status", "pending")
          : await query.neq("status", "pending");
      if (error) throw error;
      return (data ?? []) as ReportRow[];
    },
  });

  const userIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of reports) {
      ids.add(r.reporter_id);
      if (r.reported_user_id) ids.add(r.reported_user_id);
    }
    return Array.from(ids);
  }, [reports]);

  const { data: names = {} } = useQuery({
    queryKey: ["moderation-names", userIds],
    enabled: userIds.length > 0,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, contact_email")
        .in("id", userIds);
      const map: Record<string, string> = {};
      for (const p of (data ?? []) as { id: string; full_name: string | null; contact_email: string | null }[]) {
        map[p.id] = p.full_name || p.contact_email || p.id.slice(0, 8);
      }
      return map;
    },
  });

  const nameOf = (id?: string | null) => (id ? names[id] ?? id.slice(0, 8) : "Unknown");

  async function resolve(report: ReportRow, action: "dismiss" | "remove_content" | "suspend_user") {
    if (!user?.id) return;
    setBusyId(report.id);
    try {
      if (action === "remove_content" && report.content_type === "video" && report.content_id) {
        const { error } = await supabase
          .from("library_videos")
          .update({ moderation_removed_at: new Date().toISOString() })
          .eq("id", report.content_id);
        if (error) throw error;
      }

      if (action === "suspend_user" && report.reported_user_id) {
        const { error } = await supabase
          .from("profiles")
          .update({ suspended_at: new Date().toISOString() })
          .eq("id", report.reported_user_id);
        if (error) throw error;
      }

      const note =
        action === "dismiss"
          ? "Dismissed — no rule broken."
          : action === "remove_content"
            ? "Content removed."
            : "Reported user suspended.";

      const { error: updErr } = await supabase
        .from("content_reports")
        .update({
          status: action === "dismiss" ? "dismissed" : "actioned",
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_note: note,
        })
        .eq("id", report.id);
      if (updErr) throw updErr;

      toast.success(note);
      await qc.invalidateQueries({ queryKey: ["moderation-reports"] });
    } catch (e) {
      console.warn("[moderation] action failed", e);
      toast.error("That action did not go through", {
        description: e instanceof Error ? e.message : "Try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/owner")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <ShieldAlert className="h-6 w-6 text-primary" />
              Moderation
            </h1>
            <p className="text-sm text-muted-foreground">
              Reported content and users. We promise a review within 24 hours.
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {tab === "pending" ? "Nothing waiting. The queue is clear." : "No resolved reports yet."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => {
              const age = ageLabel(r.created_at);
              const busy = busyId === r.id;
              return (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        {REPORT_REASON_LABELS[r.reason] ?? r.reason}
                      </CardTitle>
                      {r.status === "pending" ? (
                        <Badge variant={age.overdue ? "destructive" : "secondary"}>{age.text}</Badge>
                      ) : (
                        <Badge variant="outline">{r.status}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid gap-1 text-muted-foreground">
                      <div>
                        <span className="text-foreground">Reported by:</span> {nameOf(r.reporter_id)}
                      </div>
                      <div>
                        <span className="text-foreground">About:</span> {nameOf(r.reported_user_id)}
                      </div>
                      <div>
                        <span className="text-foreground">Content:</span> {r.content_type}
                        {r.content_id ? ` · ${r.content_id}` : ""}
                      </div>
                      {r.details && (
                        <div className="rounded-md bg-muted/50 p-2 text-foreground">{r.details}</div>
                      )}
                      {r.resolution_note && <div>Outcome: {r.resolution_note}</div>}
                    </div>

                    {r.status === "pending" && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => resolve(r, "dismiss")}
                        >
                          Dismiss
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy || !r.content_id}
                          onClick={() => resolve(r, "remove_content")}
                        >
                          Remove content
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy || !r.reported_user_id}
                          onClick={() => resolve(r, "suspend_user")}
                        >
                          Suspend user
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
