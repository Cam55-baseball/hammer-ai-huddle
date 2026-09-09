/**
 * Apple Guideline 1.2 — the list of people this user has blocked, with undo.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyBlocks, unblockUser, type BlockRecord } from "@/lib/safety/blocks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function BlockedUsersList() {
  const { user } = useAuth();
  const [rows, setRows] = useState<BlockRecord[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const blocks = await fetchMyBlocks(user.id);
    setRows(blocks);

    if (blocks.length > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, contact_email")
        .in("id", blocks.map((b) => b.blocked_id));
      const map: Record<string, string> = {};
      for (const p of (data ?? []) as { id: string; full_name: string | null; contact_email: string | null }[]) {
        map[p.id] = p.full_name || p.contact_email || "Blocked user";
      }
      setNames(map);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function undo(row: BlockRecord) {
    if (!user?.id) return;
    setBusyId(row.id);
    try {
      await unblockUser(user.id, row.blocked_id);
      toast.success("Unblocked", {
        description: "They can send you a link again if you want to connect.",
      });
      await load();
    } catch (e) {
      console.warn("[safety] unblock failed", e);
      toast.error("We could not undo that block");
    } finally {
      setBusyId(null);
    }
  }

  if (!user?.id) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Blocked users</h2>
        <p className="text-sm text-muted-foreground">
          Blocked people cannot see your profile or shared work, and cannot send you a link.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : rows.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">You have not blocked anyone.</Card>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Card className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium">{names[row.blocked_id] ?? "Blocked user"}</p>
                  <p className="text-xs text-muted-foreground">
                    Blocked {new Date(row.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11"
                  disabled={busyId === row.id}
                  onClick={() => undo(row)}
                >
                  Unblock
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
