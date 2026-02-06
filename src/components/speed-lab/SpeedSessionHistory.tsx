import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Clock, Shield } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SpeedSession } from '@/hooks/useSpeedProgress';
import { DistanceConfig } from '@/data/speedLabProgram';

interface SpeedSessionHistoryProps {
  sessions: SpeedSession[];
  distances: DistanceConfig[];
}

export function SpeedSessionHistory({ sessions, distances }: SpeedSessionHistoryProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  if (sessions.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                {t('speedLab.history.title', 'Session History')}
                <Badge variant="secondary" className="text-xs">{sessions.length}</Badge>
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-2 max-h-[400px] overflow-y-auto">
            {sessions.slice(0, 20).map((session) => (
              <div
                key={session.id}
                className={`p-3 rounded-lg border text-sm ${
                  session.is_break_day ? 'bg-sky-500/5 border-sky-500/20' : 'bg-muted/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      #{session.session_number}
                    </span>
                    {session.is_break_day && (
                      <Badge variant="secondary" className="text-[10px] gap-1 bg-sky-500/10 text-sky-600">
                        <Shield className="h-2.5 w-2.5" /> {t('speedLab.history.breakDay', 'Recovery')}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(session.session_date).toLocaleDateString()}
                  </span>
                </div>

                {!session.is_break_day && (
                  <div className="flex gap-3 mt-1">
                    {distances.map((dist) => {
                      const time = session.distances[dist.key];
                      return time ? (
                        <div key={dist.key} className="text-center">
                          <p className="text-[10px] text-muted-foreground">{dist.label}</p>
                          <p className="font-mono font-semibold text-xs">{time.toFixed(2)}s</p>
                        </div>
                      ) : null;
                    })}
                    {session.rpe && (
                      <div className="text-center ml-auto">
                        <p className="text-[10px] text-muted-foreground">RPE</p>
                        <p className="font-semibold text-xs">{session.rpe}/10</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
