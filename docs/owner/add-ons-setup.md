# Add-ons setup guide (owner)

Two add-ons on the player Dashboard, under the Coach and Organization plans tiles:
- **Early 6-Week Recap — $100**: iPhone = Apple in-app purchase; web = Stripe Checkout (Apple Pay in Safari).
- **Hammers Online ×4 — Private lessons — $20,000**: iPhone = Stripe Apple Pay/card sheet (Guideline 3.1.3(d), one-to-one real-time service); web = Stripe Checkout.

Stripe products are already created: Early recap `price_1UYvr6Gc5QIzbAH6Iz0qCvzl`, Lessons `price_1UYvr6Gc5QIzbAH6to4iebWW`.

Do these in order. Nothing goes live until you publish and ship a new iOS build.

## 1. App Store Connect — the in-app purchase product
1. App Store Connect → Apps → Hammers Modality → **Monetization → In-App Purchases** → **+**.
2. Type **Consumable**. Reference name "Early 6-Week Recap". Product ID **`com.hammersmodality.app.early_recap_6wk`** (must match exactly).
3. **Availability**: all territories you sell in. **Price Schedule** → Add Pricing → **$99.99**. Apple's price list has no exactly-$100 tier; $99.99 is the closest, and the web price stays $100. Tell me if you'd rather match $99.99 on the web too.
4. Localization: Display name "Early 6-Week Recap"; description "Your 6-week recap early, covering this block so far."
5. Review information: screenshot of the Add-ons rows; note "Consumable. One per 6-week block, after 14 days."
6. Save. Submit it **with** the next app version (step 6).
7. Agreements, Tax and Banking → make sure the **Paid Apps** agreement is Active.

## 2. App Store Connect — the server key (for checking every purchase with Apple)
1. App Store Connect → **Users and Access → Integrations → In-App Purchase** → **Generate In-App Purchase Key** (name "Hammers server").
2. Download the `.p8` file (you can only download it once). Note the **Key ID** and the **Issuer ID** shown at the top of that page.
3. In Lovable: **Project Settings → Secrets**, add:
   - `APPLE_IAP_ISSUER_ID` = the Issuer ID
   - `APPLE_IAP_KEY_ID` = the Key ID
   - `APPLE_IAP_PRIVATE_KEY` = the full text of the .p8 file (including the BEGIN/END lines)
   - `APPLE_BUNDLE_ID` = your app's bundle ID (Xcode → target → General → Bundle Identifier)

## 3. Apple Developer — Apple Pay merchant ID
1. developer.apple.com → Certificates, IDs & Profiles → **Identifiers → +** → **Merchant IDs** → `merchant.org.hammersmodality` (the app uses this exact ID; tell me if you pick another).
2. Stripe Dashboard → **Settings → Payment methods → Apple Pay → iOS certificates → Add new application** → download Stripe's CSR.
3. Back in Apple Developer → your merchant ID → **Apple Pay Payment Processing Certificate → Create Certificate** → upload Stripe's CSR → download the .cer → upload it to Stripe.
4. Identifiers → your **App ID** → enable **Apple Pay Payment Processing** and **In-App Purchase** → choose the merchant ID → Save. Regenerate provisioning profiles if Xcode asks.

## 4. Stripe — Apple Pay on the web + keys
1. Stripe Dashboard → **Settings → Payment methods** → make sure **Apple Pay** and **Cards** are on.
2. **Apple Pay → Web domains → Add** `hammersmodality.org` and `www.hammersmodality.org` (Stripe Checkout's own page usually needs no file; add the domains anyway).
3. Developers → API keys → copy the **Publishable key** (starts `pk_live_`). In Lovable **Project Settings → Secrets** add `STRIPE_PUBLISHABLE_KEY` = that key (the iPhone payment sheet needs it).

## 5. Google — your Workspace calendar
1. In the Lovable editor: **Connectors** (left menu / workspace settings) → **Google Calendar** → **Connect** (or https://lovable.dev/connectors/google_calendar/connect?workspace=B8Q0GHCjSZ0dmndjJ3Rl).
2. Sign in as **hammersmodality@hammersmodality.org** and allow the calendar access.
3. Open this project → Connectors → **link** that Google Calendar connection to the project. Then tell me "Google Calendar connected" and I'll check it reads your free/busy.
4. Workspace admin (admin.google.com) → Apps → Google Workspace → Calendar → sharing: allow external invitations, so players and parents get the invites. Google Meet must be on for your account.
5. Owner Dashboard → **Lesson requests** → **Lesson hours** → check the defaults (Mon–Fri, 9:00–5:00 Eastern, 48 hours' notice, 8 weeks ahead) and Save.

## 6. Xcode — the new iOS build (you do this; I didn't touch the iOS project)
1. Pull the latest code from GitHub. Run `npm install`, then `npm run build`, then `npx cap sync ios`. This adds the two new plugins: `@capgo/native-purchases` and `@capacitor-community/stripe`.
2. Open `ios/App/App.xcworkspace`. Target **App → Signing & Capabilities → + Capability**:
   - **In-App Purchase**
   - **Apple Pay** → tick `merchant.org.hammersmodality`
3. Bump the build number, Product → Archive → Distribute → App Store Connect.
4. In App Store Connect, add the build to the new version, attach the **Early 6-Week Recap** in-app purchase to the version, and submit for review. In the review notes, explain that the private lessons are a real-time one-to-one service paid with Apple Pay through Stripe, under Guideline 3.1.3(d).
5. Test first with a **Sandbox** tester (Users and Access → Sandbox) on TestFlight. The server checks both Apple's live and sandbox systems.

## 7. One more approval
Early recaps can't be made yet. The shared recap generator needs one small change first, and that needs your approval by name: see `docs/owner/early-recap-generator-patch.md`. Until then, recap purchases are saved and wait. They're delivered automatically after the change, with no second charge.

## How it works (for reference)
- Under 18: the player taps "Ask parent". The linked parent sees the request on Parent → Athletes and pays from their own account. Players under 18 with no linked parent are told to invite a parent first. Parents are copied on every lesson invite.
- Lessons: once paid, the player picks 4 times on 4 different days. The times come from your open lesson hours minus busy times on your Google Calendar, shown in the player's own time zone. You then get a notice under Owner Dashboard → **Lesson requests**, where you can **Confirm & send invites** (this creates the 4 events with Meet links) or **Ask for new times**. The player can ask to move a lesson, and you approve it or keep the original time.
- Reminders: Google sends an email 24 hours before each lesson and a pop-up 1 hour before. The app also shows a reminder within 24 hours. No scheduled jobs were added.
