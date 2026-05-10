import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  CreditCard,
  Video as VideoIcon,
  Target,
  UserCog,
  UserPlus,
  ArrowRight,
  Plus,
  Search,
  Settings as SettingsIcon,
  Activity,
  AlertCircle,
  BarChart3,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { OwnerSection } from "./OwnerSidebar";

interface ActivityItem {
  id: string;
  label: string;
  detail?: string;
  ts: string;
  kind: "user" | "video" | "scout" | "build";
}

interface OwnerOverviewProps {
  totalUsers: number;
  activeSubscriptions: number;
  totalVideosAnalyzed: number;
  avgScore: number;
  pendingAdminRequests: number;
  pendingScoutApplications: number;
  recentUsers: { id: string; full_name: string | null; created_at: string }[];
  recentVideos: { id: string; sport?: string | null; module?: string | null; created_at: string }[];
  recentScoutApplications: { id: string; status: string; created_at: string; full_name?: string | null }[];
  onJump: (section: OwnerSection) => void;
}

interface SectionHeaderProps {
  icon: React.ElementType;
  label: string;
  accent: "amber" | "blue" | "slate" | "emerald";
}

const ACCENT_TEXT: Record<SectionHeaderProps["accent"], string> = {
  amber: "text-amber-600 dark:text-amber-400",
  blue: "text-blue-600 dark:text-blue-400",
  slate: "text-slate-600 dark:text-slate-300",
  emerald: "text-emerald-600 dark:text-emerald-400",
};

const ACCENT_DOT: Record<SectionHeaderProps["accent"], string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  slate: "bg-slate-400",
  emerald: "bg-emerald-500",
};

function SectionHeader({ icon: Icon, label, accent }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className={cn("h-2 w-2 rounded-full", ACCENT_DOT[accent])} />
      <Icon className={cn("h-4 w-4", ACCENT_TEXT[accent])} />
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
    </div>
  );
}

const KIND_DOT: Record<ActivityItem["kind"], string> = {
  user: "bg-primary",
  video: "bg-blue-500",
  scout: "bg-amber-500",
  build: "bg-emerald-500",
};

