import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, TrendingUp, TrendingDown, Minus, Inbox } from 'lucide-react';
import { useFollowerReports, FollowerReportListItem } from '@/hooks/useFollowerReports';
import { PlayerReportDrawer } from './PlayerReportDrawer';

export const FollowerReportsInbox = ({ role }: { role: 'scout' | 'coach' }) => {
  const { data, isLoading } = useFollowerReports();
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const reports = data?.reports ?? [];
  const weekly = reports.filter(r => r.report_type === 'weekly_digest');
  const monthly = reports.filter(r => r.report_type === 'monthly_deep');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Reports Inbox
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Hammer-generated progress reports on your followed players.
            </p>
          </div>
          {data?.unread_count ? (
            <Badge variant="default">{data.unread_count} new</Badge>
          ) : null}
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No reports yet. Weekly digests arrive Mondays; monthly deep reports run on each player's cycle.
            </div>
          ) : (
            <ScrollArea className="h-[480px] pr-3">
              <div className="space-y-2">
                {reports.map(r => (
                  <ReportRow key={r.id} report={r} onOpen={() => setOpenId(r.id)} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <PlayerReportDrawer
        reportId={openId}
        role={role}
        open={!!openId}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
    </div>
  );
};

const ReportRow = ({ report, onOpen }: { report: FollowerReportListItem; onOpen: () => void }) => {
  const isUnread = !report.viewed_at;
  const typeLabel = report.report_type === 'weekly_digest' ? 'Weekly' : report.report_type === 'monthly_deep' ? 'Monthly' : 'Milestone';
  return (
    <button
      onClick={onOpen}
      className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent/40 ${
        isUnread ? 'bg-accent/20 border-primary/40' : 'bg-card border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-semibold truncate">{report.player?.full_name ?? 'Unknown Player'}</span>
            <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
            {isUnread && <Badge variant="default" className="text-xs">New</Badge>}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{report.headline ?? 'Report ready.'}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(report.period_start), 'MMM d')} – {format(new Date(report.period_end), 'MMM d, yyyy')}
          </p>
        </div>
      </div>
    </button>
  );
};
