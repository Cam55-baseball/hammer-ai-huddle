import { useNavigate } from "react-router-dom";
import { User, Baby, ClipboardList, Search, Building2, ChevronRight } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";

const CHOICES = [
  { to: "/signup", icon: User, title: "Player (13+)", sub: "Train, track your progress and get your daily plan." },
  { to: "/signup/parent", icon: Baby, title: "Parent of a player under 13", sub: "Set up and sign for your child's account." },
  { to: "/signup/coach", icon: ClipboardList, title: "Coach", sub: "Coach your players. We review every coach before tools open." },
  { to: "/signup/scout", icon: Search, title: "Scout / Recruiter", sub: "Find and evaluate players. Reviewed before access." },
  { to: "/signup/organization", icon: Building2, title: "Organization", sub: "Facility, team, school or academy. Verified before players join." },
];

/** First sign-up screen: every kind of person picks their own path. */
export default function GetStarted() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 pt-safe pb-safe">
      <div className="mx-auto w-full max-w-lg space-y-5 py-4">
        <BackButton />
        <div>
          <h1 className="text-3xl font-bold">Who are you?</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick one so we set up the right account.</p>
        </div>
        <div className="space-y-3">
          {CHOICES.map(({ to, icon: Icon, title, sub }) => (
            <button key={to} type="button" onClick={() => navigate(to)}
              className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></span>
              <span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="block text-sm text-muted-foreground">{sub}</span></span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">Already have an account? <button className="text-primary underline" onClick={() => navigate("/auth")}>Sign in</button></p>
      </div>
    </div>
  );
}
