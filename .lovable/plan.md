# Plan: Collapsible Coach Hammer Next Best Step Card

## Goal
Convert the **Coach Hammer · Next Best Step** card into a collapsible dropdown card. It starts closed, but the title remains clearly visible in the collapsed header, with a dropdown arrow indicating open/closed state.

## Where
- `src/components/dashboard/CommunicationAI.tsx`

## How
1. **Import collapsible primitives** already present in the project:
   - `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
   - `ChevronDown` from `lucide-react`

2. **Add closed-by-default state**:
   - `const [open, setOpen] = useState(false);`

3. **Make the header the trigger**:
   - Wrap the existing card in `Collapsible open={open} onOpenChange={setOpen}`.
   - Convert the header row (Sparkles icon + heading + tier badge) into a `CollapsibleTrigger asChild` so it is keyboard accessible.
   - Add a `ChevronDown` icon that rotates when open (`data-[state=open]:rotate-180`) next to the tier badge.
   - Keep the heading text exactly: **“Coach Hammer · Next Best Step”** — visible when closed.
   - Keep the tier badge in the collapsed header so the user still sees urgency.

4. **Move body content into CollapsibleContent**:
   - Step title, analysis, instruction, why, CTA button, and the “Personalize your signal” link all live inside `CollapsibleContent`.
   - Smooth expand/collapse using `data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up` on the content.

5. **Keep existing behavior**:
   - Loading skeleton stays unchanged and non-collapsible.
   - `if (!step) return null` stays unchanged.
   - CTA navigation still works inside the expanded panel.

6. **Parent pages**:
   - `Dashboard.tsx` and `Today.tsx` use the component unchanged; no layout or prop changes needed.

## Validation
- Run `bun run build` and confirm no errors.
- Open the dashboard preview and confirm the card renders collapsed, label is visible, chevron rotates, and content opens on click.