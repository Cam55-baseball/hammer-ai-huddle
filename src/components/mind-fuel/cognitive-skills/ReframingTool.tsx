import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Sparkles, ArrowRight, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const reframingPrompts = [
  { key: 'evidence', prompt: 'What evidence do I have for and against this thought?' },
  { key: 'friend', prompt: 'What would I say to a friend who had this thought?' },
  { key: 'worst', prompt: 'What\'s the worst that could happen? Could I cope?' },
  { key: 'learn', prompt: 'What can I learn from this situation?' },
  { key: 'control', prompt: 'What parts of this can I actually control?' },
  { key: 'year', prompt: 'Will this matter in a week? A month? A year?' }
];

export default function ReframingTool() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [negativeThought, setNegativeThought] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<number | null>(null);
  const [reframedThought, setReframedThought] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (reframedThought) {
      navigator.clipboard.writeText(reframedThought);
      setCopied(true);
      toast({
        title: t('common.copied', 'Copied!'),
        description: t('mentalWellness.cognitiveSkills.reframing.copiedDesc', 'Your reframed thought has been copied.')
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setNegativeThought('');
    setSelectedPrompt(null);
    setReframedThought('');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-wellness-sky/20 to-wellness-sage/20 border-wellness-sky/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="h-5 w-5 text-wellness-sky" />
            {t('mentalWellness.cognitiveSkills.reframing.title', 'Thought Reframing Tool')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.cognitiveSkills.reframing.intro', 'Transform negative thoughts into more balanced perspectives using guided prompts.')}
          </p>
        </CardContent>
      </Card>

      {/* Step 1: Enter negative thought */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-wellness-coral/20 flex items-center justify-center text-xs font-bold text-wellness-coral">
                1
              </div>
              <h3 className="font-medium">
                {t('mentalWellness.cognitiveSkills.reframing.step1', 'Enter Your Negative Thought')}
              </h3>
            </div>
            <Textarea
              value={negativeThought}
              onChange={(e) => setNegativeThought(e.target.value)}
              placeholder={t('mentalWellness.cognitiveSkills.reframing.step1Placeholder', 'I\'ll never be good enough to make the team...')}
              rows={3}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Choose a prompt */}
      {negativeThought.trim() && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-wellness-lavender/20 flex items-center justify-center text-xs font-bold text-wellness-lavender">
                  2
                </div>
                <h3 className="font-medium">
                  {t('mentalWellness.cognitiveSkills.reframing.step2', 'Choose a Reframing Question')}
                </h3>
              </div>
              <div className="grid gap-2">
                {reframingPrompts.map((item, index) => (
                  <Button
                    key={item.key}
                    variant={selectedPrompt === index ? "default" : "outline"}
                    className={`justify-start text-left h-auto py-3 px-4 ${
                      selectedPrompt === index ? 'bg-wellness-lavender hover:bg-wellness-lavender/90' : ''
                    }`}
                    onClick={() => setSelectedPrompt(index)}
                  >
                    <Sparkles className="h-4 w-4 mr-2 shrink-0" />
                    <span className="text-sm">
                      {t(`mentalWellness.cognitiveSkills.reframing.prompts.${item.key}`, item.prompt)}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Write reframed thought */}
      {selectedPrompt !== null && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-wellness-sage/20 flex items-center justify-center text-xs font-bold text-wellness-sage">
                  3
                </div>
                <h3 className="font-medium">
                  {t('mentalWellness.cognitiveSkills.reframing.step3', 'Write Your Reframed Thought')}
                </h3>
              </div>
              <div className="p-3 bg-wellness-lavender/10 rounded-lg border border-wellness-lavender/20">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{t('mentalWellness.cognitiveSkills.reframing.question', 'Question')}: </span>
                  {t(`mentalWellness.cognitiveSkills.reframing.prompts.${reframingPrompts[selectedPrompt].key}`, reframingPrompts[selectedPrompt].prompt)}
                </p>
              </div>
              <Textarea
                value={reframedThought}
                onChange={(e) => setReframedThought(e.target.value)}
                placeholder={t('mentalWellness.cognitiveSkills.reframing.step3Placeholder', 'Write a more balanced perspective here...')}
                rows={4}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result and actions */}
      {reframedThought.trim() && (
        <Card className="bg-gradient-to-br from-wellness-sage/20 to-wellness-cream border-wellness-sage/30">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-wellness-sage" />
                <h3 className="font-medium text-wellness-sage">
                  {t('mentalWellness.cognitiveSkills.reframing.result', 'Your Reframed Perspective')}
                </h3>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm text-muted-foreground line-through">{negativeThought}</p>
                </div>
                <div className="p-3 bg-wellness-sage/10 rounded-lg">
                  <p className="text-sm font-medium">{reframedThought}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopy} className="gap-2">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? t('common.copied', 'Copied') : t('common.copy', 'Copy')}
                </Button>
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {t('common.startOver', 'Start Over')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
