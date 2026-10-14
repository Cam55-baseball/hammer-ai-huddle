import { useAuth } from "@/hooks/useAuth";

/** Shows who is buying, so a shared phone never buys on the wrong account. */
export function SignedInAs() {
  const { user } = useAuth();
  if (!user) return null;
  const name = (user.user_metadata?.full_name as string | undefined) ?? "";
  return (
    <p className="text-sm text-muted-foreground" data-testid="signed-in-as">
      Signed in as <span className="font-medium text-foreground">{user.email}</span>
      {name ? ` (${name})` : ""}
    </p>
  );
}
