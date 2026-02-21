import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CustomField } from '@/types/customActivity';
import { cn } from '@/lib/utils';
import { Info, CheckSquare, Hash, Type, Clock } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CustomFieldsBuilderProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

interface SortableFieldItemProps {
  field: CustomField;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onUpdate: (updates: Partial<CustomField>) => void;
  onRemove: () => void;
}

function SortableFieldItem({ 
  field, 
  isExpanded, 
  onToggleExpanded, 
  onUpdate, 
  onRemove,
}: SortableFieldItemProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "rounded-lg border bg-background/50 overflow-hidden",
        isDragging && "shadow-lg ring-2 ring-primary"
      )}
    >
      {/* Main field row */}
      <div className="flex items-center gap-2 p-3 overflow-hidden">
        {/* Drag Handle */}
        <button
          type="button"
          className="touch-none cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-muted rounded"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder={t('customActivity.customFields.labelPlaceholder')}
            className="h-9"
          />
          {field.type === 'checkbox' ? (
            <div className="flex items-center justify-center h-9">
              <Checkbox
                checked={field.value === 'true'}
                onCheckedChange={(checked) => onUpdate({ value: checked ? 'true' : 'false' })}
              />
            </div>
          ) : (
            <Input
              value={field.value}
              onChange={(e) => onUpdate({ value: e.target.value })}
              placeholder={field.type === 'number' ? t('customActivity.customFields.numberPlaceholder', 'e.g. 4.2') : t('customActivity.customFields.valuePlaceholder')}
              className="h-9"
              type={field.type === 'number' ? 'number' : field.type === 'time' ? 'time' : 'text'}
            />
          )}
          <Select
            value={field.type}
            onValueChange={(value) => onUpdate({ type: value as CustomField['type'] })}
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
          onClick={onToggleExpanded}
        >
          {isExpanded ? (
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
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Expandable notes section */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t bg-muted/30">
          <div className="pt-3">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              {t('customActivity.customFields.notes', 'Description / Instructions')}
            </Label>
            <Textarea
              value={field.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
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
  );
}

export function CustomFieldsBuilder({ fields, onChange }: CustomFieldsBuilderProps) {
  const { t } = useTranslation();
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex(f => f.id === active.id);
      const newIndex = fields.findIndex(f => f.id === over.id);
      onChange(arrayMove(fields, oldIndex, newIndex));
    }
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

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Info className="h-3.5 w-3.5" />
          <span>{t('customActivity.customFields.guidance.title', 'How custom fields work')}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="rounded-md border bg-muted/30 p-3 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{t('customActivity.customFields.guidance.checkbox', "Track daily habits (e.g., 'Ice Bath,' 'Foam Roll,' 'Stretch Before Bed')")}</span>
            </div>
            <div className="flex items-start gap-2">
              <Hash className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{t('customActivity.customFields.guidance.number', "Track measurable data the AI analyzes for trends (e.g., 'Sprint Time: 4.2,' 'Weight Used: 185')")}</span>
            </div>
            <div className="flex items-start gap-2">
              <Type className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{t('customActivity.customFields.guidance.text', "Log notes or observations (e.g., 'How I felt today')")}</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{t('customActivity.customFields.guidance.time', "Track time-based data (e.g., 'Recovery Duration')")}</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={fields.map(f => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {fields.map(field => (
              <SortableFieldItem
                key={field.id}
                field={field}
                isExpanded={expandedField === field.id}
                onToggleExpanded={() => toggleExpanded(field.id)}
                onUpdate={(updates) => updateField(field.id, updates)}
                onRemove={() => removeField(field.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {fields.length === 0 && (
        <p className="text-center py-6 text-muted-foreground text-sm">
          {t('customActivity.customFields.empty')}
        </p>
      )}
    </div>
  );
}
