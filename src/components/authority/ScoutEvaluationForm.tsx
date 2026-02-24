import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Eye, Send } from 'lucide-react';

interface ScoutEvaluationFormProps {
  athleteId?: string;
  onSubmitted?: () => void;
}

const toolGrades = ['hitting', 'pitching', 'fielding', 'running', 'arm'] as const;

export function ScoutEvaluationForm({ athleteId, onSubmitted }: ScoutEvaluationFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [targetId, setTargetId] = useState(athleteId ?? '');
  const [grades, setGrades] = useState<Record<string, number>>({
    hitting: 50, pitching: 50, fielding: 50, running: 50, arm: 50,
  });
  const [overallGrade, setOverallGrade] = useState(50);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!user || !targetId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('scout_evaluations' as any).insert({
        scout_id: user.id,
        athlete_id: targetId,
        tool_grades: grades,
        overall_grade: overallGrade,
        projection_notes: notes || null,
      });
      if (error) throw error;
      toast({ title: 'Evaluation Submitted', description: 'Scout evaluation recorded.' });
      onSubmitted?.();
    } catch {
      toast({ title: 'Error', description: 'Failed to submit evaluation.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          Scout Evaluation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!athleteId && (
          <Input placeholder="Athlete User ID" value={targetId} onChange={e => setTargetId(e.target.value)} className="h-9" />
        )}

        {toolGrades.map(tool => (
          <div key={tool}>
            <label className="text-xs font-medium text-muted-foreground capitalize">{tool}: {grades[tool]}</label>
            <Slider
              value={[grades[tool]]}
              onValueChange={([v]) => setGrades(g => ({ ...g, [tool]: v }))}
              min={20} max={80} step={5} className="mt-1"
            />
          </div>
        ))}

        <div>
          <label className="text-xs font-medium text-muted-foreground">Overall Grade: {overallGrade}</label>
          <Slider value={[overallGrade]} onValueChange={([v]) => setOverallGrade(v)} min={20} max={80} step={5} className="mt-1" />
        </div>

        <Textarea placeholder="Projection notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />

        <Button onClick={handleSubmit} disabled={saving || !targetId} className="w-full">
          <Send className="h-4 w-4 mr-1" /> Submit Evaluation
        </Button>
      </CardContent>
    </Card>
  );
}
