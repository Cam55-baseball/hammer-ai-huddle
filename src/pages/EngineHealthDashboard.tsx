import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useEngineHealth } from '@/hooks/useEngineHealth';
import { useHeartbeatHealth } from '@/hooks/useHeartbeatHealth';
import { useSentinelHealth } from '@/hooks/useSentinelHealth';
import { useAdversarialHealth } from '@/hooks/useAdversarialHealth';
import { Activity, Brain, Clock, AlertTriangle, Layers, Loader2, Shield, Heart, Eye, Swords } from 'lucide-react';
import { SystemIntegrityBadge } from '@/components/owner/SystemIntegrityBadge';

const formatRel = (iso: string | null) => {
  if (!iso) return 'Never';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const statusFor = (iso: string | null, hours: number) => {
  if (!iso) return { label: 'Stale', tone: 'bg-rose-500' };
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (h <= hours) return { label: 'Healthy', tone: 'bg-emerald-500' };
  if (h <= hours * 2) return { label: 'Lagging', tone: 'bg-amber-500' };
  return { label: 'Stale', tone: 'bg-rose-500' };
};

export default function EngineHealthDashboard() {
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const navigate = useNavigate();
  const health = useEngineHealth();
  const heartbeat = useHeartbeatHealth();
  const sentinel = useSentinelHealth();
  const adversarial = useAdversarialHealth();

  useEffect(() => {
    if (!ownerLoading && !adminLoading && !isOwner && !isAdmin) navigate('/dashboard');
  }, [isOwner, isAdmin, ownerLoading, adminLoading, navigate]);

  if (ownerLoading || adminLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }
  if (!isOwner && !isAdmin) return null;

  const mpiStatus = statusFor(health.lastNightlyMpi, 30);
  const hieStatus = statusFor(health.lastNightlyHie, 30);
  const hsStatus = statusFor(health.lastHammerState, 1);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Activity className="h-8 w-8" />
              Engine Health
            </h1>
            <p className="mt-1 flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4" />
              Owner/Admin only — monitors HIE, MPI, and Hammer State pipelines.
            </p>
          </div>
          <SystemIntegrityBadge />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <CoverageCard title="HIE Coverage" desc="Active users with snapshot in last 24h" value={health.hieCoverage} loading={health.loading} icon={<Brain className="h-5 w-5" />} />
          <CoverageCard title="MPI Coverage" desc={`${health.matureCount} mature · ${health.provisionalCount} provisional`} value={health.mpiCoverage} loading={health.loading} icon={<Layers className="h-5 w-5" />} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <CronCard title="Nightly MPI" timestamp={health.lastNightlyMpi} status={mpiStatus} loading={health.loading} />
          <CronCard title="Nightly HIE" timestamp={health.lastNightlyHie} status={hieStatus} loading={health.loading} />
          <CronCard title="Hammer State" timestamp={health.lastHammerState} status={hsStatus} loading={health.loading} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" />Dirty Queue Depth</CardTitle>
              <CardDescription>Users awaiting HIE refresh</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{health.loading ? '—' : health.dirtyQueueDepth}</p>
              <p className="mt-1 text-xs text-muted-foreground">Worker drains every 15 min.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4" />Failures (24h)</CardTitle>
              <CardDescription>Audit-log entries containing "failed"</CardDescription>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${health.failures24h > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {health.loading ? '—' : health.failures24h}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4" />
              Engine Heartbeat (last 24h)
            </CardTitle>
            <CardDescription>
              Continuous pipeline check every 15 min — write → HIE → Hammer State → aggregation → timing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {heartbeat.loading ? (
              <Skeleton className="h-20 w-full" />
            ) : heartbeat.totalCount24h === 0 ? (
              <p className="text-sm text-muted-foreground">
                No heartbeat runs yet. First scheduled run within 15 min of deployment.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Pass rate</p>
                    <p className={`text-2xl font-bold ${heartbeat.successRate >= 95 ? 'text-emerald-500' : heartbeat.successRate >= 80 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {heartbeat.passCount24h}/{heartbeat.totalCount24h}
                    </p>
                    <p className="text-xs text-muted-foreground">{heartbeat.successRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">p50 latency</p>
                    <p className="text-2xl font-bold">{heartbeat.p50Latency}<span className="text-xs font-normal text-muted-foreground">ms</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">p95 latency</p>
                    <p className={`text-2xl font-bold ${heartbeat.p95Latency > 60_000 ? 'text-rose-500' : heartbeat.p95Latency > 30_000 ? 'text-amber-500' : ''}`}>
                      {heartbeat.p95Latency}<span className="text-xs font-normal text-muted-foreground">ms</span>
                    </p>
                  </div>
                </div>

                {heartbeat.lastFailure && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Last failure · {formatRel(heartbeat.lastFailure.run_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <Badge variant="outline" className="mr-2 text-[10px]">{heartbeat.lastFailure.failure_check ?? 'unknown'}</Badge>
                      {heartbeat.lastFailure.failure_reason}
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Recent runs</p>
                  <div className="flex flex-wrap gap-1">
                    {heartbeat.recent.map(r => (
                      <span
                        key={r.id}
                        title={`${r.success ? 'OK' : r.failure_check} · ${r.latency_ms ?? '?'}ms · ${formatRel(r.run_at)}`}
                        className={`h-3 w-3 rounded-sm ${r.success ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" />
              Engine Truth Drift (last 24h)
            </CardTitle>
            <CardDescription>
              Independent sanity model vs engine output — flags silent logic drift
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sentinel.loading ? (
              <Skeleton className="h-20 w-full" />
            ) : sentinel.total24h === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sentinel runs yet. First scheduled run within 60 min of deployment.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Drift rate</p>
                    <p className={`text-2xl font-bold ${sentinel.driftRate <= 15 ? 'text-emerald-500' : sentinel.driftRate <= 30 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {sentinel.driftRate}%
                    </p>
                    <p className="text-xs text-muted-foreground">{sentinel.total24h} evals</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Users flagged</p>
                    <p className="text-2xl font-bold">{sentinel.usersFlagged}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Worst drift</p>
                    <p className={`text-2xl font-bold ${(sentinel.worstDriftCase?.drift_score ?? 0) <= 15 ? 'text-emerald-500' : (sentinel.worstDriftCase?.drift_score ?? 0) <= 30 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {sentinel.worstDriftCase?.drift_score ?? 0}
                    </p>
                  </div>
                </div>

                {sentinel.worstDriftCase && sentinel.worstDriftCase.drift_flag && (
                  <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 space-y-1">
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      Worst case · {formatRel(sentinel.worstDriftCase.run_at)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline">expected: {sentinel.worstDriftCase.expected_state}</Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline">actual: {sentinel.worstDriftCase.actual_state ?? 'none'}</Badge>
                      {sentinel.worstDriftCase.failure_reason && (
                        <Badge variant="outline" className="text-[10px]">{sentinel.worstDriftCase.failure_reason}</Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Recent evaluations</p>
                  <div className="flex flex-wrap gap-1">
                    {sentinel.recent.map((r) => (
                      <span
                        key={r.id}
                        title={`${r.expected_state} vs ${r.actual_state ?? 'none'} · drift ${r.drift_score} · ${formatRel(r.run_at)}`}
                        className={`h-3 w-3 rounded-sm ${r.drift_score <= 15 ? 'bg-emerald-500' : r.drift_score <= 30 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Swords className="h-4 w-4" />
              Adversarial Integrity (last 24h)
            </CardTitle>
            <CardDescription>
              Structured stress tests — fabricates known failure patterns and asserts engine doesn't fall for them
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {adversarial.loading ? (
              <Skeleton className="h-20 w-full" />
            ) : adversarial.runsToday === 0 ? (
              <p className="text-sm text-muted-foreground">
                No adversarial runs yet. First scheduled run within 6h of deployment.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Pass rate</p>
                    <p className={`text-2xl font-bold ${adversarial.passRate24h >= 90 ? 'text-emerald-500' : adversarial.passRate24h >= 70 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {adversarial.passRate24h}%
                    </p>
                    <p className="text-xs text-muted-foreground">{adversarial.runsToday} scenarios</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Failures</p>
                    <p className="text-2xl font-bold">
                      {Object.values(adversarial.failuresByScenario).reduce((s, n) => s + n, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Worst scenario</p>
                    <p className="text-sm font-semibold truncate">
                      {Object.entries(adversarial.failuresByScenario).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'}
                    </p>
                  </div>
                </div>

                {Object.keys(adversarial.failuresByScenario).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(adversarial.failuresByScenario).map(([s, n]) => (
                      <Badge key={s} variant="outline" className="text-[10px]">
                        {s}: {n}
                      </Badge>
                    ))}
                  </div>
                )}

                {adversarial.lastFailure && (
                  <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 space-y-1">
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      Last failure · {formatRel(adversarial.lastFailure.run_at)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline">{adversarial.lastFailure.scenario}</Badge>
                      <span className="text-muted-foreground">forbidden:</span>
                      <Badge variant="outline">{adversarial.lastFailure.forbidden_states.join(', ')}</Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline">actual: {adversarial.lastFailure.actual_state ?? 'none'}</Badge>
                      {adversarial.lastFailure.failure_reason && (
                        <Badge variant="outline" className="text-[10px]">{adversarial.lastFailure.failure_reason}</Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Recent runs</p>
                  <div className="flex flex-wrap gap-1">
                    {adversarial.recent.map((r) => (
                      <span
                        key={r.id}
                        title={`${r.scenario} · ${r.pass ? 'PASS' : 'FAIL'} · ${r.actual_state ?? 'none'} · ${formatRel(r.run_at)}`}
                        className={`h-3 w-3 rounded-sm ${r.pass ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function CoverageCard({ title, desc, value, loading, icon }: { title: string; desc: string; value: number; loading: boolean; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-24" /> : (
          <>
            <p className="text-3xl font-bold">{value}%</p>
            <Progress value={value} className="mt-2 h-2" />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CronCard({ title, timestamp, status, loading }: { title: string; timestamp: string | null; status: { label: string; tone: string }; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-6 w-32" /> : (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${status.tone}`} />
              <Badge variant="outline" className="text-[10px]">{status.label}</Badge>
            </div>
            <p className="text-sm font-medium">{formatRel(timestamp)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
