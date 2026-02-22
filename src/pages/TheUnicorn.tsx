import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowLeft, Dumbbell, Zap, Target, Heart } from "lucide-react";
import { hasUnicornAccess } from "@/utils/tierAccess";
import { useSubscription } from "@/hooks/useSubscription";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";

export default function TheUnicorn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { modules, loading: subLoading } = useSubscription();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const loading = subLoading || ownerLoading || adminLoading;
  const hasAccess = isOwner || isAdmin || hasUnicornAccess(modules);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center space-y-6 py-12">
          <Sparkles className="h-16 w-16 text-primary mx-auto" />
          <h1 className="text-3xl font-bold">The Unicorn</h1>
          <p className="text-muted-foreground">
            The Unicorn is the elite merged workout system available exclusively with The Golden 2Way tier.
          </p>
          <Button onClick={() => navigate('/pricing')}>
            Upgrade to Golden 2Way
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const weeklySchedule = [
    { day: 'Day 1', title: 'Full Body Strength + Scap/Arm Care', cns: 35, icon: Dumbbell, focus: 'Strength' },
    { day: 'Day 2', title: 'Pitching Velocity Development + Sprint Work', cns: 40, icon: Zap, focus: 'Speed + Velocity' },
    { day: 'Day 3', title: 'Hitting Power (Bat Speed) + Active Recovery', cns: 25, icon: Target, focus: 'Power' },
    { day: 'Day 4', title: 'REST', cns: 0, icon: Heart, focus: 'Recovery' },
    { day: 'Day 5', title: 'Full Body Strength + Throwing Velocity', cns: 40, icon: Dumbbell, focus: 'Strength + Velocity' },
    { day: 'Day 6', title: 'Speed Lab + Light Arm Care', cns: 25, icon: Zap, focus: 'Speed' },
    { day: 'Day 7', title: 'REST', cns: 0, icon: Heart, focus: 'Recovery' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/golden-2way')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl sm:text-4xl font-bold">The Unicorn</h1>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Elite merged workout system — combining Heat Factory, Iron Bambino, and Speed Lab 
            into one intelligently balanced program with cumulative CNS tracking.
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge variant="secondary">4 Cycles × 6 Weeks</Badge>
            <Badge variant="secondary">CNS Managed</Badge>
            <Badge variant="secondary">Infinite Loop</Badge>
            <Badge variant="secondary">Dual-Role Ready</Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Weekly Training Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklySchedule.map((day) => {
                const Icon = day.icon;
                const isRest = day.cns === 0;
                return (
                  <div
                    key={day.day}
                    className={`flex items-center gap-4 p-4 rounded-lg border ${
                      isRest ? 'bg-muted/30 border-muted' : 'bg-card hover:bg-accent/50 transition-colors'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${isRest ? 'bg-muted' : 'bg-primary/10'}`}>
                      <Icon className={`h-5 w-5 ${isRest ? 'text-muted-foreground' : 'text-primary'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{day.day}: {day.title}</p>
                      <p className="text-sm text-muted-foreground">{day.focus}</p>
                    </div>
                    {!isRest && (
                      <Badge variant="outline" className="text-xs">
                        CNS: {day.cns}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20 text-center">
              <p className="text-sm font-medium">Weekly CNS Total: ~165 (Elite Range)</p>
              <p className="text-xs text-muted-foreground mt-1">
                Deload every 4th week — all volume drops 40%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                Never pitch and throw max effort on the same day
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                Never heavy lower body strength + max sprints on the same day
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                Arm care integrated every training day
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                Deload week every 4th week (all volume drops 40%)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                Throwing load tracked as pitch count equivalents
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                Auto-suggests rest if weekly throwing exceeds threshold
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
