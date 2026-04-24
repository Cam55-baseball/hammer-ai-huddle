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
import { Activity, Brain, Clock, AlertTriangle, Layers, Loader2, Shield, Heart } from 'lucide-react';

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
