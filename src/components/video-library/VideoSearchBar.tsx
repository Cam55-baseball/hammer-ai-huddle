import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface VideoSearchBarProps {
  onSearch: (term: string) => void;
  onTrackSearch?: (term: string) => void;
}

export function VideoSearchBar({ onSearch, onTrackSearch }: VideoSearchBarProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
      if (value.trim().length >= 3 && onTrackSearch) {
        onTrackSearch(value.trim());
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value, onSearch, onTrackSearch]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search videos by title, tag, or topic..."
        value={value}
        onChange={e => setValue(e.target.value)}
        className="pl-10 pr-10"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          onClick={() => setValue('')}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
