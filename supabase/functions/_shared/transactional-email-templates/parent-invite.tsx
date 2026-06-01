/**
 * Phase D §1 — Parent invite email template.
 *
 * React Email component (calm voice, white body, single CTA). Used by
 * `send-transactional-email` when Lovable Emails is enabled. The agent
 * scaffolds Lovable Emails separately; this file is referenced by
 * registry.ts when present.
 */
import * as React from "npm:react@18.3.1";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "npm:@react-email/components@0.0.22";

interface ParentInviteProps {
  athleteName?: string;
  inviteUrl?: string;
}

const ParentInviteEmail = ({
  athleteName = "An athlete",
  inviteUrl = "#",
}: ParentInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{athleteName} invited you to support their training</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{athleteName}</Heading>
        <Text style={lead}>
          You've been invited to support their training journey.
        </Text>

        <Hr style={hr} />

        <Text style={section}>What you can see</Text>
        <Text style={item}>Scope-appropriate signal — not raw data.</Text>

        <Text style={section}>What stays private</Text>
        <Text style={item}>
          Recruiter outreach and pressure stay behind protections.
        </Text>

        <Text style={section}>How to remove access</Text>
        <Text style={item}>
          Either side can remove this link at any time, in one tap.
        </Text>

        <Hr style={hr} />

        <Button style={button} href={inviteUrl}>
          Review invitation
        </Button>

        <Text style={footer}>
          This invitation can be removed by either side at any time.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: ParentInviteEmail,
  subject: (data: Record<string, unknown>) =>
    `${(data?.athleteName as string) ?? "An athlete"} invited you`,
  displayName: "Parent invite",
  previewData: {
    athleteName: "Jordan",
    inviteUrl: "https://example.com/accept-parent-invite?token=demo",
  },
};

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};
const container = { padding: "32px 28px", maxWidth: "520px", margin: "0 auto" };
const h1 = { fontSize: "22px", fontWeight: 600, color: "#0a0a0a", margin: "0 0 6px" };
const lead = { fontSize: "15px", color: "#4a4a4a", margin: "0 0 20px", lineHeight: "1.5" };
const section = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#6b6b6b",
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  margin: "16px 0 4px",
};
const item = { fontSize: "14px", color: "#2a2a2a", margin: "0 0 8px", lineHeight: "1.5" };
const hr = { borderColor: "#ececec", margin: "20px 0" };
const button = {
  backgroundColor: "#0a0a0a",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 500,
  padding: "12px 20px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block",
  marginTop: "8px",
};
const footer = {
  fontSize: "12px",
  color: "#8a8a8a",
  margin: "24px 0 0",
  lineHeight: "1.5",
};
