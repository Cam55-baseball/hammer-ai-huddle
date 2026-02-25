import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useSentActivities } from '@/hooks/useSentActivities';
import { Send, User } from 'lucide-react';

interface FolderAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
  onSend: (playerIds: string[]) => Promise<boolean>;
}

export function FolderAssignDialog({ open, onOpenChange, folderId, folderName, onSend }: FolderAssignDialogProps) {
  const { followedPlayers, fetchFollowedPlayers, loadingPlayers } = useSentActivities();
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFollowedPlayers();
      setSelected([]);
    }
  }, [open, fetchFollowedPlayers]);

  const togglePlayer = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (selected.length === 0) return;
    setSending(true);
    const success = await onSend(selected);
    setSending(false);
    if (success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send "{folderName}"
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">Select players to receive this folder.</p>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {loadingPlayers ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading players...</p>
          ) : followedPlayers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No players found. Follow players from your Coach Dashboard first.</p>
          ) : (
            followedPlayers.map(player => (
              <label key={player.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                <Checkbox
                  checked={selected.includes(player.id)}
                  onCheckedChange={() => togglePlayer(player.id)}
                />
                <div className="flex items-center gap-2 min-w-0">
                  {player.avatar_url ? (
                    <img src={player.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <span className="text-sm font-medium truncate">{player.full_name}</span>
                </div>
              </label>
            ))
          )}
        </div>

        <Button onClick={handleSend} disabled={selected.length === 0 || sending} className="w-full gap-2">
          <Send className="h-4 w-4" />
          {sending ? 'Sending...' : `Send to ${selected.length} Player${selected.length !== 1 ? 's' : ''}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
