import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users2, Target } from "lucide-react";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface ModuleStats {
  module: string;
  count: number;
  percentage: number;
}

interface SubscriptionStats {
  totalActiveSubscribers: number;
  moduleBreakdown: ModuleStats[];
}

export default function Subscribers() {
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<SubscriptionStats>({
      totalActiveSubscribers: 0,
      moduleBreakdown: [],
    });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerLoading && session && !isOwner) {
      toast({
        title: "Access Denied",
        description: "Only owners can view subscriber analytics.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [isOwner, ownerLoading, session, navigate, toast]);

  const fetchSubscriptionStats = async () => {
    try {
      const { data: activeSubscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("subscribed_modules, status")
        .eq("status", "active");

      if (subsError) throw subsError;

      const moduleCount: Record<string, number> = {
        hitting: 0,
        pitching: 0,
        throwing: 0,
      };

      activeSubscriptions?.forEach((sub) => {
        sub.subscribed_modules?.forEach((module: string) => {
          const moduleName = module.includes("_") ? module.split("_")[1] : module;
          if (moduleName in moduleCount) {
            moduleCount[moduleName]++;
          }
        });
      });

      const totalActive = activeSubscriptions?.length || 0;

      setStats({
        totalActiveSubscribers: totalActive,
        moduleBreakdown: Object.entries(moduleCount).map(([module, count]) => ({
          module: module.charAt(0).toUpperCase() + module.slice(1),
          count,
          percentage: totalActive > 0 ? (count / totalActive) * 100 : 0,
        })),
      });
    } catch (error) {
      console.error("Error fetching subscription stats:", error);
      toast({
        title: "Error",
        description: "Failed to load subscriber statistics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner && session) {
      fetchSubscriptionStats();

      const channel = supabase
        .channel("subscription-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "subscriptions",
          },
          () => {
            fetchSubscriptionStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOwner, session]);

  if (ownerLoading || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-1">
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isOwner) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Subscriber Analytics</h1>
          <p className="text-muted-foreground">Active subscribers and module breakdown</p>
        </div>

        <div className="grid gap-4 md:grid-cols-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
              <Users2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActiveSubscribers}</div>
            </CardContent>
          </Card>
        </div>

        {stats.totalActiveSubscribers === 0 ? (
          <Card className="p-8 text-center">
            <Users2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Subscribers Yet</h3>
            <p className="text-muted-foreground">
              Subscriber data will appear here once users start subscribing to modules.
            </p>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Module Subscriptions</CardTitle>
              <CardDescription>Breakdown of subscribers by training module</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.moduleBreakdown.map((module) => (
                  <div key={module.module} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        <span className="font-medium">{module.module}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{module.count}</div>
                        <div className="text-xs text-muted-foreground">
                          {module.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <Progress value={module.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
