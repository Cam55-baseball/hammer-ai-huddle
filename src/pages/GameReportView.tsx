/**
 * GameReportView — the individual postgame report for one game.
 * View, print/PDF, save a frozen snapshot, and mint an expiring share link.
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, Link2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReportView } from "@/components/games/reports/ReportView";
import { useIndividualReport, useReportActions, shareUrl } from "@/hooks/useGameReport";

export default function GameReportView() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const report = useIndividualReport(gameId);
  const { save, share } = useReportActions();
  const [link, setLink] = useState<string | null>(null);

  const saveAndShare = async () => {
    if (!report.data) return;
    try {
      const saved = await save.mutateAsync({ snapshot: report.data, gameId });
      const shared = await share.mutateAsync({ reportId: saved.id, days: 30 });
      const url = shareUrl(shared.share_token!);
      setLink(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Share link copied — valid 30 days");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't create the share link");
    }
  };

  return (
    <div className="container max-w-4xl space-y-4 py-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" /> Print / PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!report.data || save.isPending}
          onClick={() => report.data && save.mutateAsync({ snapshot: report.data, gameId }).then(
            () => toast.success("Report saved"),
            (e) => toast.error(e?.message ?? "Couldn't save"),
          )}
        >
          <Save className="mr-1 h-4 w-4" /> Save
        </Button>
        <Button size="sm" disabled={!report.data || share.isPending} onClick={saveAndShare}>
          {share.isPending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="mr-1 h-4 w-4" />
          )}
          Share link
        </Button>
      </div>

      {link && (
        <Card className="p-3 text-sm print:hidden">
          <span className="text-muted-foreground">Share link (30 days): </span>
          <a href={link} className="break-all underline" target="_blank" rel="noreferrer">
            {link}
          </a>
        </Card>
      )}

      {report.isLoading && (
        <div className="flex items-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Building the report…
        </div>
      )}
      {report.error && (
        <Card className="p-4 text-sm text-destructive">
          Couldn't build this report: {(report.error as any)?.message}
        </Card>
      )}
      {report.data && <ReportView snapshot={report.data} />}
    </div>
  );
}
