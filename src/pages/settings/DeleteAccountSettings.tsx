/** Settings → Delete account. Available to every account, no switch (Apple 5.1.1(v)). */
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useSubscription } from "@/hooks/useSubscription";
import { DeleteAccountSection } from "@/components/account/DeleteAccountSection";
import { ParentControls } from "@/components/parent/ParentControls";

export default function DeleteAccountSettings() {
  const { user } = useAuth();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const { modules } = useSubscription();
  if (!user) return null;
  return (
    <main className="min-h-screen bg-background p-4 pt-[calc(1rem+var(--safe-top))] pb-[calc(1rem+var(--safe-bottom))]">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground min-h-11">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold">Account settings</h1>
        <ParentControls userId={user.id} />
        <DeleteAccountSection
          userId={user.id}
          isStaff={isOwner || isAdmin}
          hasActiveSubscription={(modules?.length ?? 0) > 0}
        />
      </div>
    </main>
  );
}
