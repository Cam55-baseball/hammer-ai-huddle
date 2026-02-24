import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { usePerformanceSession, DrillBlock } from '@/hooks/usePerformanceSession';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { useSportConfig } from '@/hooks/useSportConfig';
import { Plus, Zap } from 'lucide-react';

const SESSION_TYPES = ['individual_practice', 'team_practice', 'lesson', 'bullpen'] as const;

export function QuickAddSession() {
  const { sport } = useSportTheme();
  const { drills } = useSportConfig();
  const { createSession, saving } = usePerformanceSession();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [sessionType, setSessionType] = useState('');
  const [drillType, setDrillType] = useState('');
  const [grade, setGrade] = useState(50);

  const handleSubmit = async () => {
    const block: DrillBlock = {
      id: crypto.randomUUID(),
      drill_type: drillType,
      intent: 'general',
      volume: 1,
      execution_grade: grade,
      outcome_tags: [],
    };
    await createSession({
      sport: sport || 'baseball',
      session_type: sessionType,
      session_date: new Date().toISOString().slice(0, 10),
      drill_blocks: [block],
      player_grade: grade,
    });
    setOpen(false);
    reset();
  };

  const reset = () => { setStep(1); setSessionType(''); setDrillType(''); setGrade(50); };

  const drillOptions = Array.isArray(drills) ? drills.slice(0, 20) : [];

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="lg" className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg p-0">
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Quick Add Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">Step 1: Session Type</p>
              <Select value={sessionType} onValueChange={v => { setSessionType(v); setStep(2); }}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">Step 2: Primary Drill</p>
              <Select value={drillType} onValueChange={v => { setDrillType(v); setStep(3); }}>
                <SelectTrigger><SelectValue placeholder="Select drill" /></SelectTrigger>
                <SelectContent>
                  {drillOptions.map((d: any) => (
                    <SelectItem key={d.id ?? d} value={d.id ?? d}>{d.name ?? d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">Step 3: Rate Execution ({grade})</p>
              <Slider value={[grade]} onValueChange={([v]) => setGrade(v)} min={20} max={80} step={5} />
              <Button onClick={handleSubmit} disabled={saving} className="w-full">
                {saving ? 'Saving...' : 'Save Session'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
