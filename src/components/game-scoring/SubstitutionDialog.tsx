import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useCoachPlayerPool, type PoolPlayer } from '@/hooks/useCoachPlayerPool';
import { UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LineupPlayer } from '@/hooks/useGameScoring';

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'EH'];

interface SubstitutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outPlayer: LineupPlayer;
  activePlayerIds: Set<string>;
  onConfirm: (inPlayer: { name: string; position: string; player_user_id?: string }) => void;
}

export function SubstitutionDialog({ open, onOpenChange, outPlayer, activePlayerIds, onConfirm }: SubstitutionDialogProps) {
  const { data: pool = [], isLoading } = useCoachPlayerPool();
  const [mode, setMode] = useState<'search' | 'manual'>('search');
  const [customName, setCustomName] = useState('');
  const [position, setPosition] = useState(outPlayer.position);
  const [selectedPool, setSelectedPool] = useState<PoolPlayer | null>(null);

  const benchPlayers = pool.filter(p => !activePlayerIds.has(p.id));

  const handleConfirm = () => {
    if (mode === 'search' && selectedPool) {
      onConfirm({ name: selectedPool.name, position: selectedPool.position || position, player_user_id: selectedPool.id });
    } else if (mode === 'manual' && customName.trim()) {
      onConfirm({ name: customName.trim(), position });
    }
    resetState();
  };

  const resetState = () => {
    setCustomName('');
    setSelectedPool(null);
    setMode('search');
  };

  const canConfirm = mode === 'search' ? !!selectedPool : customName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Substitute for <span className="text-primary">{outPlayer.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant={mode === 'search' ? 'default' : 'outline'} size="sm" onClick={() => setMode('search')}>
              From Roster
            </Button>
            <Button variant={mode === 'manual' ? 'default' : 'outline'} size="sm" onClick={() => setMode('manual')}>
              <UserPlus className="h-3.5 w-3.5 mr-1" /> Manual Entry
            </Button>
          </div>

          {mode === 'search' ? (
            <Command className="border rounded-md">
              <CommandInput placeholder="Search bench players..." />
              <CommandList className="max-h-48">
                <CommandEmpty>{isLoading ? 'Loading...' : 'No bench players available.'}</CommandEmpty>
                <CommandGroup>
                  {benchPlayers.map(p => (
                    <CommandItem
                      key={p.id}
                      value={p.name}
                      onSelect={() => setSelectedPool(prev => prev?.id === p.id ? null : p)}
                      className={cn(selectedPool?.id === p.id && 'bg-primary/10')}
                    >
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={p.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{p.name}</span>
                      {p.position && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p.position}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Player Name</Label>
                <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Enter name" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Position</Label>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" disabled={!canConfirm} onClick={handleConfirm}>Confirm Sub</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
