import { Link } from "react-router-dom";

/** Obvious sign-up doors for staff, shown on the landing page and sign-in screen. */
export function RoleEntryLinks({ className = "" }: { className?: string }) {
  const links = [
    { to: "/signup/coach", label: "Coaches" },
    { to: "/signup/scout", label: "Scouts & Recruiters" },
    { to: "/signup/organization", label: "Organizations" },
  ];
  return (
    <nav aria-label="Sign up as staff" className={`flex flex-wrap justify-center gap-2 ${className}`}>
      {links.map((l) => (
        <Link key={l.to} to={l.to}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