export function OwnerOverview({
  totalUsers,
  activeSubscriptions,
  totalVideosAnalyzed,
  avgScore,
  pendingAdminRequests,
  pendingScoutApplications,
  recentUsers,
  recentVideos,
  recentScoutApplications,
  onJump,
}: OwnerOverviewProps) {
  const navigate = useNavigate();
  const [opsHealth, setOpsHealth] = useState<{ open_critical: number; open_warning: number; last_beat_age_min: number | null; dispatch_failures_24h: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const since24 = new Date(Date.now() - 86_400_000).toISOString();
        const [alertsRes, beatRes, dispatchRes] = await Promise.all([
          (supabase as any).from('foundation_health_alerts').select('severity').is('resolved_at', null).limit(200),
          (supabase as any).from('foundation_cron_heartbeats').select('ran_at').order('ran_at', { ascending: false }).limit(1),
          (supabase as any).from('foundation_notification_dispatches').select('id', { count: 'exact', head: true }).in('status', ['dlq', 'config_invalid']).gte('dispatched_at', since24),
        ]);
        const open = (alertsRes.data ?? []) as Array<{ severity: string }>;
        const lastBeat = (beatRes.data ?? [])[0] as { ran_at: string } | undefined;
        setOpsHealth({
          open_critical: open.filter((a) => a.severity === 'critical').length,
          open_warning: open.filter((a) => a.severity === 'warning').length,
          last_beat_age_min: lastBeat ? Math.floor((Date.now() - new Date(lastBeat.ran_at).getTime()) / 60_000) : null,
          dispatch_failures_24h: (dispatchRes as any)?.count ?? 0,
        });
      } catch {
        setOpsHealth(null);
      }
    })();
  }, []);

  const opsHealthColor = opsHealth
    ? opsHealth.open_critical > 0 || opsHealth.dispatch_failures_24h > 0
      ? 'bg-rose-500'
      : opsHealth.open_warning > 0 || (opsHealth.last_beat_age_min ?? 0) > 120
        ? 'bg-amber-500'
        : 'bg-emerald-500'
    : 'bg-muted';

  const actionCards = [
    {
      show: pendingAdminRequests > 0,
      icon: UserCog,
      label: "Admin requests",
      count: pendingAdminRequests,
      onClick: () => onJump("admin-requests"),
    },
    {
      show: pendingScoutApplications > 0,
      icon: UserPlus,
      label: "Scout applications",
      count: pendingScoutApplications,
      onClick: () => onJump("scout-applications"),
    },
  ].filter((a) => a.show);

  const kpis: {
    label: string;
    value: number | string;
    icon: React.ElementType;
    tint: string;
    iconColor: string;
  }[] = [
    { label: "Users", value: totalUsers, icon: Users, tint: "bg-primary/5 border-primary/20", iconColor: "text-primary" },
    { label: "Active Subs", value: activeSubscriptions, icon: CreditCard, tint: "bg-emerald-500/5 border-emerald-500/20", iconColor: "text-emerald-600 dark:text-emerald-400" },
    { label: "Videos", value: totalVideosAnalyzed, icon: VideoIcon, tint: "bg-blue-500/5 border-blue-500/20", iconColor: "text-blue-600 dark:text-blue-400" },
    { label: "Avg Score", value: `${avgScore}%`, icon: Target, tint: "bg-amber-500/5 border-amber-500/20", iconColor: "text-amber-600 dark:text-amber-400" },
  ];

  const activity: ActivityItem[] = [
    ...recentUsers.slice(0, 4).map((u) => ({
      id: `u-${u.id}`,
      label: u.full_name || "New user",
      detail: "joined",
      ts: u.created_at,
      kind: "user" as const,
    })),
    ...recentVideos.slice(0, 4).map((v) => ({
      id: `v-${v.id}`,
      label: `${v.sport ?? "Video"} · ${v.module ?? "session"}`,
      detail: "analyzed",
      ts: v.created_at,
      kind: "video" as const,
    })),
    ...recentScoutApplications.slice(0, 4).map((s) => ({
      id: `s-${s.id}`,
      label: s.full_name || "Scout applicant",
      detail: s.status,
      ts: s.created_at,
      kind: "scout" as const,
    })),
  ]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 10);

  const fmtTs = (ts: string) => {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* ========== Needs Attention ========== */}
      {actionCards.length > 0 && (
        <section className="space-y-2">
          <SectionHeader icon={AlertCircle} label="Needs attention" accent="amber" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actionCards.map((a) => {
              const Icon = a.icon;
              return (
                <Card
                  key={a.label}
                  className="p-4 border-l-4 border-l-amber-500 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xl font-bold leading-none">{a.count}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{a.label}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={a.onClick} className="w-full sm:w-auto h-10 sm:h-9">
                    Review
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ========== At a Glance ========== */}
      <section className="space-y-2">
        <SectionHeader icon={BarChart3} label="At a glance" accent="blue" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <Card key={k.label} className={cn("p-3 border", k.tint)}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                    {k.label}
                  </span>
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", k.iconColor)} />
                </div>
                <p className="text-xl sm:text-2xl font-bold mt-1.5">{k.value}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ========== System Operations ========== */}
      <section className="space-y-2">
        <SectionHeader icon={ShieldCheck} label="System Operations" accent="emerald" />
        <Card className="p-4 border-l-4 border-l-emerald-500/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className={cn("h-3 w-3 rounded-full shrink-0", opsHealthColor)} />
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {opsHealth
                    ? opsHealth.open_critical > 0
                      ? `${opsHealth.open_critical} critical alert${opsHealth.open_critical > 1 ? 's' : ''} open`
                      : opsHealth.open_warning > 0
                        ? `${opsHealth.open_warning} warning${opsHealth.open_warning > 1 ? 's' : ''} open`
                        : 'All systems healthy'
                    : 'Loading system status…'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {opsHealth && opsHealth.last_beat_age_min != null
                    ? `Last cron heartbeat ${opsHealth.last_beat_age_min}m ago · ${opsHealth.dispatch_failures_24h} notification failures (24h)`
                    : 'Cron, alerts, retention rules, rollback procedures, runbook'}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/owner/foundations/health')} className="w-full sm:w-auto">
              Open Ops Hub
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </Card>
      </section>

      {/* ========== Activity + Quick Actions ========== */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="space-y-2 lg:col-span-2">
          <SectionHeader icon={Activity} label="Recent activity" accent="slate" />
          <Card className="p-4 border-l-4 border-l-slate-400/60">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No recent activity yet.</p>
            ) : (
              <ul className="divide-y">
                {activity.map((a) => (
                  <li key={a.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", KIND_DOT[a.kind])} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.label}</p>
                        <p className="text-xs text-muted-foreground capitalize">{a.detail}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{fmtTs(a.ts)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section className="space-y-2">
          <SectionHeader icon={Zap} label="Quick actions" accent="emerald" />
          <Card className="p-4 border-l-4 border-l-emerald-500/60">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Create</p>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start h-10"
                onClick={() => navigate("/owner/open_program_builder")}
              >
                <Plus className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
                New Program
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-10"
                onClick={() => navigate("/owner/open_bundle_builder")}
              >
                <Plus className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
                New Bundle
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-10"
                onClick={() => navigate("/owner/open_consultation_flow")}
              >
                <Plus className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
                New Consultation
              </Button>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-2">Jump to</p>
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start h-10"
                onClick={() => onJump("player-search")}
              >
                <Search className="h-4 w-4 mr-2" />
                Player Search
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-10"
                onClick={() => onJump("engine-settings")}
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                Engine Settings
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
