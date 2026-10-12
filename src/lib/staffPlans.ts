// Plan 4 D — Coach and Organization plan copy, shared by every pricing and plan screen.
export const STAFF_PLAN_COPY = {
  coach: {
    name: "Hammers Coach",
    price: "$300/month",
    includes: [
      "Unlimited analyses for baseball and softball (fair use: about 30 per hour)",
      "Tex Vision, Delaycam, pitch tipping, Royal timing, Baserunning IQ, Pick-off Trainer",
      "Calendar with messages to chosen teams or players; testing and testing days",
      "On-the-spot initial assessment; Coach Dashboard; Development and Discipline views",
      "Send workouts; weekly coach summary; guest mode for players without an account",
    ],
  },
  organization: {
    name: "Hammers Organization",
    price: "$1,000/month · 5 coach seats included · extra seat $150/month",
    includes: [
      "Everything in Hammers Coach, for every coach seat",
      "Facility dashboard, comparisons, growth-vs-game trends, teams",
      "Staff seats (5 included, extras billed) and org-wide summaries",
    ],
  },
} as const;
