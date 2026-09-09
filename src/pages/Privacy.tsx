import { Link } from "react-router-dom";
import { LegalPageLayout, LegalSection } from "@/components/legal/LegalPageLayout";

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are and how to reach us",
    body: (
      <>
        <p>
          This app is run by <strong>Hammers Modality LLC</strong>. Our address is{" "}
          <strong>[BUSINESS ADDRESS]</strong>.
        </p>
        <p>
          For questions about privacy, or for general help, email{" "}
          <a href="mailto:hammersmodality@gmail.com">hammersmodality@gmail.com</a>.
        </p>
        <p>This policy takes effect on <strong>June 28, 2025</strong>.</p>
      </>

    ),
  },
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <>
        <ul>
          <li><strong>Account details.</strong> Your name, email, sport, position, and age or birth year.</li>
          <li><strong>Profile and training inputs.</strong> Anything you type in, like goals, notes, and workout logs.</li>
          <li><strong>Video.</strong> Video you record in the app or upload from your device.</li>
          <li>
            <strong>Measurements and body-position data.</strong> Numbers our system works out from
            your video, like joint angles, timing, and bat or arm speed estimates.
          </li>
          <li><strong>Wellness and daily check-ins.</strong> Sleep, soreness, mood, and similar answers you give.</li>
          <li><strong>Usage data.</strong> Which pages you open, what you tap, and basic device info.</li>
          <li><strong>Payment status.</strong> Whether your subscription is active. We never see your card number.</li>
        </ul>
        <p>
          To be clear: <strong>your video is uploaded to our servers and processed there.</strong> It
          does not stay only on your phone.
        </p>
      </>
    ),
  },
  {
    id: "body-position-data",
    title: "Body-position and measurement data",
    body: (
      <>
        <p>
          We look at your video to estimate where your body is and how it moves. We use those
          estimates to give you grades and coaching feedback.
        </p>
        <p>Here is what we do <strong>not</strong> do with it:</p>
        <ul>
          <li>We do not use it to recognise who you are (no face or identity recognition).</li>
          <li>We do not sell it.</li>
          <li>We do not share it with advertisers.</li>
        </ul>
      </>
    ),
  },
  {
    id: "why-we-collect",
    title: "Why we collect each thing",
    body: (
      <ul>
        <li><strong>Account details</strong> — to create your account and show the right sport and drills.</li>
        <li><strong>Profile and training inputs</strong> — to build your plan and track your progress.</li>
        <li><strong>Video</strong> — to run your analysis and let you look back at old reps.</li>
        <li><strong>Measurements</strong> — to produce grades, feedback, and training suggestions.</li>
        <li><strong>Wellness check-ins</strong> — to adjust your workload so you train safely.</li>
        <li><strong>Usage data</strong> — to fix bugs and make the app work better.</li>
        <li><strong>Payment status</strong> — to know which features your account can use.</li>
      </ul>
    ),
  },
  {
    id: "who-we-share-with",
    title: "Who we share it with",
    body: (
      <>
        <p>We use a small number of companies to run the app:</p>
        <ul>
          <li><strong>Hosting and database provider</strong> — stores your account, your data, and your files.</li>
          <li><strong>Payment processor</strong> — handles subscriptions and card payments.</li>
          <li><strong>Video-processing and AI analysis providers</strong> — help turn your video into measurements and feedback.</li>
          <li><strong>Video-rendering provider</strong> — creates the marked-up clips you watch.</li>
        </ul>
        <p>
          These companies may only use your data to do that job for us. <strong>We do not sell
          personal information.</strong>
        </p>
      </>
    ),
  },
  {
    id: "coaches-scouts-parents",
    title: "Coaches, scouts, and parents",
    body: (
      <>
        <p>Other people only see your data if you are linked to them.</p>
        <ul>
          <li><strong>A linked coach</strong> can see your analyses, grades, training plan, and progress.</li>
          <li>
            <strong>A linked scout</strong> can see only what you have chosen to share for
            recruiting, such as approved videos and measurements.
          </li>
          <li>
            <strong>A linked parent or guardian</strong> can see your account details, analyses,
            grades, and training history.
          </li>
        </ul>
        <p>
          You control these links. You can add or remove a link at any time in your relationship
          settings, and access stops when the link is removed.
        </p>
      </>
    ),
  },
  {
    id: "young-users",
    title: "Users under 18, and users under 13",
    body: (
      <>
        <p>
          You must be <strong>18 or older</strong> to hold an account on your own. Anyone under 18
          must have a parent or guardian set up the account, give permission, and agree to this
          policy first.
        </p>
        <p>
          For users under 13, we ask for verifiable parent or guardian consent before the account
          can be used, and we collect only what the app needs to work.
        </p>
        <p>
          A parent or guardian who is linked to the account can see the athlete's data, ask us to
          correct it, and ask us to delete it. To request deletion, email{" "}
          <a href="mailto:hammersmodality@gmail.com">hammersmodality@gmail.com</a> from the address
          on file, or use the delete button on the <Link to="/profile">profile page</Link>.
        </p>

      </>
    ),
  },
  {
    id: "how-long",
    title: "How long we keep data",
    body: (
      <>
        <p>
          We keep your data while your account is open, so your history and progress stay
          available.
        </p>
        <p>
          When you delete your account, we delete your profile, videos, analyses, grades, and
          training history. Some records we must keep for a while, like basic payment records for
          tax and accounting. Backups clear on their normal schedule.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p>You can ask us to:</p>
        <ul>
          <li>show you the data we hold about you,</li>
          <li>fix anything that is wrong,</li>
          <li>delete your account and data,</li>
          <li>send you a copy of your data.</li>
        </ul>
        <p>
          The fastest way to delete everything is the <strong>Delete my account</strong> button at
          the bottom of your <Link to="/profile">profile page</Link>.{" "}
          <strong>Deletion is permanent and cannot be undone.</strong> For anything else, email{" "}
          <a href="mailto:hammersmodality@gmail.com">hammersmodality@gmail.com</a>.
        </p>

      </>
    ),
  },
  {
    id: "security",
    title: "How we protect your data",
    body: (
      <>
        <p>
          We use encryption in transit, access rules so people only reach their own data, and
          limited staff access to production systems.
        </p>
        <p>
          No app or company can promise perfect security, and we will not pretend otherwise. If we
          learn of a breach that affects you, we will tell you.
        </p>
      </>
    ),
  },
  {
    id: "state-rights",
    title: "California and other US state privacy rights",
    body: (
      <>
        <p>
          If you live in California, Colorado, Connecticut, Virginia, or another state with a
          privacy law, you can ask to see, correct, delete, or get a copy of your personal
          information, and you cannot be treated worse for asking.
        </p>
        <p>
          We do not sell personal information and we do not share it for cross-context behavioural
          advertising. To make a request, email{" "}
          <a href="mailto:hammersmodality@gmail.com">hammersmodality@gmail.com</a>.
        </p>

      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        If we change this policy, we will update the date at the top. If the change is important,
        we will also tell you in the app or by email before it takes effect.
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="June 28, 2025"
      intro={
        <p>
          This page explains what we collect, why we collect it, and what you can do about it. We
          have written it in plain English because many of our users are young athletes.
        </p>
      }
      sections={sections}
    />
  );
}
