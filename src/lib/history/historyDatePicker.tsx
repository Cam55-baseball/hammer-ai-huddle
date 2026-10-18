import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function HistoryDatePicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const selected = value ? new Date(`${value}T12:00:00`) : undefined;
  return <Popover><PopoverTrigger asChild><Button variant="outline" className="justify-start gap-2" aria-label={label}><CalendarDays className="h-4 w-4" />{selected ? format(selected, "MMM d, yyyy") : label}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selected} onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")} initialFocus className="pointer-events-auto p-3" /></PopoverContent></Popover>;
}