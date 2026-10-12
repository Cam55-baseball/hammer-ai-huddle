import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Plan 4 D — Coach and Organization plans, shown on every pricing and upgrade screen. */
export function StaffPlansTeaser() {
  const { t } = useTranslation();
  return (
    <Card className="p-5 mt-8 space-y-3">
      <h2 className="text-lg font-semibold">{t("staffPlans.heading")}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="font-medium">{t("staffPlans.coachName")} · <span className="text-primary">{t("staffPlans.coachPrice")}</span></p>
          <p className="text-sm text-muted-foreground">{t("staffPlans.coachLine")}</p>
        </div>
        <div>
          <p className="font-medium">{t("staffPlans.orgName")} · <span className="text-primary">{t("staffPlans.orgPrice")}</span></p>
          <p className="text-sm text-muted-foreground">{t("staffPlans.orgLine")}</p>
        </div>
      </div>
      <Button asChild variant="outline" className="w-full"><Link to="/staff-plans">{t("staffPlans.see")}</Link></Button>
    </Card>
  );
}
