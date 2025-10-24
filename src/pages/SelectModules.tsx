import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

type ModuleType = 'hitting' | 'pitching' | 'throwing';

const SelectModules = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { role?: string; sport?: string };
  
  const selectedRole = state?.role || localStorage.getItem('selectedRole');
  const selectedSport = state?.sport || localStorage.getItem('selectedSport');
  
  const [selectedModules, setSelectedModules] = useState<ModuleType[]>([]);

  useEffect(() => {
    if (!selectedRole || !selectedSport) {
      navigate("/");
    }
  }, [selectedRole, selectedSport, navigate]);

  const modules: { id: ModuleType; label: string; icon: string; description: string }[] = [
    {
      id: 'hitting',
      label: 'Hitting',
      icon: '🏏',
      description: 'Analyze swing mechanics, bat speed, and contact point'
    },
    {
      id: 'pitching',
      label: 'Pitching',
      icon: '⚡',
      description: 'Track velocity, release point, and arm mechanics'
    },
    {
      id: 'throwing',
      label: 'Throwing',
      icon: '🎯',
      description: 'Improve accuracy, arm strength, and throwing form'
    }
  ];

  const toggleModule = (moduleId: ModuleType) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(m => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleContinue = () => {
    if (selectedModules.length === 0) return;
    
    localStorage.setItem('selectedModules', JSON.stringify(selectedModules));
    navigate("/pricing", { 
      state: { 
        role: selectedRole, 
        sport: selectedSport, 
        modules: selectedModules 
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl">H</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Select Training Modules</h1>
          <p className="text-muted-foreground">
            Choose one or more modules to focus on (you can add more later)
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
            <span className="bg-muted px-3 py-1 rounded-full">Role: {selectedRole}</span>
            <span>→</span>
            <span className="bg-muted px-3 py-1 rounded-full">Sport: {selectedSport}</span>
            <span>→</span>
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full">Modules</span>
          </div>
        </div>

        <div className="grid gap-4 mb-8">
          {modules.map((module) => (
            <Card 
              key={module.id}
              className={`p-6 cursor-pointer transition-all ${
                selectedModules.includes(module.id) 
                  ? 'border-primary bg-primary/5' 
                  : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => toggleModule(module.id)}
            >
              <div className="flex items-start gap-4">
                <Checkbox 
                  checked={selectedModules.includes(module.id)}
                  onCheckedChange={() => toggleModule(module.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{module.icon}</span>
                    <h3 className="text-xl font-bold">{module.label}</h3>
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
            onClick={() => navigate("/select-sport", { state: { role: selectedRole } })}
            className="flex-1"
          >
            ← Back
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={selectedModules.length === 0}
            className="flex-1"
            size="lg"
          >
            Continue to Pricing →
          </Button>
        </div>

        {selectedModules.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Please select at least one module to continue
          </p>
        )}
      </div>
    </div>
  );
};

export default SelectModules;
