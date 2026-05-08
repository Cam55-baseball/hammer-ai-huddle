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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
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

  const actionCards = [
    {
      show: pendingAdminRequests > 0,
      icon: UserCog,
      label: "Pending admin requests",
      count: pendingAdminRequests,
      cta: "Review",
      onClick: () => onJump("admin-requests"),
    },
    {
      show: pendingScoutApplications > 0,
      icon: UserPlus,
      label: "Pending scout applications",
      count: pendingScoutApplications,
      cta: "Review",
      onClick: () => onJump("scout-applications"),
    },
  ].filter((a) => a.show);

  const kpis = [
    { label: "Users", value: totalUsers, icon: Users },
    { label: "Active Subs", value: activeSubscriptions, icon: CreditCard },
    { label: "Videos", value: totalVideosAnalyzed, icon: VideoIcon },
    { label: "Avg Score", value: `${avgScore}%`, icon: Target },
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
      {/* Action queue */}
      {actionCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actionCards.map((a) => {
            const Icon = a.icon;
            return (
              <Card
                key={a.label}
                className="p-4 flex items-center justify-between gap-4 border-amber-500/40 bg-amber-500/5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold leading-none">{a.count}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{a.label}</p>
                  </div>
                </div>
                <Button size="sm" onClick={a.onClick}>
                  {a.cta}
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Compact KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {k.label}
                </span>
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-1.5">{k.value}</p>
            </Card>
          );
        })}
      </div>

      {/* Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </h3>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No recent activity yet.</p>
          ) : (
            <ul className="divide-y">
              {activity.map((a) => (
                <li key={a.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.label}</p>
                    <p className="text-xs text-muted-foreground capitalize">{a.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{fmtTs(a.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/owner/open_program_builder")}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Program
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/owner/open_bundle_builder")}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Bundle
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/owner/open_consultation_flow")}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Consultation
            </Button>
            <div className="h-px bg-border my-2" />
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => onJump("player-search")}
            >
              <Search className="h-4 w-4 mr-2" />
              Player Search
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => onJump("engine-settings")}
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Engine Settings
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
