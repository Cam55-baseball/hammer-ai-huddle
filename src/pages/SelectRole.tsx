import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Users, Target } from "lucide-react";

const SelectRole = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedSport = (location.state as { sport?: string })?.sport || localStorage.getItem('selectedSport');

  useEffect(() => {
    if (!selectedSport) {
      navigate("/select-sport");
    }
  }, [selectedSport, navigate]);

  const handleRoleSelect = (role: string) => {
    localStorage.setItem('selectedRole', role);
    navigate("/select-modules", { state: { sport: selectedSport, role } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl">H</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Select Your Role</h1>
          <p className="text-muted-foreground">
            Choose your role to get personalized training
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full">Sport: {selectedSport}</span>
            <span>→</span>
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full">Role</span>
            <span>→</span>
            <span>Module</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card 
            className="p-8 cursor-pointer hover:border-primary transition-all hover:shadow-lg"
            onClick={() => handleRoleSelect('Player')}
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <User className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Player</h2>
              <p className="text-muted-foreground mb-6">
                Get In The Game!
              </p>
              <Button size="lg" className="w-full">
                Select Player
              </Button>
            </div>
          </Card>

          <Card 
            className="p-8 cursor-pointer hover:border-primary transition-all hover:shadow-lg"
            onClick={() => handleRoleSelect('Coach')}
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <Users className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Coach</h2>
              <p className="text-muted-foreground mb-6">
                Get In The Game!
              </p>
              <Button size="lg" className="w-full">
                Select Coach
              </Button>
            </div>
          </Card>

          <Card 
            className="p-8 cursor-pointer hover:border-primary transition-all hover:shadow-lg"
            onClick={() => handleRoleSelect('Recruiter/Scout')}
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <Target className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Recruiter/Scout</h2>
              <p className="text-muted-foreground mb-6">
                Get In The Game!
              </p>
              <Button size="lg" className="w-full">
                Select Recruiter/Scout
              </Button>
            </div>
          </Card>
        </div>

        <div className="text-center mt-6">
          <Button variant="ghost" onClick={() => navigate("/select-sport", { state: { sport: selectedSport } })}>
            ← Back to Sport Selection
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SelectRole;
