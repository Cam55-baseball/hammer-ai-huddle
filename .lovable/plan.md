Add a red dashed border around the DelayCam card to make it easy to spot under the video analysis section.

## What will change

File: `src/components/analyze/DelayCam.tsx`
- Update the root `<Card>` className at line 352 from:
  ```
  className="p-4 space-y-4"
  ```
  to:
  ```
  className="p-4 space-y-4 border-2 border-dashed border-red-500"
  ```
- This wraps the entire DelayCam card in a prominent red dashed outline while preserving existing padding and spacing.

## Verification
- Run `bunx tsc --noEmit` to confirm no type errors.
- Open `/analyze/throwing` (or any analysis page) and confirm the DelayCam card is outlined with a red dashed border.