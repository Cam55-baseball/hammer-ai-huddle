import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        title: t('selectRole.confirmationRequired'),
        description: t('selectRole.pleaseConfirmAge'),
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
          <h1 className="text-4xl font-bold mb-2">{t('selectRole.title')}</h1>
          <p className="text-muted-foreground">
            {t('selectRole.subtitle')}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full">{t('selectRole.sport')}: {selectedSport}</span>
            <span>→</span>
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full">{t('selectRole.role')}</span>
            <span>→</span>
            <span>{t('selectRole.module')}</span>
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
              <h2 className="text-2xl font-bold mb-2">{t('selectRole.player')}</h2>
              <p className="text-muted-foreground mb-6">
                {t('selectRole.playerDescription')}
              </p>
              <Button size="lg" className="w-full">
                {t('selectRole.selectPlayer')}
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
              <h2 className="text-2xl font-bold mb-2">{t('selectRole.scoutCoach')}</h2>
              <p className="text-muted-foreground mb-6">
                {t('selectRole.scoutCoachDescription')}
              </p>
              <Button size="lg" className="w-full">
                {t('selectRole.selectRole')}
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
              <h2 className="text-2xl font-bold mb-2">{t('selectRole.admin')}</h2>
              <p className="text-muted-foreground mb-6">
                {t('selectRole.adminDescription')}
              </p>
              <Button size="lg" className="w-full">
                {t('selectRole.requestAdminAccess')}
              </Button>
            </div>
          </Card>
        </div>

        <div className="text-center mt-6">
          <Button variant="ghost" onClick={() => navigate("/select-sport", { state: { sport: selectedSport } })}>
            ← {t('selectRole.backToSportSelection')}
          </Button>
        </div>

        {/* Age Confirmation Dialog */}
        <AlertDialog open={showAgeDialog} onOpenChange={setShowAgeDialog}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <AlertDialogTitle className="text-xl">{t('selectRole.ageVerification.title')}</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base space-y-3">
                <p>
                  {t('selectRole.ageVerification.description')}
                </p>
                <p className="text-muted-foreground italic border-l-4 border-primary/30 pl-3 py-2 bg-muted/50 rounded">
                  <strong>{t('selectRole.ageVerification.note')}:</strong> {t('selectRole.ageVerification.parentNote')}
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
                {t('selectRole.ageVerification.confirmLabel')}
              </Label>
            </div>
            
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowAgeDialog(false);
                setAgeConfirmed(false);
                setPendingRole("");
              }}>
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleAgeConfirmation}
                disabled={!ageConfirmed}
                className="min-w-[200px]"
              >
                {t('selectRole.ageVerification.continueToModules')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default SelectRole;
