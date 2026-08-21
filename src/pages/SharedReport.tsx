/**
 * SharedReport — public, token-gated read-only view of a saved report.
 * No auth: the edge function validates the token, expiry and revocation.
 */
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReportView } from "@/components/games/reports/ReportView";
import { supabase } from "@/integrations/supabase/client";
import type { ReportSnapshot } from "@/lib/games/reportEngine";

export default function SharedReport() {
  const { token } = useParams<{ token: string }>();

  const q = useQuery({
    queryKey: ["shared-report", token],
    enabled: !!token,
    retry: false,
    queryFn: async (): Promise<ReportSnapshot> => {
      const { data, error } = await supabase.functions.invoke("gp-shared-report", {
        body: { token },
      });
      if (error) throw new Error("This report link is no longer valid.");
      if (!data?.snapshot) throw new Error("This report link is no longer valid.");
      return data.snapshot as ReportSnapshot;
    },
  });

  return (
    <div className="container max-w-4xl space-y-4 py-6">
      {q.isLoading && (
        <div className="flex items-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading report…
        </div>
      )}
      {q.error && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          {(q.error as Error).message}
        </Card>
      )}
      {q.data && (
        <>
          <div className="flex justify-end print:hidden">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" /> Print / PDF
            </Button>
          </div>
          <ReportView snapshot={q.data} />
        </>
      )}
    </div>
  );
}
