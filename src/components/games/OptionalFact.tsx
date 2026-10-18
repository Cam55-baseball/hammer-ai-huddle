import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Three states: recorded yes, recorded no, or no observation. */
export function OptionalFact({ label, value, onChange }: { label: string; value: unknown; onChange: (value: boolean | "") => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value === true ? "true" : value === false ? "false" : "unknown"} onValueChange={(v) => onChange(v === "unknown" ? "" : v === "true")}>
        <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="unknown">Not entered</SelectItem>
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}