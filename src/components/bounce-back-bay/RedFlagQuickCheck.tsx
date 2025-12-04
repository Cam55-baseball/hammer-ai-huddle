import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, XCircle, Phone, Stethoscope } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function RedFlagQuickCheck() {
  const { t } = useTranslation();
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const redFlags = [
    { id: "deformity", label: t('bounceBackBay.redFlags.items.deformity'), severity: "critical" },
    { id: "numbness", label: t('bounceBackBay.redFlags.items.numbness'), severity: "critical" },
    { id: "inability", label: t('bounceBackBay.redFlags.items.inability'), severity: "critical" },
    { id: "severe_swelling", label: t('bounceBackBay.redFlags.items.severeSwelling'), severity: "critical" },
    { id: "pop_sound", label: t('bounceBackBay.redFlags.items.popSound'), severity: "high" },
    { id: "locked_joint", label: t('bounceBackBay.redFlags.items.lockedJoint'), severity: "high" },
    { id: "instability", label: t('bounceBackBay.redFlags.items.instability'), severity: "high" },
    { id: "worsening", label: t('bounceBackBay.redFlags.items.worsening'), severity: "medium" },
    { id: "night_pain", label: t('bounceBackBay.redFlags.items.nightPain'), severity: "medium" },
    { id: "fever", label: t('bounceBackBay.redFlags.items.fever'), severity: "critical" },
  ];

  const handleCheck = (id: string, checked: boolean) => {
    if (checked) {
      setCheckedItems([...checkedItems, id]);
    } else {
      setCheckedItems(checkedItems.filter(item => item !== id));
    }
  };

  const criticalCount = checkedItems.filter(id => 
    redFlags.find(f => f.id === id)?.severity === "critical"
  ).length;
  
  const highCount = checkedItems.filter(id => 
    redFlags.find(f => f.id === id)?.severity === "high"
  ).length;

  const getTotalSeverity = () => {
    if (criticalCount > 0) return "critical";
    if (highCount > 0 || checkedItems.length >= 3) return "high";
    if (checkedItems.length >= 1) return "moderate";
    return "clear";
  };

  const severity = getTotalSeverity();

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical":
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">{t('bounceBackBay.redFlags.critical')}</Badge>;
      case "high":
        return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">{t('bounceBackBay.redFlags.high')}</Badge>;
      case "medium":
        return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">{t('bounceBackBay.redFlags.medium')}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t('bounceBackBay.redFlags.intro')}
      </p>

      {/* Checklist */}
      <div className="space-y-3">
        {redFlags.map((flag) => (
          <div 
            key={flag.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              checkedItems.includes(flag.id)
                ? flag.severity === 'critical' 
                  ? 'bg-red-500/10 border-red-500/30'
                  : flag.severity === 'high'
                    ? 'bg-orange-500/10 border-orange-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                : 'bg-card border-border hover:border-muted-foreground/30'
            }`}
          >
            <Checkbox
              id={flag.id}
              checked={checkedItems.includes(flag.id)}
              onCheckedChange={(checked) => handleCheck(flag.id, checked as boolean)}
              className="mt-0.5"
            />
            <div className="flex-1 flex items-center justify-between gap-2">
              <label htmlFor={flag.id} className="text-sm cursor-pointer flex-1">
                {flag.label}
              </label>
              {getSeverityBadge(flag.severity)}
            </div>
          </div>
        ))}
      </div>

      {/* Results Card */}
      <Card className={`border-2 ${
        severity === 'critical' 
          ? 'border-red-500/50 bg-red-500/5'
          : severity === 'high'
            ? 'border-orange-500/50 bg-orange-500/5'
            : severity === 'moderate'
              ? 'border-amber-500/50 bg-amber-500/5'
              : 'border-emerald-500/50 bg-emerald-500/5'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {severity === 'critical' ? (
              <XCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
            ) : severity === 'high' ? (
              <AlertTriangle className="h-8 w-8 text-orange-500 flex-shrink-0" />
            ) : severity === 'moderate' ? (
              <AlertTriangle className="h-8 w-8 text-amber-500 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-emerald-500 flex-shrink-0" />
            )}
            <div className="space-y-2">
              <h4 className={`font-semibold ${
                severity === 'critical' ? 'text-red-500' 
                : severity === 'high' ? 'text-orange-500'
                : severity === 'moderate' ? 'text-amber-500'
                : 'text-emerald-500'
              }`}>
                {severity === 'critical' ? t('bounceBackBay.redFlags.result.critical.title')
                 : severity === 'high' ? t('bounceBackBay.redFlags.result.high.title')
                 : severity === 'moderate' ? t('bounceBackBay.redFlags.result.moderate.title')
                 : t('bounceBackBay.redFlags.result.clear.title')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {severity === 'critical' ? t('bounceBackBay.redFlags.result.critical.description')
                 : severity === 'high' ? t('bounceBackBay.redFlags.result.high.description')
                 : severity === 'moderate' ? t('bounceBackBay.redFlags.result.moderate.description')
                 : t('bounceBackBay.redFlags.result.clear.description')}
              </p>
              
              {(severity === 'critical' || severity === 'high') && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
                    <Phone className="h-3 w-3" />
                    {t('bounceBackBay.redFlags.seekProfessional')}
                  </Badge>
                  <Badge className="bg-muted text-muted-foreground gap-1">
                    <Stethoscope className="h-3 w-3" />
                    {t('bounceBackBay.redFlags.stopActivity')}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer reminder */}
      <Alert className="bg-blue-500/10 border-blue-500/30">
        <AlertTriangle className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-600 dark:text-blue-400">{t('bounceBackBay.redFlags.disclaimer.title')}</AlertTitle>
        <AlertDescription className="text-sm">
          {t('bounceBackBay.redFlags.disclaimer.description')}
        </AlertDescription>
      </Alert>
    </div>
  );
}
