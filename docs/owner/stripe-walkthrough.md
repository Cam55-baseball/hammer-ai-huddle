# Stripe walkthrough — check every plan, sponsorship, pause and cancel

Open your Stripe dashboard (live mode, the switch at the top right must NOT say "Test mode").

## 1. Products and prices
Product catalog → Products. You should see:
- Hammers Coach — $300.00 / month (prod_VQjeb6G4nQbIfZ, price_1UPsB6Gc5QIzbAH6k6wtj6NI)
- Hammers Organization — $1,000.00 / month, 5 coach seats included (prod_VQjea2xzqwAqvj, price_1UPsB7Gc5QIzbAH6Q42AlTdT)
- Extra Coach Seat — $150.00 / month per seat (prod_VQje6yyL8w42rs, price_1UPsB8Gc5QIzbAH6l4p2C4oU)
- The player plans (Complete Pitcher $200, 5Tool Player $300, Golden 2Way $400, baseball and softball). Sponsorships use these same prices — no extra product.

## 2. A sponsorship
Customers → search the organization admin's email. Under Subscriptions, each sponsored player is its own subscription.
- Description reads "Sponsorship — <player name> (<plan>, <sport>)". This is printed on the invoice, so every charge shows the player.
- Metadata shows sponsorship_id and sponsored_player_id.
- Invoices go to the organization's email.

## 3. Sponsoring a player who already pays
Search the player's email → their own subscription shows "Cancels <date>" (it won't renew). On the organization's sponsorship subscription, the first invoice is $0 and the next charge date equals that same date. No double charge, no refund.

## 4. Pause
On the sponsorship subscription: a "Paused" badge ("collection paused, invoices voided"). No charges while paused. The player keeps access until the end of the month already paid.

## 5. Resume
The "Paused" badge is gone; the next charge date is back.

## 6. Cancel
The sponsorship subscription shows "Canceled". The player keeps full access for 14 days in the app and gets a message to choose their own plan. If they do, a new subscription appears under the player's own email.

## 7. Webhooks
Developers → Webhooks → your endpoint → each event above (customer.subscription.created / updated / deleted) should show a 200 response.
