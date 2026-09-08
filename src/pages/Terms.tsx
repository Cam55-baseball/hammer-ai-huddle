import { Link } from "react-router-dom";
import { LegalPageLayout, LegalSection } from "@/components/legal/LegalPageLayout";

const sections: LegalSection[] = [
  {
    id: "accepting",
    title: "Accepting these terms",
    body: (
      <>
        <p>
          These terms are an agreement between you and <strong>[LEGAL ENTITY NAME]</strong>,{" "}
          <strong>[BUSINESS ADDRESS]</strong>. By using the app, you agree to them. They take effect
          on <strong>[EFFECTIVE DATE]</strong>.
        </p>
        <p>
          You must be at least <strong>[MINIMUM AGE]</strong> to hold an account on your own. If you
          are younger, a parent or guardian must set up the account, agree to these terms, and stay
          responsible for how it is used.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <ul>
        <li>Give us true information, and keep it up to date.</li>
        <li>Keep your password safe. Anything done with your login counts as done by you.</li>
        <li>One account per person. Do not share a login with a teammate.</li>
        <li>Tell us at <strong>[SUPPORT EMAIL]</strong> if you think someone else got into your account.</li>
      </ul>
    ),
  },
  {
    id: "billing",
    title: "Subscriptions and billing",
    body: (
      <>
        <p>
          Paid features run on a subscription. Payments are handled by our payment processor, not by
          us, so we never see your card number.
        </p>
        <ul>
          <li>You are billed at the start of each billing cycle (monthly or yearly, whichever you picked).</li>
          <li>Subscriptions renew automatically until you cancel.</li>
          <li>You can cancel any time from your profile or billing screen. You keep access until the end of the period you already paid for.</li>
          <li>
            We do not give refunds for time already paid for, unless the law where you live says we
            must. If something went wrong, email <strong>[SUPPORT EMAIL]</strong> and we will look at
            it.
          </li>
        </ul>
        <p>
          <strong>If you subscribed inside a mobile app store</strong> (for example Apple's App
          Store or Google Play), that store handles the billing. Their billing, cancellation, and
          refund rules apply instead of ours, and you cancel through your store account.
        </p>
      </>
    ),
  },
  {
    id: "rules",
    title: "What you can and cannot do",
    body: (
      <>
        <p>Please do not:</p>
        <ul>
          <li>upload video of other people without their permission (and a parent's permission if they are a minor),</li>
          <li>post abusive, hateful, sexual, or unlawful content,</li>
          <li>scrape, copy, or bulk-download the app or its data,</li>
          <li>resell or rent access to the app,</li>
          <li>share your account with anyone else,</li>
          <li>try to break, overload, or reverse engineer the app.</li>
        </ul>
      </>
    ),
  },
  {
    id: "your-content",
    title: "Your content stays yours",
    body: (
      <>
        <p>
          You own your video and your data. <strong>We do not claim ownership of it.</strong>
        </p>
        <p>
          You give us permission to store it, process it, and create your analysis, grades, and
          clips. That permission exists only so the app can do its job for you, and it ends when you
          delete the content or your account.
        </p>
      </>
    ),
  },
  {
    id: "safety",
    title: "Important safety notice",
    body: (
      <>
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-foreground">
          <strong>Read this part carefully.</strong> This app gives training, drill, and
          conditioning guidance. <strong>It is not medical advice.</strong> Talk to a doctor before
          you start any training program. <strong>If something hurts, stop</strong> and get medical
          help.
        </p>
        <p>
          Grades, measurements, and projections are estimates made for training. They are not
          guaranteed to be accurate, and they are <strong>not a promise</strong> about recruiting,
          scholarships, or a professional career.
        </p>
      </>
    ),
  },
  {
    id: "our-ip",
    title: "Our intellectual property",
    body: (
      <p>
        The app, the grading system, the drill library, the written content, and the design belong
        to us. You may use them inside the app for your own training. You may not copy, sell, or
        rebuild them somewhere else.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Ending your account",
    body: (
      <>
        <p>
          You can stop at any time. Use the <strong>Delete my account</strong> button at the bottom
          of your <Link to="/profile">profile page</Link>. That deletion is permanent.
        </p>
        <p>
          We can suspend or close an account that breaks these terms, harms other users, or is used
          for fraud. Where we reasonably can, we will tell you why first. If we close your account,
          your data is deleted the same way as a normal deletion, except for records we must keep by
          law.
        </p>
      </>
    ),
  },
  {
    id: "disclaimer",
    title: "Warranty disclaimer and limits on liability",
    body: (
      <>
        <p>
          The app is provided "as is". We do not promise it will always be available, error-free, or
          accurate for your situation.
        </p>
        <p>
          To the fullest extent the law allows, we are not liable for indirect or consequential
          losses, and our total liability to you is limited to the amount you paid us in the twelve
          months before the claim. Nothing here removes rights the law says you cannot give up.
        </p>
      </>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of the State of Florida, USA, and disputes belong in
        the courts located in Florida.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        If we change these terms, we will update the date at the top. If the change matters, we will
        tell you in the app or by email before it takes effect. Using the app after that means you
        accept the new terms.
      </p>
    ),
  },
];

export default function Terms() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated="[EFFECTIVE DATE]"
      intro={<p>These are the rules for using the app, written in plain English.</p>}
      sections={sections}
    />
  );
}
