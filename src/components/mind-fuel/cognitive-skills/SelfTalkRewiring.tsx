import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, ArrowRight, Plus, Trash2, Sparkles, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SelfTalkPair {
  id: string;
  negative: string;
  positive: string;
}

const defaultPairs: Omit<SelfTalkPair, 'id'>[] = [
  { negative: "I can't do this", positive: "I'm learning and improving every day" },
  { negative: "I always mess up", positive: "Mistakes help me grow stronger" },
  { negative: "I'm not good enough", positive: "I am enough just as I am" },
  { negative: "Everyone is better than me", positive: "I'm on my own unique journey" },
  { negative: "I'll never improve", positive: "Progress takes time, and I'm committed" }
];

export default function SelfTalkRewiring() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [pairs, setPairs] = useState<SelfTalkPair[]>(() => 
    defaultPairs.map((p, i) => ({ ...p, id: `default-${i}` }))
  );
  const [newNegative, setNewNegative] = useState('');
  const [newPositive, setNewPositive] = useState('');
  const [practiceMode, setPracticeMode] = useState(false);
  const [currentPractice, setCurrentPractice] = useState(0);
  const [showPositive, setShowPositive] = useState(false);

  const handleAdd = () => {
    if (newNegative.trim() && newPositive.trim()) {
      setPairs([...pairs, { 
        id: `custom-${Date.now()}`, 
        negative: newNegative.trim(), 
        positive: newPositive.trim() 
      }]);
      setNewNegative('');
      setNewPositive('');
      toast({
        title: t('mentalWellness.cognitiveSkills.selfTalk.added', 'Added!'),
        description: t('mentalWellness.cognitiveSkills.selfTalk.addedDesc', 'Your new self-talk pair has been saved.')
      });
    }
  };

  const handleRemove = (id: string) => {
    setPairs(pairs.filter(p => p.id !== id));
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  const handlePracticeNext = () => {
    setShowPositive(false);
    if (currentPractice < pairs.length - 1) {
      setCurrentPractice(currentPractice + 1);
    } else {
      setCurrentPractice(0);
      setPracticeMode(false);
      toast({
        title: t('mentalWellness.cognitiveSkills.selfTalk.practiceComplete', 'Practice Complete!'),
        description: t('mentalWellness.cognitiveSkills.selfTalk.practiceCompleteDesc', 'Great job reinforcing positive self-talk!')
      });
    }
  };

  if (practiceMode) {
    const current = pairs[currentPractice];
    
    return (
      <Card className="bg-gradient-to-br from-wellness-lavender/20 to-wellness-sage/20 border-wellness-lavender/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-wellness-lavender" />
              {t('mentalWellness.cognitiveSkills.selfTalk.practiceTitle', 'Practice Mode')}
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {currentPractice + 1} / {pairs.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-muted-foreground mb-1">
                {t('mentalWellness.cognitiveSkills.selfTalk.whenYouThink', 'When you think...')}
              </p>
              <p className="text-lg font-medium text-destructive">"{current.negative}"</p>
            </div>

            {!showPositive ? (
              <Button 
                onClick={() => setShowPositive(true)}
                className="w-full bg-wellness-lavender hover:bg-wellness-lavender/90"
              >
                {t('mentalWellness.cognitiveSkills.selfTalk.reveal', 'Reveal Positive Reframe')}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-wellness-sage/10 rounded-lg border border-wellness-sage/20">
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('mentalWellness.cognitiveSkills.selfTalk.sayInstead', 'Say instead...')}
                  </p>
                  <p className="text-lg font-medium text-wellness-sage">"{current.positive}"</p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleSpeak(current.positive)}
                    className="flex-1 gap-2"
                  >
                    <Volume2 className="h-4 w-4" />
                    {t('mentalWellness.cognitiveSkills.selfTalk.hearIt', 'Hear It')}
                  </Button>
                  <Button 
                    onClick={handlePracticeNext}
                    className="flex-1 gap-2 bg-wellness-sage hover:bg-wellness-sage/90"
                  >
                    {t('common.next', 'Next')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button 
            variant="ghost" 
            onClick={() => setPracticeMode(false)}
            className="w-full"
          >
            {t('common.exit', 'Exit Practice')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-wellness-lavender/20 to-wellness-sage/20 border-wellness-lavender/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-wellness-lavender" />
            {t('mentalWellness.cognitiveSkills.selfTalk.title', 'Self-Talk Rewiring')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.cognitiveSkills.selfTalk.intro', 'Replace negative self-talk with empowering alternatives. Practice makes these new patterns automatic.')}
          </p>

          <Button 
            onClick={() => setPracticeMode(true)}
            className="w-full bg-wellness-lavender hover:bg-wellness-lavender/90 gap-2"
            disabled={pairs.length === 0}
          >
            <Sparkles className="h-4 w-4" />
            {t('mentalWellness.cognitiveSkills.selfTalk.startPractice', 'Start Practice Session')}
          </Button>
        </CardContent>
      </Card>

      {/* Add new pair */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('mentalWellness.cognitiveSkills.selfTalk.addNew', 'Add Your Own')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">
              {t('mentalWellness.cognitiveSkills.selfTalk.negativeLabel', 'Negative thought pattern')}
            </label>
            <Input
              value={newNegative}
              onChange={(e) => setNewNegative(e.target.value)}
              placeholder={t('mentalWellness.cognitiveSkills.selfTalk.negativePlaceholder', 'I always fail when...')}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">
              {t('mentalWellness.cognitiveSkills.selfTalk.positiveLabel', 'Positive replacement')}
            </label>
            <Input
              value={newPositive}
              onChange={(e) => setNewPositive(e.target.value)}
              placeholder={t('mentalWellness.cognitiveSkills.selfTalk.positivePlaceholder', 'Each challenge helps me grow...')}
            />
          </div>
          <Button 
            onClick={handleAdd}
            disabled={!newNegative.trim() || !newPositive.trim()}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('common.add', 'Add')}
          </Button>
        </CardContent>
      </Card>

      {/* Existing pairs */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground px-1">
          {t('mentalWellness.cognitiveSkills.selfTalk.yourPairs', 'Your Self-Talk Pairs')} ({pairs.length})
        </h3>
        {pairs.map((pair) => (
          <Card key={pair.id} className="overflow-hidden">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                    <p className="text-sm text-muted-foreground line-through">{pair.negative}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 text-wellness-sage shrink-0" />
                    <p className="text-sm font-medium">{pair.positive}</p>
                  </div>
                </div>
                {pair.id.startsWith('custom') && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemove(pair.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
