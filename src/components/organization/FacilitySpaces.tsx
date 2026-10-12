import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Archive, RotateCcw } from "lucide-react";

// Plan v3.1 Phase 6 — facility tools. A facility/academy lists its training
// spaces (cages, mounds, weight room...). Org admins manage the list; org
// members read it. Empty list says so plainly — nothing is fabricated.

const SPACE_TYPES: { value: string; label: string }[] = [
  { value: "cage", label: "Batting cage" },
  { value: "mound", label: "Pitching mound" },
  { value: "field", label: "Field" },
  { value: "weight_room", label: "Weight room" },
  { value: "track", label: "Track / sprint lane" },
  { value: "classroom", label: "Classroom / film room" },
  { value: "other", label: "Other" },
];

export function spaceTypeLabel(v: string): string {
  return SPACE_TYPES.find((t) => t.value === v)?.label ?? "Other";
}

type Space = {
  id: string;
  name: string;
  space_type: string;
  notes: string | null;
  active: boolean;
};

export function useFacilitySpaces(orgId: string | undefined) {
  return useQuery({
    queryKey: ["facility-spaces", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<Space[]> => {
      const { data, error } = await supabase
        .from("facility_spaces")
        .select("id, name, space_type, notes, active")
        .eq("organization_id", orgId!)
        .order("active", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as Space[];
    },
  });
}

export function FacilitySpaces({ orgId, canManage }: { orgId: string; canManage: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: spaces = [], isLoading } = useFacilitySpaces(orgId);
  const [name, setName] = useState("");
  const [spaceType, setSpaceType] = useState("cage");
  const [notes, setNotes] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["facility-spaces", orgId] });

  const addSpace = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("facility_spaces").insert({
        organization_id: orgId,
        name: name.trim(),
        space_type: spaceType,
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Space added" });
      setName("");
      setNotes("");
      refresh();
    },
    onError: (e) =>
      toast({ title: "Could not add space", description: (e as Error).message, variant: "destructive" }),
  });

  const setActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("facility_spaces").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refresh(),
    onError: (e) =>
      toast({ title: "Could not update space", description: (e as Error).message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-primary" />
          Training spaces
          <Badge variant="outline" className="ml-auto">{spaces.filter((s) => s.active).length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-20 animate-pulse rounded-md bg-muted/40" />
        ) : spaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No spaces listed yet.{canManage ? " Add your cages, mounds and rooms below." : ""}
          </p>
        ) : (
          <ul className="divide-y">
            {spaces.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${s.active ? "" : "text-muted-foreground line-through"}`}>
                    {s.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {spaceTypeLabel(s.space_type)}
                    {s.notes ? ` — ${s.notes}` : ""}
                  </p>
                </div>
                {!s.active && <Badge variant="outline" className="text-[10px]">Closed</Badge>}
                {canManage &&
                  (s.active ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActive.mutate({ id: s.id, active: false })}
                      title="Mark as closed (keeps the record)"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActive.mutate({ id: s.id, active: true })}
                      title="Reopen"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  ))}
              </li>
            ))}
          </ul>
        )}

        {canManage && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">Add a space</p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Name (e.g. Cage 1)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9"
                maxLength={80}
              />
              <Select value={spaceType} onValueChange={setSpaceType}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPACE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9"
              maxLength={500}
            />
            <Button
              size="sm"
              className="w-full"
              disabled={!name.trim() || addSpace.isPending}
              onClick={() => addSpace.mutate()}
            >
              <Plus className="mr-1 h-4 w-4" /> Add space
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
