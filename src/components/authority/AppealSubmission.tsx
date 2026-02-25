import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Scale, Upload, Loader2, CheckCircle } from 'lucide-react';

interface AppealSubmissionProps {
  sessionId: string;
  sessionDate?: string;
  playerGrade?: number;
  coachGrade?: number;
  onSubmitted?: () => void;
}

export function AppealSubmission({ sessionId, sessionDate, playerGrade, coachGrade, onSubmitted }: AppealSubmissionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason.trim()) return;
    setLoading(true);
    try {
      let videoUrl: string | null = null;

      // Upload video evidence if provided
      if (videoFile) {
        const ext = videoFile.name.split('.').pop();
        const path = `${user.id}/appeals/${sessionId}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('scout-videos')
          .upload(path, videoFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('scout-videos')
          .getPublicUrl(path);
        videoUrl = urlData.publicUrl;
      }

      // Create governance flag of type arbitration_request
      const { error } = await supabase.from('governance_flags').insert({
        user_id: user.id,
        flag_type: 'arbitration_request',
        severity: 'info',
        source_session_id: sessionId,
        video_evidence_url: videoUrl,
        details: {
          reason,
          player_grade: playerGrade,
          coach_grade: coachGrade,
          session_date: sessionDate,
        },
      });
      if (error) throw error;

      setSubmitted(true);
      toast({ title: 'Appeal Submitted', description: 'An admin will review your dispute.' });
      onSubmitted?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-2">
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
          <p className="font-semibold">Appeal Submitted</p>
          <p className="text-sm text-muted-foreground">Your dispute is under review.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Dispute Grade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {playerGrade != null && coachGrade != null && (
          <div className="rounded-lg border p-3 grid grid-cols-2 gap-3 text-center text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Your Grade</p>
              <p className="text-xl font-bold">{playerGrade}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Coach Grade</p>
              <p className="text-xl font-bold">{coachGrade}</p>
            </div>
          </div>
        )}

        <Textarea
          placeholder="Describe why you believe this grade should be reviewed..."
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1">
            <Upload className="h-4 w-4" />
            Video Evidence (optional)
          </label>
          <Input
            type="file"
            accept="video/*"
            onChange={e => setVideoFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !reason.trim()}
          className="w-full"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Submit Appeal
        </Button>
      </CardContent>
    </Card>
  );
}
