import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./useProfile";

// Teammate notifications (5.2): "@giulia please send this invoice" lands on
// Giulia's dashboard with a checkbox to mark done. Backed by the
// `notifications` table documented for the Lovable port (ADDITIONS.md §6.7).
// The table isn't in the generated types yet, so we reach it through a loose
// builder; a missing table degrades to an empty list rather than an error.
export type NotificationRow = {
  id: string;
  gallery_id: string;
  recipient_profile_id: string;
  sender_profile_id: string | null;
  body: string;
  link: string | null;
  done: boolean;
  created_at: string;
  sender: { id: string; full_name: string | null } | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rel(name: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.from as unknown as (r: string) => any)(name);
}

// Notifications addressed to the current user, newest first.
export function useMyNotifications() {
  const { profile } = useProfile();
  return useQuery<NotificationRow[]>({
    queryKey: ["notifications", profile?.id ?? null],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await rel("notifications")
        .select("*, sender:profiles!sender_profile_id ( id, full_name )")
        .eq("recipient_profile_id", profile!.id)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as NotificationRow[];
    },
  });
}

export function useCreateNotification() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<
    void,
    Error,
    { recipient_profile_id: string; body: string; link?: string | null }
  >({
    mutationFn: async ({ recipient_profile_id, body, link = null }) => {
      if (!profile) throw new Error("No profile");
      const { error } = await rel("notifications").insert({
        gallery_id: profile.gallery_id,
        recipient_profile_id,
        sender_profile_id: profile.id,
        body,
        link,
        done: false,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useSetNotificationDone() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; done: boolean }>({
    mutationFn: async ({ id, done }) => {
      const { error } = await rel("notifications").update({ done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
