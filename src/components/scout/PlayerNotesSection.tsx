import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { StickyNote, User, Pencil, Trash2, Save, X } from 'lucide-react';
import { format } from 'date-fns';

interface Player {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface PlayerNote {
  id: string;
  player_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface PlayerNotesSectionProps {
  players: Player[];
}

export function PlayerNotesSection({ players }: PlayerNotesSectionProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [notes, setNotes] = useState<PlayerNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (selectedPlayerId && user) {
      fetchNotes();
    } else {
      setNotes([]);
    }
  }, [selectedPlayerId, user]);

  const fetchNotes = async () => {
    if (!user || !selectedPlayerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('player_notes')
      .select('*')
      .eq('author_id', user.id)
      .eq('player_id', selectedPlayerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  const handleSaveNote = async () => {
    if (!user || !selectedPlayerId || !newNote.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('player_notes')
      .insert({ author_id: user.id, player_id: selectedPlayerId, content: newNote.trim() });

    if (error) {
      toast({ title: 'Error', description: 'Failed to save note.', variant: 'destructive' });
    } else {
      setNewNote('');
      toast({ title: 'Note saved' });
      fetchNotes();
    }
    setSaving(false);
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return;
    const { error } = await supabase
      .from('player_notes')
      .update({ content: editContent.trim() })
      .eq('id', noteId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update note.', variant: 'destructive' });
    } else {
      setEditingNoteId(null);
      setEditContent('');
      toast({ title: 'Note updated' });
      fetchNotes();
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from('player_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete note.', variant: 'destructive' });
    } else {
      toast({ title: 'Note deleted' });
      fetchNotes();
    }
  };

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="h-5 w-5" />
          Player Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a player..." />
          </SelectTrigger>
          <SelectContent>
            {players.map(player => (
              <SelectItem key={player.id} value={player.id}>
                {player.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedPlayerId && (
          <>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/profile?userId=${selectedPlayerId}`)}
              >
                <User className="h-4 w-4 mr-1" />
                View Profile
              </Button>
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder="Write a note about this player..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                rows={3}
              />
              <Button onClick={handleSaveNote} disabled={saving || !newNote.trim()} size="sm">
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving...' : 'Save Note'}
              </Button>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading notes...</p>
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet for {selectedPlayer?.full_name}.</p>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {notes.map(note => (
                    <div key={note.id} className="border rounded-md p-3 space-y-2">
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdateNote(note.id)}>
                              <Save className="h-3 w-3 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingNoteId(null)}>
                              <X className="h-3 w-3 mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setEditingNoteId(note.id); setEditContent(note.content); }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteNote(note.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </>
        )}

        {!selectedPlayerId && players.length > 0 && (
          <p className="text-sm text-muted-foreground">Select a player to view or add notes.</p>
        )}
        {players.length === 0 && (
          <p className="text-sm text-muted-foreground">Follow players to start taking notes.</p>
        )}
      </CardContent>
    </Card>
  );
}
