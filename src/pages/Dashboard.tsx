import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircleDot, Target, Zap, Upload } from "lucide-react";

type ModuleType = "hitting" | "pitching" | "throwing";
type SportType = "baseball" | "softball";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedModule, setSelectedModule] = useState<ModuleType | null>(null);
  const [selectedSport, setSelectedSport] = useState<SportType>("baseball");
  const [progress, setProgress] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    loadProgress();
  }, [user, navigate]);

  const loadProgress = async () => {
    try {
      const [progressResponse, subResponse] = await Promise.all([
        supabase.from("user_progress").select("*").eq("user_id", user!.id),
        supabase.from("subscriptions").select("*").eq("user_id", user!.id).maybeSingle(),
      ]);

      if (progressResponse.error) throw progressResponse.error;
      setProgress(progressResponse.data || []);
      setSubscription(subResponse.data);
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleModuleSelect = (module: ModuleType) => {
    setSelectedModule(module);
    navigate(`/analyze/${module}?sport=${selectedSport}`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getModuleProgress = (module: ModuleType) => {
    return progress.find((p) => p.module === module && p.sport === selectedSport);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CircleDot className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">MoCap Training</h1>
              {subscription && (
                <div className="mt-1">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {subscription.plan === "free"
                      ? `Free Trial: ${subscription.videos_remaining} analyses left`
                      : `Plan: ${subscription.plan}`}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Sport Selector */}
        <div className="mb-8">
          <Tabs value={selectedSport} onValueChange={(v) => setSelectedSport(v as SportType)}>
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="baseball">Baseball</TabsTrigger>
              <TabsTrigger value="softball">Softball</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Welcome Section */}
        <section className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Welcome back, {user?.user_metadata?.full_name || "Player"}!
          </h2>
          <p className="text-xl text-muted-foreground">
            Select a module to analyze your technique
          </p>
        </section>

        {/* Module Cards */}
        <section className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Hitting Module */}
          <Card
            className="p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
            onClick={() => handleModuleSelect("hitting")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Target className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Hitting</h3>
              <p className="text-muted-foreground">
                Analyze swing mechanics, kinetic sequence, and bat speed
              </p>
              {getModuleProgress("hitting") && (
                <div className="text-sm">
                  <p className="font-semibold">
                    Videos Analyzed: {getModuleProgress("hitting").videos_analyzed}
                  </p>
                  <p>
                    Avg Score: {getModuleProgress("hitting").average_efficiency_score || "N/A"}
                  </p>
                </div>
              )}
              <Button className="w-full" variant="default">
                <Upload className="h-4 w-4 mr-2" />
                Start Analysis
              </Button>
            </div>
          </Card>

          {/* Pitching Module */}
          <Card
            className="p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
            onClick={() => handleModuleSelect("pitching")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10">
                <CircleDot className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Pitching</h3>
              <p className="text-muted-foreground">
                Analyze delivery mechanics, arm action, and sequencing
              </p>
              {getModuleProgress("pitching") && (
                <div className="text-sm">
                  <p className="font-semibold">
                    Videos Analyzed: {getModuleProgress("pitching").videos_analyzed}
                  </p>
                  <p>
                    Avg Score: {getModuleProgress("pitching").average_efficiency_score || "N/A"}
                  </p>
                </div>
              )}
              <Button className="w-full" variant="default">
                <Upload className="h-4 w-4 mr-2" />
                Start Analysis
              </Button>
            </div>
          </Card>

          {/* Throwing Module */}
          <Card
            className="p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
            onClick={() => handleModuleSelect("throwing")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Zap className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Throwing</h3>
              <p className="text-muted-foreground">
                Analyze arm action, footwork, and energy transfer
              </p>
              {getModuleProgress("throwing") && (
                <div className="text-sm">
                  <p className="font-semibold">
                    Videos Analyzed: {getModuleProgress("throwing").videos_analyzed}
                  </p>
                  <p>
                    Avg Score: {getModuleProgress("throwing").average_efficiency_score || "N/A"}
                  </p>
                </div>
              )}
              <Button className="w-full" variant="default">
                <Upload className="h-4 w-4 mr-2" />
                Start Analysis
              </Button>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
