import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, UserCog, Shield, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogAction, 
  AlertDialogCancel 
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const SelectRole = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedSport = (location.state as { sport?: string })?.sport || localStorage.getItem('selectedSport');
  const { toast } = useToast();
  const [showAgeDialog, setShowAgeDialog] = useState(false);
  const [pendingRole, setPendingRole] = useState<string>("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  useEffect(() => {
    if (!selectedSport) {
      navigate("/select-sport");
    }
  }, [selectedSport, navigate]);

  const handleRoleSelect = (role: string) => {
    if (role === 'Player') {
      // Show age confirmation for players only
      setPendingRole(role);
      setShowAgeDialog(true);
      setAgeConfirmed(false);
    } else {
      // Scout/Coach and Admin don't need age confirmation
      localStorage.setItem('selectedRole', role);
      navigate("/select-modules", { state: { sport: selectedSport, role } });
    }
  };

  const handleAgeConfirmation = () => {
    if (!ageConfirmed) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm the age requirement to continue.",
        variant: "destructive",
      });
      return;
    }
    
    // Store confirmation and proceed
    localStorage.setItem('selectedRole', pendingRole);
    localStorage.setItem('ageVerified', 'true');
    setShowAgeDialog(false);
    navigate("/select-modules", { state: { sport: selectedSport, role: pendingRole } });
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
            onClick={() => handleRoleSelect('Scout/Coach')}
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <UserCog className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Scout/Coach</h2>
              <p className="text-muted-foreground mb-6">
                Train and evaluate talent
              </p>
              <Button size="lg" className="w-full">
                Select Role
              </Button>
            </div>
          </Card>

          <Card 
            className="p-8 cursor-pointer hover:border-primary transition-all hover:shadow-lg"
            onClick={() => handleRoleSelect('Admin')}
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <Shield className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Admin</h2>
              <p className="text-muted-foreground mb-6">
                Request admin access (requires owner approval)
              </p>
              <Button size="lg" className="w-full">
                Request Admin Access
              </Button>
            </div>
          </Card>
        </div>

        <div className="text-center mt-6">
          <Button variant="ghost" onClick={() => navigate("/select-sport", { state: { sport: selectedSport } })}>
            ← Back to Sport Selection
          </Button>
        </div>

        {/* Age Confirmation Dialog */}
        <AlertDialog open={showAgeDialog} onOpenChange={setShowAgeDialog}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <AlertDialogTitle className="text-xl">Age Verification Required</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base space-y-3">
                <p>
                  To proceed with module selection and purchase, you must confirm that you are 18 years of age or older. This is required for payment processing.
                </p>
                <p className="text-muted-foreground italic border-l-4 border-primary/30 pl-3 py-2 bg-muted/50 rounded">
                  <strong>Note:</strong> If you are under 18 years of age, your parent or legal guardian must check this box on your behalf to provide consent for module purchase.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="flex items-start gap-3 py-4 px-1">
              <Checkbox 
                id="age-confirm" 
                checked={ageConfirmed}
                onCheckedChange={(checked) => setAgeConfirmed(checked === true)}
                className="mt-1"
              />
              <Label 
                htmlFor="age-confirm" 
                className="text-base font-medium cursor-pointer leading-relaxed"
              >
                I confirm that I am 18 years of age or older, or that my parent/legal guardian is providing consent on my behalf
              </Label>
            </div>
            
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowAgeDialog(false);
                setAgeConfirmed(false);
                setPendingRole("");
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleAgeConfirmation}
                disabled={!ageConfirmed}
                className="min-w-[200px]"
              >
                Continue to Module Selection
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default SelectRole;
