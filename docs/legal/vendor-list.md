# Vendor (Service Provider) List — DRAFT for attorney review

| Vendor | What it does | Data it receives | Health data? | Minors' data? |
|---|---|---|---|---|
| Lovable Cloud (Supabase) | Hosting, database, sign-in, file storage, backend functions | All app data | Yes | Yes |
| Google (Gemini AI, via Lovable AI gateway) | Plans, coaching text, help chat, video analysis | Training context, questions, video frames | Yes (readiness, pain, etc. in prompts) | Yes |
| OpenAI | Backup AI when Gemini is unavailable | Same as above | Yes | Yes |
| Stripe | Payments, subscriptions | Name, email, payment, plan | No | Parent pays |
| Apple | iPhone app, in-app purchases | Apple account, purchase | No | Yes (app users) |
| Resend | Email delivery | Email address, email contents | Only if an email includes it | Parent emails |
| Roboflow | Body-movement / object detection in videos | Video frames | Body-movement measurements | Yes |
| Weather service | Heat/weather safety | Approximate location (city/coords) | No | — |
| PitchLab | NOT connected today. Would receive data only after a separate "yes" | — | — | — |

[LAWYER: confirm each vendor's processor terms, whether AI vendors train on data (we use API terms that say no), and whether Roboflow keeps frames.]
