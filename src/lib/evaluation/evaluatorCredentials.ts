/**
 * One formatter for evaluator credentials so every surface that shows a filed
 * report renders the same line: Name — Title, Organization (Role).
 *
 * Title and organization come from the evaluator's own profile
 * (`profiles.evaluator_title` / `profiles.evaluator_organization`), falling back
 * to their linked organization. Role is derived from user_roles.
 */
export interface EvaluatorCredentialParts {
  evaluator_name?: string | null;
  evaluator_role?: string | null;
  evaluator_title?: string | null;
  evaluator_organization?: string | null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Area Scout · Texas Rangers · Scout" — no name. Empty string when unknown. */
export function formatCredentials(e: EvaluatorCredentialParts): string {
  const title = e.evaluator_title?.trim();
  const org = e.evaluator_organization?.trim();
  const role = e.evaluator_role?.trim();
  const parts: string[] = [];
  if (title) parts.push(title);
  if (org) parts.push(org);
  // Only add the bare role when no job title was given — otherwise it's noise.
  if (role && !title) parts.push(cap(role));
  return parts.join(' · ');
}

/** "Jane Doe — Area Scout · Texas Rangers" */
export function formatAttribution(e: EvaluatorCredentialParts): string {
  const name = e.evaluator_name?.trim() || 'Unnamed evaluator';
  const creds = formatCredentials(e);
  return creds ? `${name} — ${creds}` : name;
}
