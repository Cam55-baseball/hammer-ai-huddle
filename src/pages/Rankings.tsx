import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RankingsTable } from "@/components/RankingsTable";
import { RankingsFilters } from "@/components/RankingsFilters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getGradeLabel } from "@/lib/gradeLabel";

export interface MPIRankingData {
  user_id: string;
  full_name: string;
  sport: string;
  adjusted_global_score: number | null;
  global_rank: number | null;
  global_percentile: number | null;
  trend_direction: string | null;
  trend_delta_30d: number | null;
  segment_pool: string | null;
}

export default function Rankings() {
  const { t } = useTranslation();
  const [rankings, setRankings] = useState<MPIRankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState<string>("baseball");
  const [selectedSegment, setSelectedSegment] = useState<string>("all");
  const [userRank, setUserRank] = useState<MPIRankingData | null>(null);
  const { user } = useAuth();

  const fetchRankings = async () => {
    try {
      setLoading(true);

      // First, get the latest calculation_date for this sport
      const { data: latestRow } = await supabase
        .from("mpi_scores")
        .select("calculation_date")
        .eq("sport", selectedSport)
        .order("calculation_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const latestDate = latestRow?.calculation_date;
      if (!latestDate) {
        setRankings([]);
        setUserRank(null);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("mpi_scores")
        .select(`
          user_id,
          sport,
          adjusted_global_score,
          global_rank,
          global_percentile,
          trend_direction,
          trend_delta_30d,
          segment_pool
        `)
        .eq("sport", selectedSport)
        .eq("calculation_date", latestDate)
        .not("adjusted_global_score", "is", null)
        .order("global_rank", { ascending: true, nullsFirst: false })
        .limit(100);

      if (selectedSegment !== "all") {
        query = query.ilike("segment_pool", `%${selectedSegment}%`);
      }

      const { data: mpiData, error } = await query;
      if (error) throw error;

      // Get user IDs to fetch names
      const userIds = (mpiData || []).map((d) => d.user_id);
      let profilesMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("id, full_name")
          .in("id", userIds);

        if (profiles) {
          profilesMap = Object.fromEntries(
            profiles.map((p) => [p.id, p.full_name || "Anonymous"])
          );
        }
      }

      const ranked: MPIRankingData[] = (mpiData || []).map((d) => ({
        ...d,
        full_name: profilesMap[d.user_id] || "Anonymous",
      }));

      setRankings(ranked);

      // Find current user's rank
      if (user) {
        const found = ranked.find((r) => r.user_id === user.id);
        if (found) {
          setUserRank(found);
        } else {
          // User might not be in top 100, fetch separately
          const { data: userMpi } = await supabase
            .from("mpi_scores")
            .select("user_id, sport, adjusted_global_score, global_rank, global_percentile, trend_direction, trend_delta_30d, segment_pool")
            .eq("user_id", user.id)
            .eq("sport", selectedSport)
            .order("calculation_date", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (userMpi) {
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", user.id)
              .maybeSingle();

            setUserRank({
              ...userMpi,
              full_name: userProfile?.full_name || "You",
            });
          } else {
            setUserRank(null);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching rankings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [selectedSport, selectedSegment, user?.id]);

  // Realtime subscription on mpi_scores
  useEffect(() => {
    const channel = supabase
      .channel("rankings-mpi-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mpi_scores" },
        () => fetchRankings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSport, selectedSegment, user?.id]);

  const TrendIcon = userRank?.trend_direction === "rising" ? TrendingUp : userRank?.trend_direction === "dropping" ? TrendingDown : Minus;
  const trendColor = userRank?.trend_direction === "rising" ? "text-green-500" : userRank?.trend_direction === "dropping" ? "text-red-500" : "text-muted-foreground";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("rankings.title")}</h1>
          <p className="text-muted-foreground">{t("rankings.subtitle")}</p>
        </div>

        <Card className="relative overflow-hidden border-red-700 bg-gradient-to-r from-red-600 via-red-500 to-red-700 bg-[length:200%_200%] animate-gradient-shift">
          <CardContent className="py-4">
            <p className="text-white text-center font-montserrat font-extrabold text-xl md:text-2xl tracking-wider uppercase leading-relaxed drop-shadow-lg">
              {t("rankings.missionStatement")}
            </p>
          </CardContent>
        </Card>

        {/* Sport Tabs */}
        <Tabs value={selectedSport} onValueChange={setSelectedSport}>
          <TabsList>
            <TabsTrigger value="baseball">{t("dashboard.baseball")}</TabsTrigger>
            <TabsTrigger value="softball">{t("dashboard.softball")}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Your Rank Card */}
        {userRank && userRank.adjusted_global_score != null && (
          <Card className="border-primary/30 bg-accent/20">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{t("rankings.yourRank")}</p>
                    <p className="text-2xl font-bold">
                      #{userRank.global_rank ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t("rankings.mpiScore")}</p>
                  <p className="text-xl font-bold">{Math.round(userRank.adjusted_global_score)}</p>
                  <p className="text-xs text-primary font-medium">{getGradeLabel(userRank.adjusted_global_score)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t("rankings.percentile")}</p>
                  <p className="text-xl font-bold">
                    {userRank.global_percentile != null ? `${Math.round(userRank.global_percentile)}th` : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <TrendIcon className={`h-5 w-5 ${trendColor}`} />
                  {userRank.trend_delta_30d != null && (
                    <span className={`text-sm font-medium ${trendColor}`}>
                      {userRank.trend_delta_30d > 0 ? "+" : ""}
                      {userRank.trend_delta_30d.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <RankingsFilters
          selectedSegment={selectedSegment}
          onSegmentChange={setSelectedSegment}
        />

        <div>
          <h2 className="text-lg font-semibold mb-3">{t("rankings.top100")}</h2>
          <RankingsTable
            rankings={rankings}
            loading={loading}
            currentUserId={user?.id}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
