import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircleDot, Target, Zap, Upload, Lock } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FollowRequestsPanel } from "@/components/FollowRequestsPanel";

type ModuleType = "hitting" | "pitching" | "throwing";
type SportType = "baseball" | "softball";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { modules: subscribedModules, loading: subLoading, refetch, hasAccessForSport } = useSubscription();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const navigate = useNavigate();
  const [selectedSport, setSelectedSport] = useState<SportType>(() => {
    const saved = localStorage.getItem('selectedSport');
    return (saved as SportType) || "baseball";
  });
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    refetch();
    loadProgress();
  }, [authLoading, user, navigate]);

  const loadProgress = async () => {
    try {
      const progressResponse = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user!.id);

      if (progressResponse.error) throw progressResponse.error;
      setProgress(progressResponse.data || []);
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSportChange = (sport: string) => {
    const newSport = sport as SportType;
    setSelectedSport(newSport);
    localStorage.setItem('selectedSport', newSport);
  };

  const handleModuleSelect = (module: ModuleType) => {
    const isOwnerOrAdmin = isOwner || isAdmin;
    const hasAccess = hasAccessForSport(module, selectedSport, isOwnerOrAdmin);
    
    if (!hasAccess) {
      localStorage.setItem('pendingModule', module);
      localStorage.setItem('pendingSport', selectedSport);
      navigate("/pricing", { 
        state: { mode: 'add', sport: selectedSport, module: module } 
      });
      return;
    }
    
    navigate(`/analyze/${module}?sport=${selectedSport}`);
  };

  const getModuleProgress = (module: ModuleType) => {
    return progress.find((p) => p.module === module && p.sport === selectedSport);
  };

  if (authLoading || loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FollowRequestsPanel />
        
        <div>
          <h1 className="text-3xl font-bold text-foreground">Training Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.user_metadata?.full_name}</p>
        </div>

        {/* Sport Selector */}
        <Tabs value={selectedSport} onValueChange={handleSportChange}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="baseball">Baseball</TabsTrigger>
            <TabsTrigger value="softball">Softball</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Module Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Hitting Module */}
          <Card
            className={`p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] ${
              !hasAccessForSport("hitting", selectedSport, isOwner || isAdmin) ? "opacity-60" : ""
            }`}
            onClick={() => handleModuleSelect("hitting")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Target className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                Hitting
                {!hasAccessForSport("hitting", selectedSport, isOwner || isAdmin) && <Lock className="h-5 w-5" />}
              </h3>
              <p className="text-muted-foreground">
                Analyze swing mechanics, kinetic sequence, and bat speed
              </p>
              {getModuleProgress("hitting") && hasAccessForSport("hitting", selectedSport, isOwner || isAdmin) && (
                <div className="text-sm">
                  <p className="font-semibold">
                    Videos Analyzed: {getModuleProgress("hitting").videos_analyzed}
                  </p>
                  <p>
                    Avg Score: {getModuleProgress("hitting").average_efficiency_score || "N/A"}
                  </p>
                </div>
              )}
              <Button 
                className="w-full" 
                variant={hasAccessForSport("hitting", selectedSport, isOwner || isAdmin) ? "default" : "outline"}
              >
                {hasAccessForSport("hitting", selectedSport, isOwner || isAdmin) ? (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Start Analysis
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Subscribe
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Pitching Module */}
          <Card
            className={`p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] ${
              !hasAccessForSport("pitching", selectedSport, isOwner || isAdmin) ? "opacity-60" : ""
            }`}
            onClick={() => handleModuleSelect("pitching")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10">
                <CircleDot className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                Pitching
                {!hasAccessForSport("pitching", selectedSport, isOwner || isAdmin) && <Lock className="h-5 w-5" />}
              </h3>
              <p className="text-muted-foreground">
                Analyze delivery mechanics, arm action, and sequencing
              </p>
              {getModuleProgress("pitching") && hasAccessForSport("pitching", selectedSport, isOwner || isAdmin) && (
                <div className="text-sm">
                  <p className="font-semibold">
                    Videos Analyzed: {getModuleProgress("pitching").videos_analyzed}
                  </p>
                  <p>
                    Avg Score: {getModuleProgress("pitching").average_efficiency_score || "N/A"}
                  </p>
                </div>
              )}
              <Button 
                className="w-full" 
                variant={hasAccessForSport("pitching", selectedSport, isOwner || isAdmin) ? "default" : "outline"}
              >
                {hasAccessForSport("pitching", selectedSport, isOwner || isAdmin) ? (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Start Analysis
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Subscribe
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Throwing Module */}
          <Card
            className={`p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] ${
              !hasAccessForSport("throwing", selectedSport, isOwner || isAdmin) ? "opacity-60" : ""
            }`}
            onClick={() => handleModuleSelect("throwing")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Zap className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                Throwing
                {!hasAccessForSport("throwing", selectedSport, isOwner || isAdmin) && <Lock className="h-5 w-5" />}
              </h3>
              <p className="text-muted-foreground">
                Analyze arm action, footwork, and energy transfer
              </p>
              {getModuleProgress("throwing") && hasAccessForSport("throwing", selectedSport, isOwner || isAdmin) && (
                <div className="text-sm">
                  <p className="font-semibold">
                    Videos Analyzed: {getModuleProgress("throwing").videos_analyzed}
                  </p>
                  <p>
                    Avg Score: {getModuleProgress("throwing").average_efficiency_score || "N/A"}
                  </p>
                </div>
              )}
              <Button 
                className="w-full" 
                variant={hasAccessForSport("throwing", selectedSport, isOwner || isAdmin) ? "default" : "outline"}
              >
                {hasAccessForSport("throwing", selectedSport, isOwner || isAdmin) ? (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Start Analysis
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Subscribe
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
