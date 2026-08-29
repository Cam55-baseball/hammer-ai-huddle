/**
 * Recruiter contact card (pre-release, staff-gated recruiting surface).
 *
 * Optional by design — never required to create a standard — but surfaced hard,
 * because the whole point of a match ping is a real conversation happening. When
 * present, these details ride along in the athlete's notification email.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface RecruiterContact {
  user_id: string;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export function useRecruiterContact() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const contact = useQuery({
    queryKey: ["recruiter-contact", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<RecruiterContact | null> => {
      const { data, error } = await (supabase as any)
        .from("recruiter_contacts")
        .select("user_id, contact_name, contact_title, contact_email, contact_phone")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as RecruiterContact | null;
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<Omit<RecruiterContact, "user_id">>) => {
      const { error } = await (supabase as any)
        .from("recruiter_contacts")
        .upsert({ user_id: user!.id, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recruiter-contact"] }),
  });

  const hasContact = !!(contact.data?.contact_email || contact.data?.contact_phone);

  return { contact, save, hasContact };
}
