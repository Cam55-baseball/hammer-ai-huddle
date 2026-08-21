/**
 * SavedReportsPanel — the athlete's report library.
 * Open a frozen snapshot, mint / copy / revoke an expiring share link, delete.
 */
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Link2, Copy, Ban, Trash2, Eye, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReportView } from "@/components/games/reports/ReportView";
import { useSavedReports, useReportActions, shareUrl, type SavedReport } from "@/hooks/useGameReport";

const KIND_LABEL: Record<string, string> = {
  individual_postgame: "Postgame",
  scouting: "Scouting",
  team_postgame: "Team",
};

function linkState(r: SavedReport) {
  if (!r.share_token) return { label: "Not shared", live: false };
  if (r.share_revoked) return { label: "Link revoked", live: false };
  if (r.share_expires_at && new Date(r.share_expires_at) < new Date())
    return { label: "Link expired", live: false };
  return { label: "Link live", live: true };
}

export function SavedReportsPanel() {
  const { data: reports, isLoading } = useSavedReports();
  const { share, revoke, remove } = useReportActions();
  const [open, setOpen] = useState<SavedReport | null>(null);

  const makeLink = async (r: SavedReport) => {
    try {
      const updated = await share.mutateAsync({ reportId: r.id, days: 30 });
      const url = shareUrl(updated.share_token!);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Share link copied — valid 30 days");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't create the link");
    }
  };

  const copyLink = async (r: SavedReport) => {
    await navigator.clipboard.writeText(shareUrl(r.share_token!)).catch(() => {});
    toast.success("Link copied");
  };

  if (isLoading) {
    return (
      <Card className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading saved reports…
      </Card>
    );
  }

  if (!reports?.length) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        <FileText className="mb-2 h-4 w-4" />
        No saved reports yet. Open a game, build the postgame report, and press Save to keep a
        frozen copy you can share with coaches or recruiters.
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {reports.map((r) => {
          const st = linkState(r);
          return (
            <Card key={r.id} className="space-y-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{KIND_LABEL[r.report_kind] ?? r.report_kind}</Badge>
                <span className="text-sm font-medium">{r.title}</span>
                <Badge variant={st.live ? "default" : "outline"} className="text-[10px]">
                  {st.label}
                </Badge>
                <div className="flex-1" />
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </span>
              </div>
              {r.subtitle && <p className="text-xs text-muted-foreground">{r.subtitle}</p>}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setOpen(r)}>
                  <Eye className="mr-1 h-4 w-4" /> View
                </Button>
                {st.live ? (
                  <Button size="sm" variant="ghost" onClick={() => copyLink(r)}>
                    <Copy className="mr-1 h-4 w-4" /> Copy link
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={share.isPending}
                    onClick={() => makeLink(r)}
                  >
                    <Link2 className="mr-1 h-4 w-4" /> Create link
                  </Button>
                )}
                {st.live && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={revoke.isPending}
                    onClick={() =>
                      revoke.mutateAsync(r.id).then(
                        () => toast.success("Link revoked"),
                        (e) => toast.error(e?.message ?? "Couldn't revoke"),
                      )
                    }
                  >
                    <Ban className="mr-1 h-4 w-4" /> Revoke
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutateAsync(r.id).then(
                      () => toast.success("Report deleted"),
                      (e) => toast.error(e?.message ?? "Couldn't delete"),
                    )
                  }
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{open?.title}</DialogTitle>
          </DialogHeader>
          {open && <ReportView snapshot={open.snapshot} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
