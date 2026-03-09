import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Lightbulb, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function IdeaDropBox() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [idea, setIdea] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!idea.trim()) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('submit-idea', {
        body: { idea: idea.trim(), userId: user?.id },
      });

      if (error) throw error;

      toast.success(t('helpDesk.ideaSubmitted', 'Thanks! Your idea has been submitted.'));
      setIdea('');
    } catch (err) {
      console.error('Failed to submit idea:', err);
      toast.error(t('common.error', 'Something went wrong. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-5 w-5 text-primary" />
          {t('helpDesk.ideaBox.title', 'Got an idea? Drop it in the box!')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('helpDesk.ideaBox.subtitle', 'Help us build the best app — share your suggestions, feature requests, or feedback.')}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder={t('helpDesk.ideaBox.placeholder', 'Describe your idea or suggestion...')}
          rows={4}
          maxLength={1000}
          className="resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{idea.length}/1000</span>
          <Button
            onClick={handleSubmit}
            disabled={!idea.trim() || submitting}
            size="sm"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {t('helpDesk.ideaBox.submit', 'Submit Idea')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
