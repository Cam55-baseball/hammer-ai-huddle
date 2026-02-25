import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFolderTemplates } from '@/hooks/useFolderTemplates';
import { FolderOpen, Copy, Users } from 'lucide-react';

const TEMPLATE_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'hitting', label: 'Hitting' },
  { value: 'pitching', label: 'Pitching' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'general', label: 'General' },
];

interface FolderTemplateLibraryProps {
  sport: string;
  onDuplicated?: () => void;
}

export function FolderTemplateLibrary({ sport, onDuplicated }: FolderTemplateLibraryProps) {
  const { templates, loading, fetchTemplates, duplicateTemplate } = useFolderTemplates(sport);
  const [category, setCategory] = useState('all');
  const [duplicating, setDuplicating] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates(category === 'all' ? undefined : category);
  }, [category, fetchTemplates]);

  const handleDuplicate = async (templateId: string) => {
    setDuplicating(templateId);
    const result = await duplicateTemplate(templateId);
    setDuplicating(null);
    if (result) onDuplicated?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Template Library</h4>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEMPLATE_CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading templates...</p>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No templates available yet. Publish your folders to share with other coaches.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map(t => (
            <Card key={t.id} className="border-l-4" style={{ borderLeftColor: t.color }}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="h-4 w-4 flex-shrink-0" style={{ color: t.color }} />
                    <span className="font-medium text-sm truncate">{t.name}</span>
                  </div>
                  {t.template_category && (
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">{t.template_category}</Badge>
                  )}
                </div>

                {t.template_description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.template_description}</p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> Used {t.use_count || 0} times
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleDuplicate(t.id)}
                    disabled={duplicating === t.id}
                  >
                    <Copy className="h-3 w-3" />
                    {duplicating === t.id ? 'Copying...' : 'Use Template'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
