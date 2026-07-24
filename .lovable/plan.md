Move the "Landing Page" button on the auth/welcome back page so it sits below the "Don't have an account, sign up" button.

## Current state
- `src/pages/Auth.tsx` renders the "Landing Page" outline button inside the top text-center header block (above the form), shown on all auth modes.
- The "New to {branding.appName}?" divider + "Don't have an account, sign up" button appears in the `!isForgotPassword && isLogin` branch.

## Change
1. In `src/pages/Auth.tsx`, remove the "Landing Page" button from the header area.
2. Add it immediately after the "Don't have an account, sign up" `Button` within the `isLogin` block, as a secondary outline button with a small top margin.
3. Keep the existing `onClick={() => navigate("/")}` behavior and label text unchanged.
4. Ensure the button is only shown on the welcome-back (login) state, not on the sign-up form or forgot-password form.

## Verify
- Run a typecheck/build and visually confirm the landing page button now appears below the sign-up prompt on `/auth` in the login state.