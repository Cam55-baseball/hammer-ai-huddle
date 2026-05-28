## Reorder dashboard cards

In `src/pages/Dashboard.tsx` (lines 551–552), swap the order so `CommunicationAI` (Coach Hammer · Next Best Step) renders above `IdentityCommandCard`.

Before:
```
<IdentityCommandCard />
<CommunicationAI />
```

After:
```
<CommunicationAI />
<IdentityCommandCard />
```

No other changes.