import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RankingsTable } from "@/components/RankingsTable";
import { RankingsFilters } from "@/components/RankingsFilters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";

interface RankingData {
  user_id: string;
  full_name: string;
  sport: string;
  module: string;
  videos_analyzed: number;
  last_activity: string;
}

export default function Rankings() {
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [rankingsDisabled, setRankingsDisabled] = useState(false);
  const { user, session } = useAuth();
  const { toast } = useToast();

  const fetchRankings = async () => {
    if (!session?.access_token) {
      console.log("No session available, skipping rankings fetch");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('get-rankings', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          sport: selectedSport,
          module: selectedModule,
        },
      });

      if (error) throw error;

      // Check if rankings are disabled
      if (data?.disabled) {
        setRankingsDisabled(true);
        setRankings([]);
      } else {
        setRankingsDisabled(false);
        setRankings(data || []);
      }
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
    if (session?.access_token) {
      fetchRankings();
    }
  }, [selectedSport, selectedModule, session?.access_token]);

  // Set up realtime subscription
  useEffect(() => {
    if (!session?.access_token) return;

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
  }, [selectedSport, selectedModule, session?.access_token]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rankings</h1>
          <p className="text-muted-foreground">
            See how you stack up against other athletes
          </p>
        </div>

        {rankingsDisabled ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lock className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Rankings Currently Unavailable</h3>
              <p className="text-muted-foreground text-center max-w-md">
                The rankings feature is currently disabled. Please check back later.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
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
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
