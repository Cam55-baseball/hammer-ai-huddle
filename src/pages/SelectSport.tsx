import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SelectSport = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    if (!userRole) {
      // No role selected, go back to role selection
      navigate('/select-user-role');
    } else if (userRole === 'scout') {
      // Scouts shouldn't be here, redirect to dashboard
      navigate('/scout-dashboard');
    }
  }, [userRole, navigate]);

  const handleSportSelect = (sport: 'baseball' | 'softball') => {
    localStorage.setItem('selectedSport', sport);
    // Players continue to module selection
    navigate("/select-modules", { state: { sport } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl">H</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Select Your Sport</h1>
          <p className="text-muted-foreground">
            Choose the sport you want to analyze and improve
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full">Sport</span>
            <span>→</span>
            <span>Role</span>
            <span>→</span>
            <span>Module</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card 
            className="p-8 cursor-pointer hover:border-primary transition-all hover:shadow-lg"
            onClick={() => handleSportSelect('baseball')}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">⚾</div>
              <h2 className="text-2xl font-bold mb-2">Baseball</h2>
              <p className="text-muted-foreground mb-6">
                Advanced motion capture analysis for baseball players
              </p>
              <Button size="lg" className="w-full">
                Select Baseball
              </Button>
            </div>
          </Card>

          <Card 
            className="p-8 cursor-pointer hover:border-primary transition-all hover:shadow-lg"
            onClick={() => handleSportSelect('softball')}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🥎</div>
              <h2 className="text-2xl font-bold mb-2">Softball</h2>
              <p className="text-muted-foreground mb-6">
                Advanced motion capture analysis for softball players
              </p>
              <Button size="lg" className="w-full">
                Select Softball
              </Button>
            </div>
          </Card>
        </div>

        <div className="text-center mt-6">
          <Button variant="ghost" onClick={() => navigate("/select-user-role")}>
            ← Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SelectSport;
