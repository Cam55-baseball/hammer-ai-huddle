import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Plus, History, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface TriggerCategory {
  id: string;
  emoji: string;
  color: string;
}

const TRIGGER_CATEGORIES: TriggerCategory[] = [
  { id: 'work', emoji: '💼', color: 'bg-blue-100 border-blue-300' },
  { id: 'relationships', emoji: '❤️', color: 'bg-pink-100 border-pink-300' },
  { id: 'health', emoji: '🏥', color: 'bg-green-100 border-green-300' },
  { id: 'performance', emoji: '🏆', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'environment', emoji: '🌍', color: 'bg-teal-100 border-teal-300' },
  { id: 'other', emoji: '💭', color: 'bg-gray-100 border-gray-300' },
];

const EMOTION_COLORS: Record<string, string> = {
  joy: 'bg-yellow-200',
  trust: 'bg-emerald-200',
  fear: 'bg-violet-200',
  surprise: 'bg-orange-200',
  sadness: 'bg-sky-200',
  disgust: 'bg-teal-200',
  anger: 'bg-red-200',
  anticipation: 'bg-pink-200',
};

interface TriggerEntry {
  id: string;
  emotion: string;
  trigger_category: string | null;
  trigger_description: string | null;
  intensity: number | null;
  created_at: string;
}

interface TriggerTrackerProps {
  onTriggerAdded?: () => void;
}

