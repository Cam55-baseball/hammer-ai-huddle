import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookMarked, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Trash2,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface JournalEntry {
  id: string;
  entry_type: string;
  title: string | null;
  content: string;
  emotion_tags: string[];
  mood_level: number | null;
  created_at: string;
}

interface JournalHistoryProps {
  entries: JournalEntry[];
  isLoading: boolean;
  onRefresh: () => void;
}

const moodEmojis: Record<number, string> = {
  1: '😔',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😊',
};

export default function JournalHistory({ entries, isLoading, onRefresh }: JournalHistoryProps) {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;

    try {
      const { error } = await supabase
        .from('mental_health_journal')
        .delete()
        .eq('id', entryToDelete);

      if (error) throw error;
      toast.success(t('mentalWellness.journal.entryDeleted', 'Entry deleted'));
      onRefresh();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error(t('mentalWellness.journal.deleteError', 'Failed to delete entry'));
    } finally {
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="border-dashed border-2 border-wellness-sage/30 bg-transparent">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-wellness-sage/10 mb-4">
            <BookMarked className="h-8 w-8 text-wellness-sage" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {t('mentalWellness.journal.noEntries', 'No journal entries yet')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {t('mentalWellness.journal.startWriting', 'Start writing to begin your mental wellness journey. Your thoughts matter.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {entries.map((entry) => {
          const isExpanded = expandedIds.has(entry.id);
          const shouldTruncate = entry.content.length > 150;

          return (
            <Card 
              key={entry.id} 
              className="border-border/50 hover:border-wellness-sage/30 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      {entry.mood_level && (
                        <span className="text-lg">{moodEmojis[entry.mood_level]}</span>
                      )}
                      {entry.title && (
                        <h4 className="font-medium text-foreground truncate">{entry.title}</h4>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(entry.created_at), 'MMM d, yyyy · h:mm a')}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <p className={`text-sm text-muted-foreground whitespace-pre-wrap ${!isExpanded && shouldTruncate ? 'line-clamp-3' : ''}`}>
                      {entry.content}
                    </p>

                    {/* Expand/Collapse Button */}
                    {shouldTruncate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(entry.id)}
                        className="mt-2 h-7 px-2 text-xs text-wellness-lavender hover:text-wellness-lavender"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            {t('mentalWellness.journal.showLess', 'Show less')}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            {t('mentalWellness.journal.showMore', 'Show more')}
                          </>
                        )}
                      </Button>
                    )}

                    {/* Emotion Tags */}
                    {entry.emotion_tags && entry.emotion_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {entry.emotion_tags.map((tag) => (
                          <Badge 
                            key={tag} 
                            variant="outline" 
                            className="text-xs capitalize bg-wellness-soft-gray border-wellness-lavender/20"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setEntryToDelete(entry.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('mentalWellness.journal.delete', 'Delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('mentalWellness.journal.deleteConfirmTitle', 'Delete this entry?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('mentalWellness.journal.deleteConfirmDesc', 'This action cannot be undone. This entry will be permanently deleted.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('mentalWellness.journal.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
