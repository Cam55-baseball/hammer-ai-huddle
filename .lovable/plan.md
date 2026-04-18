

Change "Estimated" pill in `HydrationLogCard.tsx` from `bg-primary/10 text-primary` (reads as red/alert) to a neutral muted style: `bg-muted text-muted-foreground border border-border/50`. Keeps the amber "Partial data" pill unchanged so the warning hierarchy stays intact.

File: `src/components/nutrition-hub/HydrationLogCard.tsx` — single className swap on the Estimated span.

