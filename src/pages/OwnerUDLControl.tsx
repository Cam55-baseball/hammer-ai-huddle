import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { supabase } from '@/integrations/supabase/client';
import { ConstraintEditor } from '@/components/udl/ConstraintEditor';
import { PrescriptionEditor } from '@/components/udl/PrescriptionEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, BarChart3, ScrollText } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function OwnerUDLControl() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isOwner, isLoading: ownerLoading } = useOwnerAccess();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !ownerLoading && (!user || !isOwner)) {
      navigate('/dashboard');
    }
  }, [user, authLoading, ownerLoading, isOwner, navigate]);

  const overridesQuery = useQuery({
    queryKey: ['udl-overrides'],
    queryFn: async () => {
      const { data } = await supabase
        .from('udl_constraint_overrides')
        .select('*');
      return data ?? [];
    },
    enabled: !!user && isOwner,
  });

  const statsQuery = useQuery({
    queryKey: ['udl-system-stats'],
    queryFn: async () => {
      const [plansRes, completionsRes, alertsRes] = await Promise.all([
        supabase.from('udl_daily_plans').select('id', { count: 'exact', head: true }),
        supabase.from('udl_drill_completions').select('id, completed_at', { count: 'exact' }),
        supabase.from('udl_alerts').select('alert_type'),
      ]);

      const totalPlans = plansRes.count ?? 0;
      const completions = completionsRes.data ?? [];
      const totalCompletions = completions.filter((c: any) => c.completed_at).length;
      const totalStarted = completions.length;
      const compliancePct = totalStarted > 0 ? Math.round((totalCompletions / totalStarted) * 100) : 0;

      const alertsByType: Record<string, number> = {};
      (alertsRes.data ?? []).forEach((a: any) => {
        alertsByType[a.alert_type] = (alertsByType[a.alert_type] ?? 0) + 1;
      });

      return { totalPlans, compliancePct, totalCompletions, alertsByType };
    },
    enabled: !!user && isOwner,
  });

  const auditQuery = useQuery({
    queryKey: ['udl-audit-log'],
    queryFn: async () => {
      const { data } = await supabase
        .from('udl_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user && isOwner,
  });

  if (authLoading || ownerLoading || overridesQuery.isLoading) {
    return (
      <DashboardLayout title="UDL Control">
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  const stats = statsQuery.data;
  const overrides = overridesQuery.data ?? [];

  return (
    <DashboardLayout title="UDL Control">
      <div className="space-y-6 p-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">UDL Intelligence Control Panel</h1>
            <p className="text-sm text-muted-foreground">
              Override constraints, prescriptions, and monitor system health
            </p>
          </div>
        </div>

        {/* System Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{stats.totalPlans}</p>
                <p className="text-xs text-muted-foreground">Plans Generated</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{stats.compliancePct}%</p>
                <p className="text-xs text-muted-foreground">Avg Compliance</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{stats.totalCompletions}</p>
                <p className="text-xs text-muted-foreground">Drills Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">
                  {Object.values(stats.alertsByType).reduce((a: number, b: number) => a + b, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Alerts</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Constraint Editor */}
        <ConstraintEditor
          overrides={overrides as any[]}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['udl-overrides'] })}
        />

        {/* Prescription Editor */}
        <PrescriptionEditor overrides={overrides as any[]} />

        {/* Audit Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              Recent UDL Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(auditQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {(auditQuery.data ?? []).map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between text-xs border-b pb-1">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium capitalize">{entry.action.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
