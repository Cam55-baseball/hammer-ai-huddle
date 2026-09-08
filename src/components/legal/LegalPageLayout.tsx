import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

interface LegalPageLayoutProps {
  title: string;
  intro?: ReactNode;
  lastUpdated: string;
  sections: LegalSection[];
  showTableOfContents?: boolean;
}

export function LegalPageFooterLinks() {
  return (
    <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
      <Link to="/privacy" className="hover:text-foreground underline underline-offset-4">
        Privacy Policy
      </Link>
      <Link to="/terms" className="hover:text-foreground underline underline-offset-4">
        Terms of Service
      </Link>
      <Link to="/support" className="hover:text-foreground underline underline-offset-4">
        Support
      </Link>
    </div>
  );
}

export function LegalPageLayout({
  title,
  intro,
  lastUpdated,
  sections,
  showTableOfContents = true,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          {intro ? <div className="text-base leading-relaxed text-muted-foreground">{intro}</div> : null}
        </header>

        {showTableOfContents && (
          <Card className="mt-8 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              What is on this page
            </h2>
            <ol className="mt-3 space-y-2 text-sm">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-primary hover:underline underline-offset-4"
                  >
                    {index + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </Card>
        )}

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <div className="space-y-3 text-base leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <Separator className="my-10" />
        <LegalPageFooterLinks />
      </main>
    </div>
  );
}
