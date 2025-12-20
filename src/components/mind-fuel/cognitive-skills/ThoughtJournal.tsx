import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BookOpen, ArrowRight, Save, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ThoughtEntry {
  situation: string;
  automaticThought: string;
  emotions: string;
  evidenceFor: string;
  evidenceAgainst: string;
  balancedThought: string;
}

export default function ThoughtJournal() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [entry, setEntry] = useState<ThoughtEntry>({
    situation: '',
    automaticThought: '',
    emotions: '',
    evidenceFor: '',
    evidenceAgainst: '',
    balancedThought: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const steps = [
    {
      key: 'situation',
      title: t('mentalWellness.cognitiveSkills.thoughtJournal.situationTitle', 'Describe the Situation'),
      description: t('mentalWellness.cognitiveSkills.thoughtJournal.situationDesc', 'What happened? Where were you? Who was involved?'),
      placeholder: t('mentalWellness.cognitiveSkills.thoughtJournal.situationPlaceholder', 'I was at practice when the coach criticized my performance in front of the team...')
    },
    {
      key: 'automaticThought',
      title: t('mentalWellness.cognitiveSkills.thoughtJournal.thoughtTitle', 'Automatic Thought'),
      description: t('mentalWellness.cognitiveSkills.thoughtJournal.thoughtDesc', 'What thought immediately popped into your head?'),
      placeholder: t('mentalWellness.cognitiveSkills.thoughtJournal.thoughtPlaceholder', 'I\'m terrible at this sport. Everyone thinks I\'m a failure...')
    },
    {
      key: 'emotions',
      title: t('mentalWellness.cognitiveSkills.thoughtJournal.emotionsTitle', 'Identify Emotions'),
      description: t('mentalWellness.cognitiveSkills.thoughtJournal.emotionsDesc', 'What emotions did you feel? Rate their intensity (1-10).'),
      placeholder: t('mentalWellness.cognitiveSkills.thoughtJournal.emotionsPlaceholder', 'Embarrassed (8/10), Angry (6/10), Hopeless (7/10)...')
    },
    {
      key: 'evidenceFor',
      title: t('mentalWellness.cognitiveSkills.thoughtJournal.evidenceForTitle', 'Evidence For'),
      description: t('mentalWellness.cognitiveSkills.thoughtJournal.evidenceForDesc', 'What evidence supports this thought?'),
      placeholder: t('mentalWellness.cognitiveSkills.thoughtJournal.evidenceForPlaceholder', 'I did make several mistakes during practice today...')
    },
    {
      key: 'evidenceAgainst',
      title: t('mentalWellness.cognitiveSkills.thoughtJournal.evidenceAgainstTitle', 'Evidence Against'),
      description: t('mentalWellness.cognitiveSkills.thoughtJournal.evidenceAgainstDesc', 'What evidence contradicts this thought?'),
      placeholder: t('mentalWellness.cognitiveSkills.thoughtJournal.evidenceAgainstPlaceholder', 'I\'ve had many good performances. The coach also praised me last week...')
    },
    {
      key: 'balancedThought',
      title: t('mentalWellness.cognitiveSkills.thoughtJournal.balancedTitle', 'Balanced Thought'),
      description: t('mentalWellness.cognitiveSkills.thoughtJournal.balancedDesc', 'Create a more balanced, realistic thought.'),
      placeholder: t('mentalWellness.cognitiveSkills.thoughtJournal.balancedPlaceholder', 'I had a tough practice, but one bad day doesn\'t define my abilities...')
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('thought_logs').insert({
        user_id: user.id,
        situation: entry.situation,
        automatic_thought: entry.automaticThought,
        emotions: entry.emotions.split(',').map(e => e.trim()),
        evidence_for: entry.evidenceFor,
        evidence_against: entry.evidenceAgainst,
        balanced_thought: entry.balancedThought
      });

      if (error) throw error;

      toast({
        title: t('mentalWellness.cognitiveSkills.thoughtJournal.saved', 'Thought Recorded'),
        description: t('mentalWellness.cognitiveSkills.thoughtJournal.savedDesc', 'Great job working through your thoughts!')
      });

      setEntry({
        situation: '',
        automaticThought: '',
        emotions: '',
        evidenceFor: '',
        evidenceAgainst: '',
        balancedThought: ''
      });
      setStep(0);
    } catch (error) {
      console.error('Error saving thought:', error);
      toast({
        title: t('common.error', 'Error'),
        description: t('mentalWellness.cognitiveSkills.thoughtJournal.saveError', 'Failed to save thought'),
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentStep = steps[step];
  const currentValue = entry[currentStep.key as keyof ThoughtEntry];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-wellness-sage/20 to-wellness-sky/20 border-wellness-sage/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-wellness-sage" />
            {t('mentalWellness.cognitiveSkills.thoughtJournal.title', 'CBT Thought Journal')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t('mentalWellness.cognitiveSkills.thoughtJournal.intro', 'Challenge negative thoughts by examining the evidence and creating balanced perspectives.')}
          </p>

          {/* Progress indicator */}
          <div className="flex gap-1 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-wellness-sage' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Current step */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">{currentStep.title}</Label>
              <p className="text-sm text-muted-foreground mt-1">{currentStep.description}</p>
            </div>

            <Textarea
              value={currentValue}
              onChange={(e) => setEntry({ ...entry, [currentStep.key]: e.target.value })}
              placeholder={currentStep.placeholder}
              rows={4}
              className="resize-none"
            />

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 0}
              >
                {t('common.back', 'Back')}
              </Button>

              {step < steps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!currentValue.trim()}
                  className="gap-2"
                >
                  {t('common.next', 'Next')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={!currentValue.trim() || isSaving}
                  className="gap-2 bg-wellness-sage hover:bg-wellness-sage/90"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? t('common.saving', 'Saving...') : t('common.save', 'Save Entry')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tip card */}
      <Card className="bg-wellness-cream/50 border-wellness-sage/20">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-wellness-sage shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{t('mentalWellness.cognitiveSkills.thoughtJournal.tipTitle', 'Pro Tip')}</p>
              <p className="text-sm text-muted-foreground">
                {t('mentalWellness.cognitiveSkills.thoughtJournal.tipText', 'The goal isn\'t to think positively, but to think realistically. Look for evidence on both sides.')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
