## Add prominent "Back to login" button on Create Account view

The sign-up (Create Account) view currently only shows a small muted text link "Already have an account?" at the bottom. Users who clicked Sign Up by accident may miss it. We'll promote it to a prominent button matching the styling we already use for the "Sign up" CTA on the login view, so the two flows feel symmetrical.

### Change

**File:** `src/pages/Auth.tsx` (lines 317–354)

Extend the existing conditional that currently only styles the login → signup CTA prominently. Add a third branch for the signup view (`!isForgotPassword && !isLogin`) that renders an equivalent prominent outline button labeled "Back to login" (using the existing `auth.alreadyHaveAccount` i18n key) with a `LogIn` icon from lucide-react, wrapped in the same divider block (label: "Already have an account?").

Behavior: clicking it sets `isLogin(true)` and `isForgotPassword(false)` — same as the current text link.

The forgot-password view keeps its small text link ("Back to sign in") unchanged.

### Technical notes

- Add `LogIn` to the existing `lucide-react` imports.
- Reuse the same Button classes: `border-2 border-primary/60 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary font-semibold`, `variant="outline"`, `size="lg"`, `w-full`.
- No i18n additions needed; reuse `auth.alreadyHaveAccount`.
- No backend, routing, or business-logic changes.