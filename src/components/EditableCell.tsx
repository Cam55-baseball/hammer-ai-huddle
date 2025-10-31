import { useState } from "react";
import { Input } from "@/components/ui/input";

interface EditableCellProps {
  value: string | null;
  onSave: (value: string) => Promise<void>;
  placeholder: string;
}

export function EditableCell({ value, onSave, placeholder }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");

  const handleSave = async () => {
    await onSave(editValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setIsEditing(false);
        }}
        autoFocus
        className="max-w-[200px]"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-pointer hover:bg-muted/50 rounded px-2 py-1 min-h-[32px] flex items-center"
    >
      {value || <span className="text-muted-foreground italic">{placeholder}</span>}
    </div>
  );
}
