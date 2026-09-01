import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  useProspectReports,
  useLinkProspectReport,
  usePlayerSearch,
  type EvaluationRow,
} from '@/hooks/useEvaluations';
import { useReportDetails } from '@/hooks/useReportDetails';
import { ReportAccordionList } from '@/components/evaluations/ReportAccordionList';
import { subjectLabel, prospectDetailLine } from '@/lib/evaluation/reportSubject';
import { exportReportPdf } from '@/lib/evaluation/reportPdf';
import { ArrowLeft, Link2, Loader2, UserPlus, Search } from 'lucide-react';

/**
 * Reports filed on prospects who had no Hammers account at the time.
 *
 * They live unlinked and author-only. Once the athlete signs up, the scout
 * searches for their profile and confirms the link — which hands the report
 * back to the athlete's normal attendance-confirmation gate.
 */
export default function ProspectReports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: reports = [], isLoading } = useProspectReports();
  const link = useLinkProspectReport();

  const reportIds = useMemo(() => reports.map((r) => r.id), [reports]);
  const { data: details } = useReportDetails(reportIds);

  const [linking, setLinking] = useState<EvaluationRow | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const { data: results = [], isFetching } = usePlayerSearch(query);

  const closeDialog = () => {
    setLinking(null);
    setQuery('');
    setPicked(null);
  };

  const confirmLink = async () => {
    if (!linking || !picked) return;
    try {
      await link.mutateAsync({ reportId: linking.id, athleteId: picked.id });
      toast({
        title: 'Report linked',
        description: `${picked.name} now has this report waiting for their attendance confirmation.`,
      });
      closeDialog();
    } catch (err) {
      toast({
        title: 'Could not link this report',
        description: (err as Error)?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-4 pb-16">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Prospect reports
            </h1>
            <p className="text-sm text-muted-foreground">
              Reports on players who don't have a Hammers profile yet.
            </p>
          </div>
          <Button size="sm" onClick={() => navigate('/scout-evaluation')}>
            New prospect report
          </Button>
        </div>

        <div className="rounded-md border border-sky-500/40 bg-sky-500/5 p-3 text-sm">
          <p className="font-medium">These stay private to you</p>
          <p className="text-muted-foreground">
            An unlinked report is visible only to you. Link it once the athlete signs up — they then
            confirm they were at the event before anyone else can see it.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading prospect reports…
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No prospect reports yet</CardTitle>
              <CardDescription>
                File a report on a player without an account and it will wait here until you can link
                it to their profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate('/scout-evaluation')}>
                File a prospect report
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base">{subjectLabel(report)}</CardTitle>
                      <CardDescription>
                        {prospectDetailLine(report) ?? 'No identifying details captured'}
                        {report.prospect_contact ? ` · ${report.prospect_contact}` : ''}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">Unlinked</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ReportAccordionList
                    reports={[report]}
                    details={details}
                    attributionFor={() => undefined}
                    onExport={(r) =>
                      exportReportPdf({
                        report: r,
                        subject: subjectLabel(r),
                        positions: details?.positionsByReport[r.id] ?? [],
                        batSides: details?.batSidesByReport[r.id] ?? [],
                        pitchingSides: details?.pitchingSidesByReport[r.id] ?? [],
                      })
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setLinking(report);
                      setQuery(subjectLabel(report));
                      setPicked(null);
                    }}
                  >
                    <Link2 className="h-4 w-4 mr-2" /> Link to a Hammers profile
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!linking} onOpenChange={(open) => (open ? null : closeDialog())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link this report</DialogTitle>
            <DialogDescription>
              Search for {linking ? subjectLabel(linking) : 'the athlete'} and confirm the match. The
              report keeps its original date and grades, and the athlete is asked to confirm they
              were at the event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="prospect-link-search">
                Search players by name
              </Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="prospect-link-search"
                  className="h-9 pl-8"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPicked(null);
                  }}
                  placeholder="Player name"
                />
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
              {isFetching ? (
                <p className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                </p>
              ) : query.trim().length < 2 ? (
                <p className="p-3 text-sm text-muted-foreground">Type at least two characters.</p>
              ) : results.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  No matching profile. They may not have signed up yet.
                </p>
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setPicked({ id: r.id, name: r.full_name ?? 'Athlete' })}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${
                      picked?.id === r.id ? 'bg-muted font-medium' : ''
                    }`}
                  >
                    {r.full_name ?? 'Athlete'}
                    <span className="block text-xs text-muted-foreground">
                      {[r.position, r.state, r.high_school_grad_year]
                        .filter(Boolean)
                        .join(' · ') || 'No profile details'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={confirmLink} disabled={!picked || link.isPending}>
              {link.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirm link{picked ? ` to ${picked.name}` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
