/**
 * useCloseOnBack — intentionally inert.
 *
 * This hook used to push a throwaway history entry whenever a sheet or dialog
 * opened, so an Android hardware back press would close the overlay instead of
 * leaving the app. In practice it kept corrupting real navigation:
 *
 *  - it once broke the Calendar module (back-out on unmount undid the route
 *    change the athlete had just made);
 *  - the overlay entry is invisible to react-router, so a later in-app "back"
 *    could resolve to the app root instead of the previous screen;
 *  - closing a sheet by tapping a menu item races the route change, and the
 *    rewind swallows a genuine history entry — the athlete lands on the
 *    dashboard instead of the screen they came from.
 *
 * The app now ships as a native iOS app, where there is no hardware back
 * button at all, so the hook buys nothing and costs correct navigation. It is
 * kept as a no-op so its two call sites (sheet, dialog) stay unchanged; if
 * Android hardware back is ever needed, implement it with the Capacitor App
 * back-button listener rather than by mutating browser history.
 */
export function useCloseOnBack(_open?: boolean, _onOpenChange?: (v: boolean) => void) {
  // no-op
}
