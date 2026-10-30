import { HMLoadingFallback } from "@/components/loading/HMLoadingScreen";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users2, Target, Search } from "lucide-react";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SubscriberManagementTable } from "@/components/SubscriberManagementTable";
import { subscriberBreakdown } from "@/lib/owner/subscriberBreakdown";

interface ModuleStats {
  module: string;
  rawModule?: string;
  count: number;
  percentage: number;
}

interface SubscriptionStats {
  totalActiveSubscribers: number;
  moduleBreakdown: ModuleStats[];
}

type SportFilter = "all" | "baseball" | "softball";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [sportFilter, setSportFilter] = useState<SportFilter>("all");
  const [searchLoading, setSearchLoading] = useState(false);

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
        .select("user_id, tier, subscribed_modules, status")
        .eq("status", "active");

      if (subsError) throw subsError;

      const [staff, sponsored] = await Promise.all([
        supabase.from("staff_plans").select("user_id, plan, included_seats, extra_seats").in("status", ["active", "trialing"]),
        supabase.from("org_sponsorships").select("player_id, tier").eq("status", "active"),
      ]);
      if (staff.error) throw staff.error;
      if (sponsored.error) throw sponsored.error;
      setStats(subscriberBreakdown(activeSubscriptions ?? [], staff.data ?? [], sponsored.data ?? []));
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

  const searchUsers = async (query: string) => {
    setSearchLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-search-users", {
        body: { searchQuery: query },
      });

      if (error) throw error;

      setSearchResults(data.users || []);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Error",
        description: "Failed to search users.",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner && session) {
      fetchSubscriptionStats();
      searchUsers(""); // Load all users initially

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
            searchUsers(searchQuery);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOwner, session]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (isOwner && session) {
        searchUsers(searchQuery);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, isOwner, session]);

  const handleRefresh = () => {
    fetchSubscriptionStats();
    searchUsers(searchQuery);
  };

  const getFilteredStats = () => {
    if (sportFilter === "all") return stats;

    const filteredBreakdown = stats.moduleBreakdown.filter(module =>
      module.module.toLowerCase().startsWith(sportFilter)
    );

    return {
      ...stats,
      moduleBreakdown: filteredBreakdown,
    };
  };

  if (ownerLoading || loading)  return <HMLoadingFallback />;

  if (!isOwner) {
    return null;
  }

  const filteredStats = getFilteredStats();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Subscriber Analytics</h1>
          <p className="text-muted-foreground">Active subscribers and module breakdown</p>
          <AllAccountsLine />
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

        <Card>
          <CardHeader>
            <CardTitle>Sport Filter</CardTitle>
            <CardDescription>Filter statistics and users by sport</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={sportFilter === "all" ? "default" : "outline"}
                onClick={() => setSportFilter("all")}
              >
                All
              </Button>
              <Button
                variant={sportFilter === "baseball" ? "default" : "outline"}
                onClick={() => setSportFilter("baseball")}
                className={sportFilter === "baseball" ? "bg-blue-500" : ""}
              >
                Baseball
              </Button>
              <Button
                variant={sportFilter === "softball" ? "default" : "outline"}
                onClick={() => setSportFilter("softball")}
                className={sportFilter === "softball" ? "bg-pink-500" : ""}
              >
                Softball
              </Button>
            </div>
          </CardContent>
        </Card>

        {filteredStats.moduleBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Current plans</CardTitle>
              <CardDescription>Player plans, Coach, Organization seats and sponsorships</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredStats.moduleBreakdown.map((module) => (
                  <div key={module.rawModule || module.module} className="space-y-2">
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

        <Card>
          <CardHeader>
            <CardTitle>Subscriber Management</CardTitle>
            <CardDescription>Search, view, and manage subscriber accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or user ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleRefresh} variant="outline">
                Refresh
              </Button>
            </div>

            {searchLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <SubscriberManagementTable
                subscribers={searchResults}
                onRefresh={handleRefresh}
                sportFilter={sportFilter}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

/** Owner Oct30: unpaid and not-yet-onboarded accounts must be visible too. */
function AllAccountsLine() {
  const [counts, setCounts] = useState<{ total: number; paid: number } | null>(null);
  useEffect(() => {
    void (async () => {
      const [{ count: total }, { data: subs }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("user_id").eq("status", "active"),
      ]);
      setCounts({ total: total ?? 0, paid: new Set((subs ?? []).map((r: any) => r.user_id)).size });
    })();
  }, []);
  if (!counts) return null;
  return <p className="mt-1 text-sm">All accounts: {counts.total} · Not paid yet: {Math.max(0, counts.total - counts.paid)} · <a className="text-primary underline" href="/owner?section=users">See every account and its status</a></p>;
}
