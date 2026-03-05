import { useState } from 'react';
import { Check, UserPlus, Users, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { PoolPlayer } from '@/hooks/useCoachPlayerPool';

interface PlayerSearchComboboxProps {
  players: PoolPlayer[];
  selectedIds: Set<string>;
  onSelect: (player: PoolPlayer) => void;
  isLoading?: boolean;
}

export function PlayerSearchCombobox({ players, selectedIds, onSelect, isLoading }: PlayerSearchComboboxProps) {
  const [open, setOpen] = useState(false);

  const linked = players.filter(p => p.source === 'linked' || p.source === 'both');
  const rosterOnly = players.filter(p => p.source === 'roster');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full" disabled={isLoading}>
          <UserPlus className="h-4 w-4 mr-1" />
          {isLoading ? 'Loading players...' : 'Add from Roster'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search players..." />
          <CommandList>
            <CommandEmpty>No players found.</CommandEmpty>
            {linked.length > 0 && (
              <CommandGroup heading="Linked Players">
                {linked.map(p => (
                  <CommandItem
                    key={p.id}
                    value={p.name}
                    disabled={selectedIds.has(p.id)}
                    onSelect={() => { onSelect(p); }}
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{p.name}</span>
                    {p.position && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p.position}</span>
                    )}
                    {selectedIds.has(p.id) && <Check className="h-4 w-4 ml-1 text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {rosterOnly.length > 0 && (
              <CommandGroup heading="Team Roster">
                {rosterOnly.map(p => (
                  <CommandItem
                    key={p.id}
                    value={p.name}
                    disabled={selectedIds.has(p.id)}
                    onSelect={() => { onSelect(p); }}
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{p.name}</span>
                    {p.position && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p.position}</span>
                    )}
                    {selectedIds.has(p.id) && <Check className="h-4 w-4 ml-1 text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
