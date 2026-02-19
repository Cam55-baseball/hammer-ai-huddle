import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { usePhysioDailyReport, PhysioReportSection } from '@/hooks/usePhysioDailyReport';
import { AlertTriangle, CheckCircle, X, Activity, ChevronDown } from 'lucide-react';

const colorConfig = {
  green: {
    header: 'bg-gradient-to-r from-emerald-500/30 to-emerald-600/20 border-emerald-500/40',
    dot: 'bg-emerald-500',
    label: 'Well Regulated',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  yellow: {
    header: 'bg-gradient-to-r from-amber-500/30 to-amber-600/20 border-amber-500/40',
    dot: 'bg-amber-500',
    label: 'Moderately Regulated',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  red: {
    header: 'bg-gradient-to-r from-red-500/30 to-red-600/20 border-red-500/40',
    dot: 'bg-red-500',
    label: 'Recovery Recommended',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
};

const sectionLabels: Record<string, string> = {
  sleep: '😴 Sleep',
  stress: '🧠 Stress',
  movement: '🏃 Movement',
  training_load: '⚡ Training Load',
  fuel: '🥗 Fuel',
  game_readiness: '🏆 Game Readiness',
};

interface ReportSectionCardProps {
  sectionKey: string;
  section: PhysioReportSection;
  response: string | null;
  onRespond: (key: string, response: 'apply' | 'modify' | 'decline') => void;
}

function ReportSectionCard({ sectionKey, section, response, onRespond }: ReportSectionCardProps) {
  return (
    <AccordionItem value={sectionKey} className="border rounded-xl px-1 mb-2">
      <AccordionTrigger className="px-3 py-3 hover:no-underline">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {response === 'apply' && <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
          {response === 'decline' && <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          {sectionLabels[sectionKey] || sectionKey}
          {response && (
            <span className="ml-auto mr-2 text-xs text-muted-foreground capitalize">{response}</span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-3 pb-3 space-y-3">
        <div className="space-y-2 text-sm">
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Why</p>
            <p className="text-foreground">{section.why}</p>
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">What To Do</p>
            <p className="text-foreground">{section.what_to_do}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">How It Helps</p>
            <p className="text-foreground">{section.how_it_helps}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={response === 'apply' ? 'default' : 'outline'}
            onClick={() => onRespond(sectionKey, 'apply')}
            className="flex-1 text-xs"
          >
            <CheckCircle className="h-3 w-3 mr-1" /> Apply
          </Button>
          <Button
            size="sm"
            variant={response === 'modify' ? 'secondary' : 'outline'}
            onClick={() => onRespond(sectionKey, 'modify')}
            className="flex-1 text-xs"
          >
            Modify
          </Button>
          <Button
            size="sm"
            variant={response === 'decline' ? 'destructive' : 'outline'}
            onClick={() => onRespond(sectionKey, 'decline')}
            className="flex-1 text-xs"
          >
            <X className="h-3 w-3 mr-1" /> Decline
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function PhysioNightlyReportCard() {
  const { report, regulationScore, regulationColor, logSuggestionResponse } = usePhysioDailyReport();
  const [showFull, setShowFull] = useState(false);

  if (!report || !regulationColor) return null;

  const config = colorConfig[regulationColor];
  const sections = report.report_sections as Record<string, PhysioReportSection> | null;
  const responses = report.suggestion_responses as Record<string, string> | null;

  return (
    <Card className="overflow-hidden border-2 border-border/50">
      {/* Color header */}
      <div className={cn('p-4 border-b', config.header)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full animate-pulse', config.dot)} />
            <span className="font-bold text-sm">{config.label}</span>
            <span className={cn('px-2 py-0.5 rounded-full border text-xs font-mono font-bold', config.badge)}>
              {regulationScore}/100
            </span>
          </div>
          <Activity className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Headline */}
        {report.report_headline && (
          <p className="text-sm text-foreground leading-relaxed font-medium">
            {report.report_headline}
          </p>
        )}

        {/* Component scores mini-bar */}
        <div className="grid grid-cols-7 gap-1">
          {[
            { label: '💤', score: report.sleep_score, title: 'Sleep' },
            { label: '🧠', score: report.stress_score, title: 'Stress' },
            { label: '⚡', score: report.readiness_score, title: 'Readiness' },
            { label: '🤸', score: report.restriction_score, title: 'Movement' },
            { label: '🏋️', score: report.load_score, title: 'Load' },
            { label: '🥗', score: report.fuel_score, title: 'Fuel' },
            { label: '📅', score: report.calendar_score, title: 'Calendar' },
          ].map(({ label, score, title }) => (
            <div key={title} className="flex flex-col items-center gap-1">
              <span className="text-xs" title={title}>{label}</span>
              <div className="w-full h-8 bg-muted/30 rounded-sm overflow-hidden">
                <div
                  className={cn(
                    'w-full rounded-sm transition-all',
                    (score ?? 0) >= 72 ? 'bg-emerald-500' : (score ?? 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ height: `${score ?? 0}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground font-mono">{score ?? '?'}</span>
            </div>
          ))}
        </div>

        {/* Full report toggle */}
        {sections && Object.keys(sections).length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFull(!showFull)}
              className="w-full text-xs text-muted-foreground"
            >
              <ChevronDown className={cn('h-4 w-4 mr-1 transition-transform', showFull && 'rotate-180')} />
              {showFull ? 'Hide' : 'View'} Full Report & Recommendations
            </Button>
            
            {showFull && (
              <Accordion type="multiple" className="mt-3">
                {Object.entries(sections).map(([key, section]) => (
                  <ReportSectionCard
                    key={key}
                    sectionKey={key}
                    section={section}
                    response={responses?.[key] ?? null}
                    onRespond={logSuggestionResponse}
                  />
                ))}
              </Accordion>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-2 bg-muted/20 rounded-lg">
          <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Educational purposes only. Not medical advice. Consult a licensed professional for health concerns.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
