import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function SelectSportScout() {
  const navigate = useNavigate();
  const [selectedSport, setSelectedSport] = useState<"baseball" | "softball" | null>(null);

  const handleContinue = () => {
    if (!selectedSport) return;
    localStorage.setItem("scoutSport", selectedSport);
    navigate("/scout-application");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-4xl p-8 sm:p-12">
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold">Which Sport Do You Coach/Scout?</h1>
            <p className="text-muted-foreground text-lg">
              Select the sport you'll be working with
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <button
              onClick={() => setSelectedSport("baseball")}
              className={`group relative overflow-hidden rounded-xl border-2 transition-all ${
                selectedSport === "baseball"
                  ? "border-primary bg-primary/10 shadow-lg scale-105"
                  : "border-border hover:border-primary/50 hover:scale-102"
              }`}
            >
              <div className="p-8 space-y-4">
                <div className="text-6xl">⚾</div>
                <h3 className="text-2xl font-bold">Baseball</h3>
                <p className="text-sm text-muted-foreground">
                  Scout and coach baseball players
                </p>
              </div>
            </button>

            <button
              onClick={() => setSelectedSport("softball")}
              className={`group relative overflow-hidden rounded-xl border-2 transition-all ${
                selectedSport === "softball"
                  ? "border-primary bg-primary/10 shadow-lg scale-105"
                  : "border-border hover:border-primary/50 hover:scale-102"
              }`}
            >
              <div className="p-8 space-y-4">
                <div className="text-6xl">🥎</div>
                <h3 className="text-2xl font-bold">Softball</h3>
                <p className="text-sm text-muted-foreground">
                  Scout and coach softball players
                </p>
              </div>
            </button>
          </div>

          <div className="flex gap-4 pt-6">
            <Button
              variant="outline"
              onClick={() => navigate("/select-user-role")}
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!selectedSport}
              className="flex-1"
            >
              Continue
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
