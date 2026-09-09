import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LegalPageFooterLinks } from "@/components/legal/LegalPageLayout";

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "How do I report someone, or block them?",
    a: (
      <>
        <p>
          Next to a video, a shared report, or someone's profile there is a small menu button. Open
          it and choose <strong>Report</strong>. Pick a reason, add anything else we should know, and
          send it. We review every report within 24 hours.
        </p>
        <p>
          The same menu has <strong>Block this user</strong>. Blocking removes any parent, coach, or
          scout link between you, hides you from each other, and stops either of you sending a new
          invite. You can undo it any time under Blocked users in relationship settings.
        </p>
      </>
    ),
  },
  {

    q: "How do I cancel my subscription?",
    a: (
      <>
        <p>
          Open your profile or billing screen and choose cancel. You keep access until the end of
          the period you already paid for.
        </p>
        <p>
          If you subscribed inside a mobile app store, cancel it in that store's subscription
          settings instead — that store handles the billing.
        </p>
      </>
    ),
  },
  {
    q: "How do I delete my account?",
    a: (
      <p>
        Go to your <Link to="/profile" className="text-primary underline underline-offset-4">profile page</Link>{" "}
        and scroll to the bottom. Use the <strong>Delete my account</strong> button. You will be
        asked to type DELETE to confirm. This is permanent and cannot be undone.
      </p>
    ),
  },
  {
    q: "My video will not upload. What do I do?",
    a: (
      <ul className="ml-5 list-disc space-y-1">
        <li>Check your internet connection and try Wi‑Fi if you are on mobile data.</li>
        <li>Keep the app open while it uploads.</li>
        <li>Try a shorter clip. Very long videos take much longer.</li>
        <li>Close and reopen the app, then try once more.</li>
        <li>Still stuck? Email <a href="mailto:hammersmodality@gmail.com" className="text-primary underline underline-offset-4">hammersmodality@gmail.com</a> and tell us the date, the module, and your phone type.</li>
      </ul>
    ),
  },
  {
    q: "My analysis looks wrong. What now?",
    a: (
      <>
        <p>
          Most bad results come from the camera angle, poor lighting, or part of the body being cut
          off. Film again from the angle the module asks for, with your whole body in frame.
        </p>
        <p>
          If it still looks wrong, email{" "}
          <a href="mailto:hammersmodality@gmail.com" className="text-primary underline underline-offset-4">hammersmodality@gmail.com</a>{" "}
          with the analysis date and what looks off, and a human will check it. Grades and
          measurements are estimates for training, not exact numbers.
        </p>

      </>
    ),
  },
  {
    q: "How do I link or unlink a parent or coach?",
    a: (
      <p>
        Open your relationship settings in the app. From there you can send an invite, accept one,
        or remove a link. When a link is removed, that person immediately loses access to your data.
      </p>
    ),
  },
  {
    q: "How do I reset my password?",
    a: (
      <p>
        On the <Link to="/auth" className="text-primary underline underline-offset-4">sign-in page</Link>,
        choose the forgot-password option and enter your email. We send you a reset link. If it does
        not arrive, check spam, then email{" "}
        <a href="mailto:hammersmodality@gmail.com" className="text-primary underline underline-offset-4">hammersmodality@gmail.com</a>.
      </p>
    ),
  },

];

export default function Support() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold">Support</h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Need a hand? Start here. Most questions are answered below, and a real person reads
            every email.
          </p>
        </header>

        <Card className="mt-8 space-y-2 p-5">
          <h2 className="text-lg font-semibold">Get help</h2>
          <p className="text-muted-foreground">
            Email{" "}
            <a href="mailto:hammersmodality@gmail.com" className="font-semibold text-primary underline underline-offset-4">hammersmodality@gmail.com</a>{" "}
            for anything, including privacy questions. We usually reply within{" "}
            <strong className="text-foreground">3 to 5 business days</strong>.
          </p>
          <p className="text-muted-foreground">
            Tell us your account email, what you were doing, and what happened. Screenshots help a
            lot.
          </p>
        </Card>


        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">Common questions</h2>
          <Accordion type="multiple" className="rounded-lg border">
            {faqs.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="px-4 text-left text-sm">{item.q}</AccordionTrigger>
                <AccordionContent className="space-y-2 px-4 pb-4 text-sm text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">Rules and privacy</h2>
          <p className="text-muted-foreground">
            Read the{" "}
            <Link to="/privacy" className="text-primary underline underline-offset-4">
              Privacy Policy
            </Link>{" "}
            to see what we collect and why, and the{" "}
            <Link to="/terms" className="text-primary underline underline-offset-4">
              Terms of Service
            </Link>{" "}
            for the rules of using the app.
          </p>
        </section>

        <section className="mt-10">
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            <h2 className="text-lg font-semibold">This app is not for emergencies</h2>
            <p className="mt-2 text-muted-foreground">
              Do not use support email for an emergency. If you are hurt or feel unwell, stop
              training and contact a doctor. In an emergency, call your local emergency number.
            </p>
          </div>
        </section>

        <Separator className="my-10" />
        <LegalPageFooterLinks />
      </main>
    </div>
  );
}
