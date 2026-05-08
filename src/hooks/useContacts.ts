import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Contact, ContactActivity } from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

export type ContactWithTags = Contact & { tag_ids: string[] };

type ContactRow = Contact & {
  contact_tags: Array<{ tag_id: string }> | null;
};

export function useContacts() {
  const { profile } = useProfile();
  return useQuery<ContactWithTags[]>({
    queryKey: ["contacts", profile?.gallery_id ?? null],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, contact_tags ( tag_id )")
        .is("deleted_at", null)
        .order("full_name")
        .returns<ContactRow[]>();
      if (error) throw error;
      return (data ?? []).map((c) => ({
        ...c,
        tag_ids: (c.contact_tags ?? []).map((t) => t.tag_id),
      }));
    },
  });
}

export function useContact(id: string | undefined) {
  const { profile } = useProfile();
  return useQuery<ContactWithTags | null>({
    queryKey: ["contact", id ?? null],
    enabled: !!profile && !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("contacts")
        .select("*, contact_tags ( tag_id )")
        .eq("id", id)
        .maybeSingle<ContactRow>();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        tag_ids: (data.contact_tags ?? []).map((t) => t.tag_id),
      };
    },
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<
    Contact,
    Error,
    {
      email: string;
      full_name: string;
      interest?: string | null;
      newsletter_opt_in?: boolean;
      phone?: string | null;
      company?: string | null;
      role?: string | null;
      website?: string | null;
      notes?: string | null;
    }
  >({
    mutationFn: async ({
      email,
      full_name,
      interest = null,
      newsletter_opt_in = false,
      phone = null,
      company = null,
      role = null,
      website = null,
      notes = null,
    }) => {
      if (!profile) throw new Error("No profile");
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          id: crypto.randomUUID(),
          gallery_id: profile.gallery_id,
          email,
          full_name,
          interest,
          notes,
          newsletter_opt_in,
          // The schema migration adding these columns is pending Lovable
          // type regen; the cast keeps the build green until then.
          ...(phone || company || role || website
            ? ({ phone, company, role, website } as Record<string, unknown>)
            : {}),
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { id: string; patch: Partial<Pick<Contact, "full_name" | "email" | "interest" | "notes" | "newsletter_opt_in">> }
  >({
    mutationFn: async ({ id, patch }) => {
      const { error } = await supabase.from("contacts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["contact", vars.id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useContactActivity(contact_id: string | undefined) {
  return useQuery<ContactActivity[]>({
    queryKey: ["contact_activity", contact_id ?? null],
    enabled: !!contact_id,
    queryFn: async () => {
      if (!contact_id) return [];
      const { data, error } = await supabase
        .from("contact_activity")
        .select("*")
        .eq("contact_id", contact_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
