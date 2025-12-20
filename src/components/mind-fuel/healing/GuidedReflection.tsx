import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Compass, RefreshCw, Save, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface ReflectionPrompt {
  id: string;
  category: string;
  prompt: string;
}

const reflectionPrompts: ReflectionPrompt[] = [
  { id: '1', category: 'growth', prompt: 'What challenge have you faced recently that taught you something valuable about yourself?' },
  { id: '2', category: 'gratitude', prompt: 'Name three things from today that you\'re grateful for, no matter how small.' },
  { id: '3', category: 'self-awareness', prompt: 'When do you feel most like yourself? What activities or people bring out your authentic self?' },
  { id: '4', category: 'healing', prompt: 'What is something from your past that you\'re ready to let go of? What would letting go look like?' },
  { id: '5', category: 'strength', prompt: 'Think of a time you overcame something difficult. What strengths did you discover in yourself?' },
  { id: '6', category: 'purpose', prompt: 'If you could wake up tomorrow with any skill or ability fully developed, what would it be and why?' },
  { id: '7', category: 'relationships', prompt: 'Who in your life makes you feel truly seen and heard? What makes that relationship special?' },
  { id: '8', category: 'future', prompt: 'Imagine your life 5 years from now at its best. What does it look like? What are you doing?' },
];

export default function GuidedReflection() {
  const { t } = useTranslation();
  const [currentPrompt, setCurrentPrompt] = useState<ReflectionPrompt>(
    reflectionPrompts[Math.floor(Math.random() * reflectionPrompts.length)]
  );
  const [response, setResponse] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const getNewPrompt = () => {
    const availablePrompts = reflectionPrompts.filter(p => p.id !== currentPrompt.id);
    const newPrompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
    setCurrentPrompt(newPrompt);
    setResponse('');
  };

  const handleSave = async () => {
    if (!response.trim()) {
      toast.error(t('mentalWellness.healing.reflection.writeFirst', 'Please write your reflection first'));
      return;
    }

    setIsSaving(true);
    // Simulate saving - in production, this would save to database
    await new Promise(resolve => setTimeout(resolve, 800));
    toast.success(t('mentalWellness.healing.reflection.saved', 'Reflection saved'));
    setIsSaving(false);
    setResponse('');
    getNewPrompt();
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      growth: 'bg-wellness-sage/20 text-wellness-sage',
      gratitude: 'bg-wellness-rose/20 text-wellness-rose',
      'self-awareness': 'bg-wellness-sky/20 text-wellness-sky',
      healing: 'bg-wellness-lavender/20 text-wellness-lavender',
      strength: 'bg-amber-100 text-amber-700',
      purpose: 'bg-violet-100 text-violet-700',
      relationships: 'bg-pink-100 text-pink-700',
      future: 'bg-cyan-100 text-cyan-700',
    };
    return colors[category] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Compass className="h-5 w-5 text-wellness-lavender" />
            {t('mentalWellness.healing.reflection.title', 'Guided Reflection')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.healing.reflection.intro', 'Take a moment to reflect on the prompt below. There are no right or wrong answers—just honest exploration of your thoughts and feelings.')}
          </p>

          {/* Prompt Card */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-wellness-lavender/10 to-wellness-rose/10 border border-wellness-lavender/20">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs px-2 py-1 rounded-full capitalize ${getCategoryColor(currentPrompt.category)}`}>
                {currentPrompt.category}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={getNewPrompt}
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {t('mentalWellness.healing.reflection.newPrompt', 'New Prompt')}
              </Button>
            </div>
            <p className="text-base font-medium leading-relaxed">
              {currentPrompt.prompt}
            </p>
          </div>

          {/* Response Area */}
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder={t('mentalWellness.healing.reflection.placeholder', 'Write your reflection here...')}
            className="min-h-[150px] resize-none"
          />

          {/* Actions */}
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              {response.length} {t('mentalWellness.healing.reflection.characters', 'characters')}
            </p>
            <Button
              onClick={handleSave}
              disabled={isSaving || !response.trim()}
              className="bg-wellness-lavender hover:bg-wellness-lavender/90"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {t('mentalWellness.healing.reflection.saveReflection', 'Save Reflection')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Prompts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {t('mentalWellness.healing.reflection.quickPrompts', 'Quick Prompts')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {reflectionPrompts.slice(0, 4).map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => {
                  setCurrentPrompt(prompt);
                  setResponse('');
                }}
                className={`text-left p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                  currentPrompt.id === prompt.id ? 'border-wellness-lavender bg-wellness-lavender/5' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm line-clamp-1">{prompt.prompt}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
