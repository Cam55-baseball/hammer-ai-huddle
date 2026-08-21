/**
 * History — the home for every record that has no video attached.
 *
 * Players Club is a video vault; practices, games, reports and recaps live here
 * in collapsed sections so history stays clutter-free but fully searchable.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Archive, Dumbbell, Trophy, FileText, LineChart, ChevronDown, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { PracticeSessionDetailDialog } from '@/components/PracticeSessionDetailDialog';
import {
  usePracticeHistory,
  useGameHistory,
  useReportHistory,
  useRecapHistory,
} from '@/hooks/useHistoryRecords';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  count?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function HistorySection({ title, icon, count, open, onOpenChange, children }: SectionProps) {
  return (
    <Card>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left">
          <div className="flex items-center gap-2 font-semibold">
            {icon}
            <span>{title}</span>
            {count != null && <Badge variant="secondary">{count}</Badge>}
          </div>
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

const Empty = ({ label }: { label: string }) => (
  <p className="py-6 text-center text-sm text-muted-foreground">{label}</p>
);

const Busy = () => (
  <div className="flex justify-center py-6">
    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  </div>
);

const inRange = (date: string, from: string, to: string) =>
  (!from || date >= from) && (!to || date <= to);

export default function History() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedPractice, setSelectedPractice] = useState<any>(null);

  const practices = usePracticeHistory(userId, openKey === 'practices');
  const games = useGameHistory(userId, openKey === 'games');
  const reports = useReportHistory(userId, openKey === 'reports');
  const recaps = useRecapHistory(userId, openKey === 'recaps');

  const q = query.trim().toLowerCase();

  const practiceRows = useMemo(
    () =>
      (practices.data ?? []).filter(
        (p) =>
          inRange(p.session_date, from, to) &&
          (!q ||
            `${p.module ?? ''} ${p.session_type ?? ''} ${p.notes ?? ''}`.toLowerCase().includes(q)),
      ),
    [practices.data, q, from, to],
  );

  const gameRows = useMemo(
    () =>
      (games.data ?? []).filter(
        (g) =>
          inRange(g.game_date, from, to) &&
          (!q || `${g.opponent_team ?? ''} ${g.venue ?? ''} ${g.game_type ?? ''}`.toLowerCase().includes(q)),
      ),
    [games.data, q, from, to],
  );

  const reportRows = useMemo(
    () =>
      (reports.data ?? []).filter(
        (r) =>
          inRange(r.created_at.slice(0, 10), from, to) &&
          (!q || `${r.title} ${r.subtitle ?? ''} ${r.report_kind}`.toLowerCase().includes(q)),
      ),
    [reports.data, q, from, to],
  );

  const recapRows = useMemo(
    () => (recaps.data ?? []).filter((r) => inRange(r.report_period_end, from, to)),
    [recaps.data, from, to],
  );

  const toggle = (key: string) => (open: boolean) => setOpenKey(open ? key : null);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Archive className="h-8 w-8" />
            History
          </h1>
          <p className="mt-1 text-muted-foreground">
            Practices, games, reports and recaps — everything without video, kept in one tidy
            place. Videos live in{' '}
            <Link to="/players-club" className="text-primary hover:underline">
              Players Club
            </Link>
            .
          </p>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Search history…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            <span className="text-muted-foreground">→</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            {(from || to || query) && (
              <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); setQuery(''); }}>
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <HistorySection
            title="Practice sessions"
            icon={<Dumbbell className="h-4 w-4 text-primary" />}
            count={openKey === 'practices' ? practiceRows.length : undefined}
            open={openKey === 'practices'}
            onOpenChange={toggle('practices')}
          >
            {practices.isLoading ? (
              <Busy />
            ) : practiceRows.length === 0 ? (
              <Empty label="No practice sessions yet." />
            ) : (
              <ul className="divide-y">
                {practiceRows.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelectedPractice(p)}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-accent/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium capitalize">
                          {(p.session_type ?? p.module ?? 'Session').replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.session_date} · {p.module ?? '—'} ·{' '}
                          {Array.isArray(p.drill_blocks) ? p.drill_blocks.length : 0} drills
                        </p>
                      </div>
                      {(p.effective_grade ?? p.coach_grade) != null && (
                        <Badge variant="outline">{Math.round((p.effective_grade ?? p.coach_grade)!)}</Badge>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </HistorySection>

          <HistorySection
            title="Games"
            icon={<Trophy className="h-4 w-4 text-primary" />}
            count={openKey === 'games' ? gameRows.length : undefined}
            open={openKey === 'games'}
            onOpenChange={toggle('games')}
          >
            {games.isLoading ? (
              <Busy />
            ) : gameRows.length === 0 ? (
              <Empty label="No games logged yet." />
            ) : (
              <ul className="divide-y">
                {gameRows.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {g.opponent_team ? `vs ${g.opponent_team}` : 'Game'}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {g.game_date} · {(g.game_type ?? '').replace(/_/g, ' ')} · {g.status}
                        {g.my_score != null && g.opp_score != null ? ` · ${g.my_score}–${g.opp_score}` : ''}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/games/${g.id}/report`}>Report</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </HistorySection>

          <HistorySection
            title="Game reports"
            icon={<FileText className="h-4 w-4 text-primary" />}
            count={openKey === 'reports' ? reportRows.length : undefined}
            open={openKey === 'reports'}
            onOpenChange={toggle('reports')}
          >
            {reports.isLoading ? (
              <Busy />
            ) : reportRows.length === 0 ? (
              <Empty label="No saved reports yet." />
            ) : (
              <ul className="divide-y">
                {reportRows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {format(new Date(r.created_at), 'PP')} · {r.report_kind.replace(/_/g, ' ')}
                        {r.subtitle ? ` · ${r.subtitle}` : ''}
                        {r.share_token && !r.share_revoked ? ' · shared' : ''}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to={r.game_id ? `/games/${r.game_id}/report` : '/games/reports'}>Open</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </HistorySection>

          <HistorySection
            title="Recaps & progress reports"
            icon={<LineChart className="h-4 w-4 text-primary" />}
            count={openKey === 'recaps' ? recapRows.length : undefined}
            open={openKey === 'recaps'}
            onOpenChange={toggle('recaps')}
          >
            {recaps.isLoading ? (
              <Busy />
            ) : recapRows.length === 0 ? (
              <Empty label="No recaps generated yet." />
            ) : (
              <ul className="divide-y">
                {recapRows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {r.report_period_start} → {r.report_period_end}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">{r.status}</p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/progress">Open</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </HistorySection>
        </div>

        <PracticeSessionDetailDialog
          session={selectedPractice}
          open={!!selectedPractice}
          onClose={() => setSelectedPractice(null)}
        />
      </div>
    </DashboardLayout>
  );
}
