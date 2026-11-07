// Owner Nov 6: the Dashboard and the "Find Your Training Plan" page share this exact
// baseball/softball toggle (same switch warning, same saved sport, same Refresh button).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type SportType = "baseball" | "softball";

export const isSport = (v: unknown): v is SportType => v === "baseball" || v === "softball";

/** The sport the Dashboard last used (saved on this device). */
export function savedSport(): SportType | null {
  try {
    const saved = localStorage.getItem("selectedSport");
    return isSport(saved) ? saved : null;
  } catch {
    return null;
  }
}

/** Sport state + the existing "switch sport?" warning, shared by Dashboard and the plans page. */
export function useSportSwitch(initial: () => SportType) {
  const { t } = useTranslation();
  const [selectedSport, setSelectedSportState] = useState<SportType>(initial);
  const [showDialog, setShowDialog] = useState(false);
  const [pending, setPending] = useState<SportType | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const setSelectedSport = (sport: SportType) => {
    setSelectedSportState(sport);
    try { localStorage.setItem("selectedSport", sport); } catch { /* ignore */ }
  };
  const sportName = (s: SportType | null) => (s === "baseball" ? t("dashboard.baseball") : t("dashboard.softball"));

  const handleSportChange = (sport: string) => {
    const next = sport as SportType;
    const dontShowWarning = localStorage.getItem("dontShowSportWarning") === "true";
    if (next !== selectedSport && !dontShowWarning) {
      setPending(next);
      setShowDialog(true);
      return;
    }
    setSelectedSport(next);
    toast.info(t("dashboard.switchedToSport", { sport: sportName(next) }));
  };

  const close = () => { setShowDialog(false); setPending(null); setDontShowAgain(false); };
  const confirm = () => {
    if (pending) {
      setSelectedSport(pending);
      if (dontShowAgain) localStorage.setItem("dontShowSportWarning", "true");
      toast.info(t("dashboard.switchedToSport", { sport: sportName(pending) }));
    }
    close();
  };

  const dialog = (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("sportSwitch.switchTo", { sport: sportName(pending) })}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>{t("sportSwitch.separateModulesDescription")}</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{t("sportSwitch.videoAnalysisContexts")}</li>
              <li>{t("sportSwitch.progressTracking")}</li>
              <li>{t("sportSwitch.trainingData")}</li>
            </ul>
            <p className="text-sm font-medium">{t("sportSwitch.sportSpecificNote")}</p>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox id="dont-show" checked={dontShowAgain} onCheckedChange={(c) => setDontShowAgain(c === true)} />
              <label htmlFor="dont-show" className="text-sm cursor-pointer select-none">{t("sportSwitch.dontShowAgain")}</label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={close}>{t("sportSwitch.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>{t("sportSwitch.switch")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { selectedSport, setSelectedSport, handleSportChange, dialog };
}

/** The baseball/softball toggle row with the Refresh access button, unchanged from the Dashboard. */
export function SportToggleRow({ selectedSport, onSportChange, onRefresh, isRefreshing }: {
  selectedSport: SportType;
  onSportChange: (sport: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-3 sm:gap-4">
      <Tabs value={selectedSport} onValueChange={onSportChange} className="flex-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="baseball">{t("dashboard.baseball")}</TabsTrigger>
          <TabsTrigger value="softball">{t("dashboard.softball")}</TabsTrigger>
        </TabsList>
      </Tabs>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="gap-2 w-full xs:w-auto">
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">{t("dashboard.refreshAccess")}</span>
        <span className="sm:hidden">{t("dashboard.refresh")}</span>
      </Button>
    </div>
  );
}
