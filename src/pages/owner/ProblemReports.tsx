/** Owner/admin list of saved problem reports and their email status (Roadmap 7c). */
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProblemReports() {
  const nav = useNavigate();
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["problem-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("problem_reports")
        .select("id, page, message, app_info, email_status, email_attempts, email_last_error, created_at")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  const retry = async () => { await supabase.functions.invoke("report-problem-mailer", { body: {} }); refetch(); };
  // Unsent reports retry by themselves when this page opens (and on every new report).
  const autoTried = useRef(false);
  useEffect(() => {
    if (autoTried.current || !data?.some((r) => r.email_status !== "sent")) return;
    autoTried.current = true;
    void retry();
  }, [data]);
  return (
    <div className="mx-auto max-w-3xl space-y-3 p-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => nav("/owner")}><ArrowLeft className="mr-1 h-4 w-4" />Owner</Button>
        <Button size="sm" variant="outline" onClick={retry} disabled={isFetching}>Retry failed emails</Button>
      </div>
      <h1 className="text-xl font-semibold">Problem reports</h1>
      {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No reports yet.</p>}
      {(data ?? []).map((r: any) => (
        <Card key={r.id}>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>{new Date(r.created_at).toLocaleString()} · {r.app_info?.card ?? r.page ?? "app"}</span>
              <Badge variant={r.email_status === "sent" ? "default" : "outline"}>Email: {r.email_status}{r.email_status !== "sent" ? ` (${r.email_attempts} tries)` : ""}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="whitespace-pre-wrap">{r.message}</p>
            <p className="text-[11px] text-muted-foreground">Screen: {r.page ?? "—"} · Plan date: {r.app_info?.plan_date ?? "—"} · Version: {r.app_info?.app_version ?? "—"}</p>
            {r.email_last_error && <p className="text-[11px] text-muted-foreground">Last email error: {r.email_last_error}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
