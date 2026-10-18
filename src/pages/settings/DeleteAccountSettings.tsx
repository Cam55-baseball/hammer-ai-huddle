/** Settings → Delete account. Available to every account, no switch (Apple 5.1.1(v)). */
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useSubscription } from "@/hooks/useSubscription";
import { DeleteAccountSection } from "@/components/account/DeleteAccountSection";
import { ParentControls } from "@/components/parent/ParentControls";
import { useParentLinks } from "@/hooks/useParentLink";
import { Button } from "@/components/ui/button";

export default function DeleteAccountSettings() {
  const { user } = useAuth();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const { modules } = useSubscription();
  const { data: parentLinks } = useParentLinks();
  const children = (parentLinks ?? []).filter((link) => link.status === "active" && !link.revoked_at);
  if (!user) return null;
  return (
    <main className="min-h-screen bg-background p-4 pt-[calc(1rem+var(--safe-top))] pb-[calc(1rem+var(--safe-bottom))]">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground min-h-11">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold">Account settings</h1>
        <ParentControls userId={user.id} />
        {children.length > 0 && <section className="space-y-3">
          <h2 className="text-lg font-semibold">Children’s scouting visibility</h2>
          {children.map((child) => <div key={child.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
            <p className="text-sm">Athlete: {child.athlete_full_name || "Name not entered"}</p>
            <Button asChild variant="outline" className="h-auto min-h-11 whitespace-normal">
              <Link to={`/parent/athletes/${child.athlete_user_id}/recruiting`}>Choose what scouts can see</Link>
            </Button>
          </div>)}
        </section>}
        <DeleteAccountSection
          userId={user.id}
          isStaff={isOwner || isAdmin}
          hasActiveSubscription={(modules?.length ?? 0) > 0}
        />
      </div>
    </main>
  );
}
