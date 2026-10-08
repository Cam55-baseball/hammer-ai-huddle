/** Footer links to every legal_v2 page. Renders nothing while legal_v2 is OFF for this person. */
import { Link } from "react-router-dom";
import { PUBLIC_LEGAL_DOCS, useLegalV2 } from "@/lib/legal/legalV2";

export function LegalFooterLinks({ className }: { className?: string }) {
  const { on } = useLegalV2();
  if (!on) return null;
  return (
    <nav aria-label="Legal" className={`flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground ${className ?? ""}`}>
      {PUBLIC_LEGAL_DOCS.map((d) => (
        <Link key={d.slug} to={`/legal/${d.slug}`} className="inline-flex min-h-[44px] items-center underline underline-offset-4 hover:text-foreground">
          {d.title}
        </Link>
      ))}
    </nav>
  );
}
