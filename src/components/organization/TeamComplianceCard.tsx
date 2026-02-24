import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, AlertTriangle, CheckCircle } from 'lucide-react';

interface TeamComplianceCardProps {
  avgIntegrity: number;
  coachValidationPct: number;
  activeMemberCount: number;
  flaggedCount: number;
}

export function TeamComplianceCard({ avgIntegrity, coachValidationPct, activeMemberCount, flaggedCount }: TeamComplianceCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Team Compliance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold">{avgIntegrity}</p>
            <p className="text-xs text-muted-foreground">Avg Integrity</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold">{coachValidationPct}%</p>
            <p className="text-xs text-muted-foreground">Coach Validated</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{activeMemberCount}</p>
            <p className="text-xs text-muted-foreground">Active Members</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-amber-600" />
            <p className="text-2xl font-bold">{flaggedCount}</p>
            <p className="text-xs text-muted-foreground">Flagged</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
