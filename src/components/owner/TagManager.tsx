import { useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVideoLibraryAdmin } from "@/hooks/useVideoLibraryAdmin";
import type { LibraryTag } from "@/hooks/useVideoLibrary";

interface TagManagerProps {
  tags: LibraryTag[];
  onRefresh: () => void;
}

const TAG_CATEGORIES = ['sport', 'category', 'position', 'skill_type', 'topic'];

export function TagManager({ tags, onRefresh }: TagManagerProps) {
  const { addTag, deleteTag } = useVideoLibraryAdmin();
  const [newTag, setNewTag] = useState('');
  const [newCategory, setNewCategory] = useState('topic');
  const [newParent, setNewParent] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  const filtered = tags.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || t.category === filterCat;
    return matchSearch && matchCat;
  });

  const handleAdd = async () => {
    if (!newTag.trim()) return;
    const ok = await addTag(newTag.trim(), newCategory, newParent || undefined);
    if (ok) {
      setNewTag('');
      onRefresh();
    }
  };

  const handleDelete = async (tagId: string) => {
    const ok = await deleteTag(tagId);
    if (ok) onRefresh();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h4 className="font-semibold">Add New Tag</h4>
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Tag name"
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            className="flex-1 min-w-[150px]"
          />
          <Select value={newCategory} onValueChange={setNewCategory}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAG_CATEGORIES.map(c => (
                <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Parent (e.g. hitting)"
            value={newParent}
            onChange={e => setNewParent(e.target.value)}
            className="w-[160px]"
          />
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
      </Card>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tags..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TAG_CATEGORIES.map(c => (
              <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} tags</p>

      <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto">
        {filtered.map(tag => (
          <Badge key={tag.id} variant="secondary" className="gap-1.5 py-1">
            <span>{tag.name}</span>
            {tag.category && <span className="text-[10px] text-muted-foreground">({tag.category})</span>}
            <button onClick={() => handleDelete(tag.id)} className="hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
