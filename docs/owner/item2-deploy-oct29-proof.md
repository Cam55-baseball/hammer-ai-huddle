# Oct 29 — Deploy + Item 2 (seven-day combined plans)

Applied (owner-named): 0154 analysis-drill stored issue binding; 0155 combined plan day (`wk_commit_composed_day`, service-role only). Deployed: `wk-generate-daily`, `plan-swap`. Live app compatibility: composed saving runs only when a request sends `compose_sport_day: true`; older clients keep the prior path.
Not applied: the philosophy TEST-isolation migration — it has not been written yet (needs the Item 20 reader design); nothing was invented.

Fixes found while proving:
- Declared weekly rest dates (Sunday / outside saved availability) built a full lifting session (push press, trap-bar work) and failed validation. Rest dates now take the recovery-only path and keep only explicit gentle identities (wk-generate-daily, redeployed under the same named authorization).
- The sign-up equipment step had no glove option, so no new player could ever get fielding work (defense floor unreachable). Added "Glove or mitt". Missing gear is still never assumed.

Proof (real builder, self JWT):
- Onboarding TEST (a283a732…): Oct 30–Nov 5 composed and certified: Defense 6, Hitting 6, Baserunning 6, Throwing 6, Conditioning 5, Sunday = breathing reset only; zero issues. Oct 29 correctly refused whole-day replacement (saved Add-to-Today work protected). Glove was added through the player's own equipment save call, not the screen.
- Owner --self Oct 29–Nov 4: all 7 composed, phase os_q1 every day, Sunday breathing reset only. Hitting 6, Baserunning 6, Throwing 6, Conditioning 6, Lifts 6. Defense 0/4 — owner has no saved glove/ball/field; defense card asks "Confirm my equipment" (binding, not bypassed).
- 8-week simulations: 7 files / 125 tests pass (six cohorts × both sports, six-day week, thin-plan, weekly volume, Oct 28 additions, availability, composed week).
