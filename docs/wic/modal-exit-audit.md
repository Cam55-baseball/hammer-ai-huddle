# Modal exit audit — 2026-09-07

Every overlay an athlete can land in was checked for a way out. Four exits are
the standard: a visible close control, tap outside, the Escape key, and the
phone's back button/gesture.

## What was changed

| Surface | Change |
| --- | --- |
| `ui/dialog` | Root wrapped with `useCloseOnBack`; close control enlarged to a 20px icon in a 8px-padded round tap target, `z-10`; content capped at `max-h-[calc(100dvh-2rem)]` with scroll so the close control is never pushed off-screen. |
| `ui/sheet` | Root wrapped with `useCloseOnBack`; close control already present. |
| `ui/drawer` | Added a visible close control (none existed — only the drag handle). |
| `ArmCareLibraryDialog` | Header pinned (`shrink-0`), body scrolls in a `min-h-0 flex-1` region, so the title and the X stay put while the movement list scrolls. |

`useCloseOnBack` pushes one throwaway history entry while an overlay is open,
consumes it on back, and removes it again on unmount — so back closes the
overlay instead of leaving the page.

## Coverage

- 33 files use `ui/dialog`, 15 use `ui/sheet`, 6 use `ui/popover`, 0 use `ui/drawer`.
- No file imports `@radix-ui/react-dialog` directly, and no file hides the close
  control (`[&>button]:hidden` / `hideClose`) — so the primitive fixes reach
  every modal in the app.
- Every `AlertDialog` in the codebase renders an `AlertDialogCancel`. Alert
  dialogs deliberately do not close on outside-tap or Escape; Cancel is the exit.

## Hand-rolled full-screen overlays (not Radix)

| Surface | Exit |
| --- | --- |
| `EnhancedVideoPlayer` | Visible X |
| `PhotoTimelineDialog` lightbox | Visible X |
| `PauseResetButton` | Visible X |
| `tex-vision/ActiveDrillView` (6 phases) | `onExit` control on each phase |
| `DrillReflectionPhase` | Skip control |
| `FullscreenTestWrapper` | Cancel control + confirm |
| `ReactionSignal`, `ManualRepRunner` signal flash | Transient by design — auto-dismisses or dismisses on any tap; not a trap |

No overlay in the app now holds an athlete without a way out.
