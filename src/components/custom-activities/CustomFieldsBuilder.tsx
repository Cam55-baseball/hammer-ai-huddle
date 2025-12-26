import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CustomField } from '@/types/customActivity';
import { cn } from '@/lib/utils';

interface CustomFieldsBuilderProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

export function CustomFieldsBuilder({ fields, onChange }: CustomFieldsBuilderProps) {
  const { t } = useTranslation();
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const addField = () => {
    const newField: CustomField = {
      id: crypto.randomUUID(),
      label: '',
      value: '',
      type: 'text',
    };
    onChange([...fields, newField]);
    setExpandedField(newField.id);
  };

  const updateField = (id: string, updates: Partial<CustomField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const toggleExpanded = (id: string) => {
    setExpandedField(expandedField === id ? null : id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-bold">
          {t('customActivity.customFields.title')} ({fields.length})
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addField}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          {t('customActivity.customFields.add')}
        </Button>
      </div>

      <div className="space-y-2">
        {fields.map(field => (
          <div key={field.id} className="rounded-lg border bg-background/50 overflow-hidden">
            {/* Main field row */}
            <div className="flex items-center gap-2 p-3">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <Input
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                  placeholder={t('customActivity.customFields.labelPlaceholder')}
                  className="h-9"
                />
                {field.type === 'checkbox' ? (
                  <div className="flex items-center justify-center h-9">
                    <Checkbox
                      checked={field.value === 'true'}
                      onCheckedChange={(checked) => updateField(field.id, { value: checked ? 'true' : 'false' })}
                    />
                  </div>
                ) : (
                  <Input
                    value={field.value}
                    onChange={(e) => updateField(field.id, { value: e.target.value })}
                    placeholder={t('customActivity.customFields.valuePlaceholder')}
                    className="h-9"
                    type={field.type === 'number' ? 'number' : field.type === 'time' ? 'time' : 'text'}
                  />
                )}
                <Select
                  value={field.type}
                  onValueChange={(value) => updateField(field.id, { type: value as CustomField['type'] })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">{t('customActivity.customFields.types.text')}</SelectItem>
                    <SelectItem value="number">{t('customActivity.customFields.types.number')}</SelectItem>
                    <SelectItem value="time">{t('customActivity.customFields.types.time')}</SelectItem>
                    <SelectItem value="checkbox">{t('customActivity.customFields.types.checkbox')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => toggleExpanded(field.id)}
              >
                {expandedField === field.id ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive"
                onClick={() => removeField(field.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Expandable notes section */}
            {expandedField === field.id && (
              <div className="px-3 pb-3 border-t bg-muted/30">
                <div className="pt-3">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    {t('customActivity.customFields.notes', 'Description / Instructions')}
                  </Label>
                  <Textarea
                    value={field.notes || ''}
                    onChange={(e) => updateField(field.id, { notes: e.target.value })}
                    placeholder={t('customActivity.customFields.notesPlaceholder', 'Add description that will show when viewing this task...')}
                    className="min-h-[60px] text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {t('customActivity.customFields.notesHint', 'This text appears below the task when viewing the activity')}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {fields.length === 0 && (
          <p className="text-center py-6 text-muted-foreground text-sm">
            {t('customActivity.customFields.empty')}
          </p>
        )}
      </div>
    </div>
  );
}
