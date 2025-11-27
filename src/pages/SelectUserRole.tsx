import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, UserCog, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const SelectUserRole = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    // Redirect to auth if not logged in
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleRoleSelect = (role: 'player' | 'scout') => {
    localStorage.setItem('userRole', role);
    
    if (role === 'scout') {
      // Scouts go to sport selection for application
      navigate('/select-sport-scout');
    } else {
      // Players continue to sport selection
      navigate('/select-sport');
    }
  };

  const handleBackToSignIn = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl">H</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Welcome! Choose Your Role</h1>
          <p className="text-muted-foreground">
            Are you here to train or to coach?
          </p>
          <Button 
            variant="ghost" 
            className="mt-2"
            onClick={handleBackToSignIn}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card 
            className="p-8 cursor-pointer hover:border-primary transition-all hover:shadow-lg"
            onClick={() => handleRoleSelect('player')}
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <User className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Player</h2>
              <p className="text-muted-foreground mb-6">
                Get personalized training and improve your skills
              </p>
              <Button size="lg" className="w-full">
                I'm a Player
              </Button>
            </div>
          </Card>

          <Card 
            className="p-8 cursor-pointer hover:border-primary transition-all hover:shadow-lg"
            onClick={() => handleRoleSelect('scout')}
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <UserCog className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Scout/Coach</h2>
              <p className="text-muted-foreground mb-6">
                Find and evaluate talented players
              </p>
              <Button size="lg" className="w-full">
                I'm a Scout/Coach
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SelectUserRole;
