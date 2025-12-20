import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookMarked, Plus, Calendar, Tag, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import FreeJournalEntry from './FreeJournalEntry';
import JournalHistory from './JournalHistory';
import EmotionTagSelector from './EmotionTagSelector';

interface JournalEntry {
  id: string;
  entry_type: string;
  title: string | null;
  content: string;
  emotion_tags: string[];
  mood_level: number | null;
  created_at: string;
}

export default function JournalHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const fetchEntries = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      let query = supabase
        .from('mental_health_journal')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (selectedFilter) {
        query = query.contains('emotion_tags', [selectedFilter]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [user, selectedFilter]);

  const handleEntrySaved = () => {
    setShowNewEntry(false);
    fetchEntries();
    toast.success(t('mentalWellness.journal.entrySaved', 'Journal entry saved'));
  };

  const todaysEntryCount = entries.filter(e => {
    const entryDate = new Date(e.created_at).toDateString();
    return entryDate === new Date().toDateString();
  }).length;

  const uniqueEmotions = [...new Set(entries.flatMap(e => e.emotion_tags || []))];

  if (showNewEntry) {
    return (
      <FreeJournalEntry 
        onSave={handleEntrySaved} 
        onCancel={() => setShowNewEntry(false)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Journal Header Card */}
      <Card className="border-wellness-sage/30 bg-gradient-to-br from-wellness-cream to-background overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-wellness-sage/20">
                <BookMarked className="h-5 w-5 text-wellness-sage" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('mentalWellness.journal.title', 'Mental Health Journal')}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('mentalWellness.journal.subtitle', 'A safe space for your thoughts and feelings')}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowNewEntry(true)}
              className="bg-wellness-sage hover:bg-wellness-sage/90 text-wellness-sage-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('mentalWellness.journal.newEntry', 'New Entry')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Row */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-wellness-soft-gray">
              <Calendar className="h-4 w-4 text-wellness-lavender" />
              <span className="text-sm">
                <span className="font-medium">{todaysEntryCount}</span> {t('mentalWellness.journal.todayEntries', 'entries today')}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-wellness-soft-gray">
              <Sparkles className="h-4 w-4 text-wellness-coral" />
              <span className="text-sm">
                <span className="font-medium">{entries.length}</span> {t('mentalWellness.journal.totalEntries', 'total entries')}
              </span>
            </div>
          </div>

          {/* Emotion Filter Tags */}
          {uniqueEmotions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                <span>{t('mentalWellness.journal.filterByEmotion', 'Filter by emotion')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={selectedFilter === null ? "default" : "outline"}
                  className="cursor-pointer hover:bg-wellness-lavender/20"
                  onClick={() => setSelectedFilter(null)}
                >
                  {t('mentalWellness.journal.all', 'All')}
                </Badge>
                {uniqueEmotions.slice(0, 8).map((emotion) => (
                  <Badge
                    key={emotion}
                    variant={selectedFilter === emotion ? "default" : "outline"}
                    className="cursor-pointer hover:bg-wellness-lavender/20 capitalize"
                    onClick={() => setSelectedFilter(emotion)}
                  >
                    {emotion}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <div className="flex gap-3 p-4 rounded-xl bg-wellness-lavender/10 border border-wellness-lavender/20">
        <div className="text-sm text-muted-foreground">
          <p>
            🔒 {t('mentalWellness.journal.privacyNotice', 'Your journal entries are private and encrypted. Only you can see them.')}
          </p>
        </div>
      </div>

      {/* Journal Entries List */}
      <JournalHistory 
        entries={entries} 
        isLoading={isLoading} 
        onRefresh={fetchEntries}
      />
    </div>
  );
}
