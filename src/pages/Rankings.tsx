import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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

      // Normalize response - handle both direct array and wrapped object formats
      const normalizedRankings = Array.isArray(data) 
        ? data 
        : Array.isArray(data?.data) 
          ? data.data 
          : [];

      // Check if rankings are disabled
      if (data?.disabled) {
        setRankingsDisabled(true);
        setRankings([]);
      } else {
        setRankingsDisabled(false);
        setRankings(normalizedRankings);
      }
    } catch (error) {
      console.error("Error fetching rankings:", error);
      toast({
        title: t('common.error'),
        description: t('rankings.failedToLoad'),
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
        <h1 className="text-3xl font-bold text-foreground">{t('rankings.title')}</h1>
        <p className="text-muted-foreground">
          {t('rankings.subtitle')}
        </p>
      </div>

      <Card className="relative overflow-hidden border-red-700 bg-gradient-to-r from-red-600 via-red-500 to-red-700 bg-[length:200%_200%] animate-gradient-shift">
        <CardContent className="py-4">
          <p className="text-white text-center font-montserrat font-extrabold text-xl md:text-2xl tracking-wider uppercase leading-relaxed drop-shadow-lg">
            {t('rankings.missionStatement')}
          </p>
        </CardContent>
      </Card>

      {rankingsDisabled ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lock className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('rankings.unavailable')}</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {t('rankings.disabledMessage')}
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
