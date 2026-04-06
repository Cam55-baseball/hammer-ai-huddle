

# Lock Game Hub for Non-Admin/Non-Owner Users

## What This Does

Wraps the Game Hub page (`/game-scoring`) with a role check. Players, scouts, and coaches see a "Closed temporarily for renovations" message. Owners and admins retain full access.

## Changes

### 1. Modify `src/pages/GameScoring.tsx`

- Import `useOwnerAccess`, `useAdminAccess`, and UI components (`Construction` icon, `Card`)
- After the hooks load, check `isOwner || isAdmin`
- If neither: render a locked-out card with a construction icon and the message "Closed temporarily for renovations."
- If owner/admin: render the existing Game Hub as-is
- Show a loading skeleton while roles are being checked

### Technical Detail

```tsx
const { isOwner, loading: ownerLoading } = useOwnerAccess();
const { isAdmin, loading: adminLoading } = useAdminAccess();

if (ownerLoading || adminLoading) return <DashboardLayout><Skeleton /></DashboardLayout>;

if (!isOwner && !isAdmin) {
  return (
    <DashboardLayout>
      <Card className="max-w-md mx-auto mt-20 text-center p-8">
        <Construction className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">Game Hub Locked</h2>
        <p className="text-muted-foreground mt-2">
          Closed temporarily for renovations.
        </p>
      </Card>
    </DashboardLayout>
  );
}
```

No database changes needed. Single file edit.

