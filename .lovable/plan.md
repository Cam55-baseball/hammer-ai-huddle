## Goal

Make the small "i" info dots in the **Identity Command Card** open on **mobile tap** (touch), not just desktop mouse hover.

## Why it's broken today

In `src/components/identity/IdentityCommandCard.tsx`, each section header (`SectionHeader`, ~lines 516–538) wraps its info icon in a Radix `<Tooltip>`. Radix Tooltip is a **hover/focus-only** primitive — touch devices have no hover, so tapping the dot does nothing.

## Fix

Swap the `Tooltip` used inside `SectionHeader` for a `Popover`. Popover opens on click/tap on every device (mouse, touch, keyboard) and closes on outside tap or Escape. Visuals stay identical.

### Single file change: `src/components/identity/IdentityCommandCard.tsx`

1. Add the import (component already exists at `@/components/ui/popover.tsx`):
   ```ts
   import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
   ```

2. Rewrite `SectionHeader` to use Popover:
   ```tsx
   function SectionHeader({ title, helpText }: { title: string; helpText: string }) {
     return (
       <div className="flex items-center gap-1.5 mb-2">
         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
           {title}
         </h4>
         <Popover>
           <PopoverTrigger asChild>
             <button
               type="button"
               aria-label={`What is ${title}?`}
               onClick={(e) => e.stopPropagation()}
               className="text-muted-foreground/60 hover:text-foreground transition-colors p-1 -m-1"
             >
               <Info className="h-3 w-3" />
             </button>
           </PopoverTrigger>
           <PopoverContent
             side="top"
             align="start"
             className="max-w-[260px] text-xs leading-relaxed p-3"
             onClick={(e) => e.stopPropagation()}
           >
             {helpText}
           </PopoverContent>
         </Popover>
       </div>
     );
   }
   ```

   - `stopPropagation` prevents the parent card's `handleToggle` (line 254) from collapsing when the dot is tapped.
   - `p-1 -m-1` enlarges the touch target to ≥24px without changing layout.
   - `side="top"` + `max-w-[260px]` matches today's tooltip footprint.

3. Leave the surrounding `TooltipProvider` and unrelated tooltips alone. Only the info-dot pattern in `SectionHeader` changes.

## Out of scope

- No copy, layout, or styling changes elsewhere in the card.
- No changes to other identity files — all info dots in the identity card flow through `SectionHeader`.

## Validation

- **Mobile (touch):** tap an info dot → popover opens; tap outside → closes; parent card does not collapse.
- **Desktop (mouse):** click info dot → opens; click outside → closes.
- **Keyboard:** Tab to icon → Enter/Space opens; Escape closes.
