import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RankingsTable } from "@/components/RankingsTable";
import { RankingsFilters } from "@/components/RankingsFilters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface RankingData {
  user_id: string;
  full_name: string;
  sport: string;
  module: string;
  videos_analyzed: number;
  average_efficiency_score: number;
  last_activity: string;
}

export default function Rankings() {
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchRankings = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("user_progress")
        .select(`
          user_id,
          sport,
          module,
          videos_analyzed,
          average_efficiency_score,
          last_activity,
          profiles!inner(full_name)
        `)
        .order("average_efficiency_score", { ascending: false });

      if (selectedSport !== "all") {
        query = query.eq("sport", selectedSport as "baseball" | "softball");
      }

      if (selectedModule !== "all") {
        query = query.eq("module", selectedModule as "hitting" | "pitching" | "throwing");
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data.map((item: any) => ({
        user_id: item.user_id,
        full_name: item.profiles.full_name || "Anonymous",
        sport: item.sport,
        module: item.module,
        videos_analyzed: item.videos_analyzed,
        average_efficiency_score: item.average_efficiency_score || 0,
        last_activity: item.last_activity,
      }));

      setRankings(formattedData);
    } catch (error) {
      console.error("Error fetching rankings:", error);
      toast({
        title: "Error",
        description: "Failed to load rankings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [selectedSport, selectedModule]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("rankings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_progress",
        },
        () => {
          fetchRankings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSport, selectedModule]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rankings</h1>
          <p className="text-muted-foreground">
            See how you stack up against other athletes
          </p>
        </div>

        <RankingsFilters
          selectedSport={selectedSport}
          selectedModule={selectedModule}
          onSportChange={setSelectedSport}
          onModuleChange={setSelectedModule}
        />

        <RankingsTable
          rankings={rankings}
          loading={loading}
          currentUserId={user?.id}
        />
      </div>
    </DashboardLayout>
  );
}
