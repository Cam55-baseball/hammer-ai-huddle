import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, Save } from 'lucide-react';

interface CoachOverridePanelProps {
  sessionId: string;
  currentPlayerGrade?: number;
  onOverrideSubmitted?: () => void;
}

export function CoachOverridePanel({ sessionId, currentPlayerGrade, onOverrideSubmitted }: CoachOverridePanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [grade, setGrade] = useState(currentPlayerGrade ?? 50);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('coach_grade_overrides').insert({
        session_id: sessionId,
        coach_id: user.id,
        original_grade: currentPlayerGrade,
        override_grade: grade,
        override_reason: reason || null,
      });
      if (error) throw error;
      toast({ title: 'Override Submitted', description: 'Coach grade override has been recorded.' });
      onOverrideSubmitted?.();
    } catch {
      toast({ title: 'Error', description: 'Failed to submit override.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          Coach Grade Override
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentPlayerGrade != null && (
          <p className="text-sm text-muted-foreground">Player Self-Grade: <span className="font-medium text-foreground">{currentPlayerGrade}</span></p>
        )}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Coach Grade (20-80): {grade}</label>
          <Slider value={[grade]} onValueChange={([v]) => setGrade(v)} min={20} max={80} step={5} className="mt-1" />
        </div>
        <Textarea placeholder="Override reason / notes (optional)" value={reason} onChange={e => setReason(e.target.value)} rows={2} />
        <Button onClick={handleSubmit} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-1" /> Submit Override
        </Button>
      </CardContent>
    </Card>
  );
}
