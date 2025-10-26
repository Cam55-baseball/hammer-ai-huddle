import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type ModuleType = 'hitting' | 'pitching' | 'throwing';

const SelectModules = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const state = location.state as { role?: string; sport?: string; mode?: 'add' };
  
  const selectedRole = state?.role || localStorage.getItem('selectedRole');
  const selectedSport = state?.sport || localStorage.getItem('selectedSport');
  const isAddMode = state?.mode === 'add';
  
  const [selectedModule, setSelectedModule] = useState<ModuleType | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAddMode && (!selectedRole || !selectedSport)) {
      navigate("/select-sport");
    }
    if (isAddMode && !user) {
      navigate("/auth");
    }
  }, [selectedRole, selectedSport, isAddMode, user, navigate]);

  const modules: { id: ModuleType; label: string; icon: string; description: string }[] = [
    {
      id: 'hitting',
      label: 'Hitting',
      icon: '⚡',
      description: 'Analyze swing mechanics, bat speed, and contact point'
    },
    {
      id: 'pitching',
      label: 'Pitching',
      icon: '🎯',
      description: 'Track velocity, release point, and arm mechanics'
    },
    {
      id: 'throwing',
      label: 'Throwing',
      icon: '🔥',
      description: 'Improve accuracy, arm strength, and throwing form'
    }
  ];

  const handleContinue = async () => {
    if (!selectedModule) return;

    setLoading(true);
    
    try {
      // Check if user is owner or admin - they get free access and skip pricing
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .in('role', ['owner', 'admin']);

      const isOwnerOrAdmin = roles && roles.length > 0;

      localStorage.setItem('selectedModule', selectedModule);

      // Check if role is Player
      const isPlayer = selectedRole === 'Player';

      if (isAddMode) {
        // If adding a module, always go to pricing (even for owners/admins if they want to purchase)
        navigate("/pricing", { 
          state: { 
            role: selectedRole, 
            sport: selectedSport, 
            module: selectedModule,
            mode: 'add'
          } 
        });
      } else if (isOwnerOrAdmin) {
        // Owners and admins skip pricing for first-time setup and go to profile
        navigate("/profile-setup", { 
          state: { 
            role: selectedRole, 
            sport: selectedSport, 
            module: selectedModule 
          } 
        });
      } else if (isPlayer) {
        // Players go to pricing (they need to pay)
        navigate("/pricing", { 
          state: { 
            role: selectedRole, 
            sport: selectedSport, 
            module: selectedModule,
            mode: 'new'
          } 
        });
      } else {
        // Non-player roles (Recruiter/Coach/Scout) skip pricing and go to profile setup
        navigate("/profile-setup", { 
          state: { 
            role: selectedRole, 
            sport: selectedSport, 
            module: selectedModule 
          } 
        });
      }
    } catch (error) {
      console.error('Error checking roles:', error);
      // On error, default to pricing page
      navigate("/pricing", { 
        state: { 
          role: selectedRole, 
          sport: selectedSport, 
          module: selectedModule,
          mode: isAddMode ? 'add' : 'new'
        } 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl">H</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">{isAddMode ? 'Add a Module' : 'Select Your Training Module'}</h1>
          <p className="text-muted-foreground">
            {isAddMode ? 'Choose one module to add to your subscription' : 'Choose your first module (you can add more later from the dashboard)'}
          </p>
          {!isAddMode && (
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
              <span className="bg-muted px-3 py-1 rounded-full">Sport: {selectedSport}</span>
              <span>→</span>
              <span className="bg-muted px-3 py-1 rounded-full">Role: {selectedRole}</span>
              <span>→</span>
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full">Module</span>
            </div>
          )}
        </div>

        <div className="grid gap-4 mb-8">
          {modules.map((module) => (
            <Card 
              key={module.id}
              className={`p-6 cursor-pointer transition-all ${
                selectedModule === module.id 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary' 
                  : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => setSelectedModule(module.id)}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{module.icon}</span>
                    <h3 className="text-xl font-bold">{module.label}</h3>
                    {selectedModule === module.id && (
                      <span className="ml-auto text-primary font-semibold">Selected</span>
                    )}
                  </div>
                  <p className="text-muted-foreground">{module.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => isAddMode ? navigate("/dashboard") : navigate("/select-role", { state: { sport: selectedSport } })}
            className="flex-1"
          >
            ← Back
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!selectedModule || loading}
            className="flex-1"
            size="lg"
          >
            {loading ? "Loading..." : isAddMode ? "Continue to Pricing →" : "Continue →"}
          </Button>
        </div>

        {!selectedModule && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Please select a module to continue
          </p>
        )}
      </div>
    </div>
  );
};

export default SelectModules;
