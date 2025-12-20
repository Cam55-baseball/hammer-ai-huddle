import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PenLine, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import EmotionTagSelector from './EmotionTagSelector';
import MoodSlider from './MoodSlider';

interface FreeJournalEntryProps {
  onSave: () => void;
  onCancel: () => void;
}

export default function FreeJournalEntry({ onSave, onCancel }: FreeJournalEntryProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [emotionTags, setEmotionTags] = useState<string[]>([]);
  const [moodLevel, setMoodLevel] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!user || !content.trim()) {
      toast.error(t('mentalWellness.journal.contentRequired', 'Please write something before saving'));
      return;
    }

    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('mental_health_journal')
        .insert({
          user_id: user.id,
          entry_type: 'free',
          title: title.trim() || null,
          content: content.trim(),
          emotion_tags: emotionTags,
          mood_level: moodLevel,
        });

      if (error) throw error;
      onSave();
    } catch (error) {
      console.error('Error saving journal entry:', error);
      toast.error(t('mentalWellness.journal.saveError', 'Failed to save entry'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-wellness-sage/30 bg-gradient-to-br from-wellness-cream to-background">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-wellness-sage/20">
                <PenLine className="h-4 w-4 text-wellness-sage" />
              </div>
              <CardTitle className="text-lg">{t('mentalWellness.journal.freeWrite', 'Free Write')}</CardTitle>
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="bg-wellness-sage hover:bg-wellness-sage/90 text-wellness-sage-foreground"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t('mentalWellness.journal.save', 'Save')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm text-muted-foreground">
            {t('mentalWellness.journal.titleOptional', 'Title (Optional)')}
          </Label>
          <Input
            id="title"
            placeholder={t('mentalWellness.journal.titlePlaceholder', 'Give this entry a title...')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-background/50 border-wellness-sage/30 focus:border-wellness-sage"
          />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="content" className="text-sm text-muted-foreground">
            {t('mentalWellness.journal.whatOnMind', "What's on your mind?")}
          </Label>
          <Textarea
            id="content"
            placeholder={t('mentalWellness.journal.writePlaceholder', 'Let your thoughts flow freely. This is your safe space...')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[200px] bg-background/50 border-wellness-sage/30 focus:border-wellness-sage resize-none"
          />
        </div>

        {/* Mood Slider */}
        <div className="space-y-3">
          <Label className="text-sm text-muted-foreground">
            {t('mentalWellness.journal.howFeeling', 'How are you feeling right now?')}
          </Label>
          <MoodSlider value={moodLevel} onChange={setMoodLevel} />
        </div>

        {/* Emotion Tags */}
        <div className="space-y-3">
          <Label className="text-sm text-muted-foreground">
            {t('mentalWellness.journal.emotionTags', 'Tag your emotions (optional)')}
          </Label>
          <EmotionTagSelector 
            selectedTags={emotionTags} 
            onTagsChange={setEmotionTags} 
          />
        </div>

        {/* Helpful Prompts */}
        <div className="pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-3">
            {t('mentalWellness.journal.needInspiration', 'Need inspiration? Try these prompts:')}
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              t('mentalWellness.journal.prompt1', 'What am I grateful for today?'),
              t('mentalWellness.journal.prompt2', 'What challenge did I face?'),
              t('mentalWellness.journal.prompt3', 'What made me smile?'),
            ].map((prompt, i) => (
              <button
                key={i}
                onClick={() => setContent(prev => prev ? `${prev}\n\n${prompt}` : prompt)}
                className="px-3 py-1.5 text-xs rounded-full bg-wellness-lavender/10 text-wellness-lavender hover:bg-wellness-lavender/20 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
