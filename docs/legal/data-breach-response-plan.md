# Data Breach Response Plan — DRAFT for attorney review

Covers the FTC Health Breach Notification Rule (16 CFR Part 318, which applies to health apps like ours) and state breach laws (Florida §501.171 and others).

## 1. Detect and report (hour 0)
Anyone who suspects a breach emails hammersmodality@hammersmodality.org with subject "SECURITY". The owner opens an incident log (time, what, who found it).

## 2. Contain (first 24 hours)
Rotate affected keys (Stripe, Resend, AI, Roboflow, service role); disable affected accounts or functions; preserve logs; contact the affected vendor.

## 3. Assess (within 72 hours)
What data, whose (minors? health data? state of residence?), how many people, was it encrypted, was it actually acquired. Call the lawyer.

## 4. Notify
| Who | When | Rule |
|---|---|---|
| Affected people | Without unreasonable delay, no later than 60 days (FTC); no later than 30 days for Florida residents | FTC HBNR; Fla. §501.171 |
| FTC | 500+ people: at the same time as individuals (within 60 days); fewer: per current rule [LAWYER: confirm] | FTC HBNR |
| Media in a state | 500+ residents of one state | FTC HBNR |
| Florida Attorney General | 500+ Florida residents, within 30 days | Fla. §501.171 |
| Other state AGs | Per each state's law | [LAWYER: list] |
| Parents | For any child under 18 | Policy |
| Vendors/partners | As contracts require | — |

Notices are sent through Resend from noreply@hammersmodality.org and include: what happened, data involved, what we did, what they can do, contact.

## 5. After
Root-cause review within 30 days; update the WISP; keep the incident file 5 years.
