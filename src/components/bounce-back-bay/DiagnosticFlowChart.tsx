import { useTranslation } from "react-i18next";
import { ArrowRight, AlertTriangle, Stethoscope, Activity, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function DiagnosticFlowChart() {
  const { t } = useTranslation();

  const flowSteps = [
    {
      id: "symptoms",
      title: t('bounceBackBay.diagnosticFlow.steps.symptoms.title'),
      description: t('bounceBackBay.diagnosticFlow.steps.symptoms.description'),
      icon: Activity,
      color: "cyan",
      questions: [
        t('bounceBackBay.diagnosticFlow.steps.symptoms.q1'),
        t('bounceBackBay.diagnosticFlow.steps.symptoms.q2'),
        t('bounceBackBay.diagnosticFlow.steps.symptoms.q3'),
      ]
    },
    {
      id: "timing",
      title: t('bounceBackBay.diagnosticFlow.steps.timing.title'),
      description: t('bounceBackBay.diagnosticFlow.steps.timing.description'),
      icon: Clock,
      color: "orange",
      questions: [
        t('bounceBackBay.diagnosticFlow.steps.timing.q1'),
        t('bounceBackBay.diagnosticFlow.steps.timing.q2'),
        t('bounceBackBay.diagnosticFlow.steps.timing.q3'),
      ]
    },
    {
      id: "severity",
      title: t('bounceBackBay.diagnosticFlow.steps.severity.title'),
      description: t('bounceBackBay.diagnosticFlow.steps.severity.description'),
      icon: AlertTriangle,
      color: "red",
      questions: [
        t('bounceBackBay.diagnosticFlow.steps.severity.q1'),
        t('bounceBackBay.diagnosticFlow.steps.severity.q2'),
        t('bounceBackBay.diagnosticFlow.steps.severity.q3'),
      ]
    },
    {
      id: "decision",
      title: t('bounceBackBay.diagnosticFlow.steps.decision.title'),
      description: t('bounceBackBay.diagnosticFlow.steps.decision.description'),
      icon: Stethoscope,
      color: "emerald",
      outcomes: [
        {
          condition: t('bounceBackBay.diagnosticFlow.steps.decision.outcome1.condition'),
          action: t('bounceBackBay.diagnosticFlow.steps.decision.outcome1.action'),
          urgency: "high"
        },
        {
          condition: t('bounceBackBay.diagnosticFlow.steps.decision.outcome2.condition'),
          action: t('bounceBackBay.diagnosticFlow.steps.decision.outcome2.action'),
          urgency: "medium"
        },
        {
          condition: t('bounceBackBay.diagnosticFlow.steps.decision.outcome3.condition'),
          action: t('bounceBackBay.diagnosticFlow.steps.decision.outcome3.action'),
          urgency: "low"
        },
      ]
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
      cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-600 dark:text-cyan-400", icon: "text-cyan-500" },
      orange: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-600 dark:text-orange-400", icon: "text-orange-500" },
      red: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-600 dark:text-red-400", icon: "text-red-500" },
      emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400", icon: "text-emerald-500" },
    };
    return colors[color] || colors.cyan;
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t('bounceBackBay.diagnosticFlow.intro')}
      </p>

      {/* Visual Flow Chart */}
      <div className="space-y-4">
        {flowSteps.map((step, index) => {
          const colors = getColorClasses(step.color);
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="relative">
              {/* Connector line */}
              {index < flowSteps.length - 1 && (
                <div className="absolute left-6 top-16 w-0.5 h-8 bg-border z-0" />
              )}
              
              <Card className={`${colors.bg} ${colors.border} border`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${colors.bg} border ${colors.border}`}>
                      <Icon className={`h-5 w-5 ${colors.icon}`} />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{t('bounceBackBay.diagnosticFlow.step')} {index + 1}</Badge>
                          <h4 className={`font-semibold ${colors.text}`}>{step.title}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                      </div>
                      
                      {step.questions && (
                        <ul className="space-y-1.5">
                          {step.questions.map((q, qIdx) => (
                            <li key={qIdx} className="flex items-start gap-2 text-sm">
                              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      
                      {step.outcomes && (
                        <div className="space-y-2">
                          {step.outcomes.map((outcome, oIdx) => (
                            <div 
                              key={oIdx} 
                              className={`p-3 rounded-lg border ${
                                outcome.urgency === 'high' 
                                  ? 'bg-red-500/10 border-red-500/30' 
                                  : outcome.urgency === 'medium' 
                                    ? 'bg-orange-500/10 border-orange-500/30'
                                    : 'bg-emerald-500/10 border-emerald-500/30'
                              }`}
                            >
                              <p className="text-sm font-medium">{outcome.condition}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {outcome.action}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