export default function TriggerTracker({ onTriggerAdded }: TriggerTrackerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [view, setView] = useState<'add' | 'history' | 'patterns'>('add');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [recentTriggers, setRecentTriggers] = useState<TriggerEntry[]>([]);

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchRecentTriggers();
  }, []);

  const fetchRecentTriggers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('emotion_tracking')
        .select('*')
        .eq('user_id', user.id)
        .not('trigger_category', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentTriggers(data || []);
    } catch (error) {
      console.error('Error fetching triggers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCategory || !selectedEmotion) {
      toast({
        title: t('emotionalAwareness.triggers.selectRequired', 'Selection required'),
        description: t('emotionalAwareness.triggers.selectBoth', 'Please select both a trigger and emotion'),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase.from('emotion_tracking').insert({
        user_id: user.id,
        emotion: selectedEmotion,
        trigger_category: selectedCategory,
        trigger_description: description || null,
      });

      toast({
        title: t('emotionalAwareness.triggers.saved', 'Trigger logged'),
        description: t('emotionalAwareness.triggers.savedDesc', 'Your trigger has been recorded.'),
      });

      // Reset form
      setSelectedCategory(null);
      setSelectedEmotion('');
      setDescription('');
      
      fetchRecentTriggers();
      onTriggerAdded?.();
    } catch (error) {
      console.error('Error saving trigger:', error);
      toast({
        title: t('common.error', 'Error'),
        description: t('emotionalAwareness.triggers.saveError', 'Failed to save trigger'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryPatterns = () => {
    const patterns: Record<string, { count: number; emotions: Record<string, number> }> = {};
    
    recentTriggers.forEach((trigger) => {
      if (!trigger.trigger_category) return;
      if (!patterns[trigger.trigger_category]) {
        patterns[trigger.trigger_category] = { count: 0, emotions: {} };
      }
      patterns[trigger.trigger_category].count++;
      patterns[trigger.trigger_category].emotions[trigger.emotion] = 
        (patterns[trigger.trigger_category].emotions[trigger.emotion] || 0) + 1;
    });

    return Object.entries(patterns)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
  };

  const quickEmotions = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'anticipation'];

  return (
    <Card className="border-wellness-coral/30 bg-gradient-to-br from-wellness-cream/50 to-white">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            {t('emotionalAwareness.triggers.title', 'Trigger Tracker')}
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={view === 'add' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('add')}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant={view === 'history' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('history')}
            >
              <History className="w-4 h-4" />
            </Button>
            <Button
              variant={view === 'patterns' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('patterns')}
            >
              <TrendingUp className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('emotionalAwareness.triggers.subtitle', 'Track what triggers your emotions')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add View */}
        {view === 'add' && (
          <div className="space-y-4 animate-fade-in">
            {/* Trigger Categories */}
            <div>
              <p className="text-sm font-medium mb-2">
                {t('emotionalAwareness.triggers.whatTriggered', 'What triggered this emotion?')}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {TRIGGER_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all duration-200 text-center",
                      cat.color,
                      selectedCategory === cat.id 
                        ? "ring-2 ring-primary ring-offset-2" 
                        : "hover:scale-105"
                    )}
                  >
                    <span className="text-2xl block mb-1">{cat.emoji}</span>
                    <span className="text-xs font-medium capitalize">
                      {t(`emotionalAwareness.triggers.categories.${cat.id}`, cat.id)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Emotion Selection */}
            <div>
              <p className="text-sm font-medium mb-2">
                {t('emotionalAwareness.triggers.emotion', 'What emotion did you feel?')}
              </p>
              <div className="flex flex-wrap gap-2">
                {quickEmotions.map((emotion) => (
                  <button
                    key={emotion}
                    onClick={() => setSelectedEmotion(emotion)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                      EMOTION_COLORS[emotion] || 'bg-muted',
                      selectedEmotion === emotion && "ring-2 ring-primary ring-offset-1"
                    )}
                  >
                    {t(`emotionalAwareness.emotionWheel.emotions.${emotion}`, emotion)}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-sm font-medium mb-2">
                {t('emotionalAwareness.triggers.describeSituation', 'Describe the situation (optional)')}
              </p>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('emotionalAwareness.triggers.descriptionPlaceholder', 'What happened...')}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleSave} 
              disabled={isSaving || !selectedCategory || !selectedEmotion}
              className="w-full"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('emotionalAwareness.triggers.logTrigger', 'Log Trigger')}
            </Button>
          </div>
        )}

        {/* History View */}
        {view === 'history' && (
          <div className="space-y-3 animate-fade-in">
            <h4 className="text-sm font-medium">
              {t('emotionalAwareness.triggers.recentTriggers', 'Recent Triggers')}
            </h4>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentTriggers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('emotionalAwareness.triggers.noTriggers', 'No triggers logged yet')}
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {recentTriggers.map((trigger) => {
                  const category = TRIGGER_CATEGORIES.find(c => c.id === trigger.trigger_category);
                  return (
                    <div
                      key={trigger.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        category?.color || 'bg-muted'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span>{category?.emoji}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs",
                            EMOTION_COLORS[trigger.emotion] || 'bg-muted'
                          )}>
                            {trigger.emotion}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(trigger.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      {trigger.trigger_description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {trigger.trigger_description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Patterns View */}
        {view === 'patterns' && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-sm font-medium">
              {t('emotionalAwareness.triggers.patterns', 'Your Patterns')}
            </h4>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : getCategoryPatterns().length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('emotionalAwareness.triggers.noPatterns', 'Log more triggers to see patterns')}
              </p>
            ) : (
              <div className="space-y-3">
                {getCategoryPatterns().map(([categoryId, data]) => {
                  const category = TRIGGER_CATEGORIES.find(c => c.id === categoryId);
                  const topEmotion = Object.entries(data.emotions)
                    .sort((a, b) => b[1] - a[1])[0];
                  
                  return (
                    <div
                      key={categoryId}
                      className={cn("p-3 rounded-lg border", category?.color)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{category?.emoji}</span>
                          <span className="font-medium capitalize">
                            {t(`emotionalAwareness.triggers.categories.${categoryId}`, categoryId)}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {data.count} {t('emotionalAwareness.triggers.times', 'times')}
                        </span>
                      </div>
                      {topEmotion && (
                        <p className="text-sm text-muted-foreground">
                          {t('emotionalAwareness.triggers.mostlyFeel', 'You mostly feel')}{' '}
                          <span className={cn(
                            "px-2 py-0.5 rounded-full",
                            EMOTION_COLORS[topEmotion[0]] || 'bg-muted'
                          )}>
                            {topEmotion[0]}
                          </span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
