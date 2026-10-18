# AD2 — Back-button overlap

PASS: affected TEST users, not an owner bypass, at 390×844.

- TEST college player: Coach plan-required screen. Back bottom 68px; heading top 80px.
- TEST coach: Organization plan-required screen. Back bottom 68px; heading top 80px.
- TEST coach: actual staff purchase page. Back bottom 60px; heading top 76px.
- TEST coach: active Coach team-report screen. Back bottom 52px; heading top 85px. Access only; populated report not claimed.
- All four Back controls navigated to dashboard; zero heading overlap, duplicate floating controls, horizontal overflow or page exceptions.
- Shared global fallback now occupies document flow instead of overlaying content. Eight sibling addresses visited on phone and desktop; zero exceptions/overflow. Loading-state fallback observed with static positioning, not a populated-screen proof.
- Plan gate regression: 5 tests PASS. Preview build OK. No access, purchase or engine rule changes.
- Kept TEST Coach plan active. No test content/consents/connections created; no billing changes, publish, backend deployment, migrations, cron or iOS changes.

Evidence: screenshots plus `results.json` and `siblings.json`. Frontend changes are preview-only.
Next: populated team-report phone proof, then B–F. Measurement timing and physical-device video certification remain open.