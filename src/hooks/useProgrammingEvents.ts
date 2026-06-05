import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./useProfile";

// Programming calendar (5.4): exhibitions / fairs / shipments / residencies
// scheduled by space (location) and date. Backed by the `programming_events`
// table documented for Lovable (ADDITIONS.md §6.9). Not in the generated
// types yet → loose builder, empty-safe when the table is absent.
export type ProgrammingEvent = {
  id: string;
  gallery_id: string;
  title: string;
  location_id: string | null;
  start_date: string;
  end_date: string | null;
  kind: string | null;
  tags: string[] | null;
  location?: { id: string; name: string } | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rel(name: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.from as unknown as (r: string) => any)(name);
}

export function useProgrammingEvents() {
  const { profile } = useProfile();
  return useQuery<ProgrammingEvent[]>({
    queryKey: ["programming_events", profile?.gallery_id ?? null],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await rel("programming_events")
        .select("*, location:locations ( id, name )")
        .order("start_date", { ascending: true });
      if (error) return [];
      return (data ?? []) as ProgrammingEvent[];
    },
  });
}

export function useCreateProgrammingEvent() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<
    void,
    Error,
    {
      title: string;
      location_id: string | null;
      start_date: string;
      end_date: string | null;
      kind: string | null;
      tags: string[];
    }
  >({
    mutationFn: async (input) => {
      if (!profile) throw new Error("No profile");
      const { error } = await rel("programming_events").insert({
        gallery_id: profile.gallery_id,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programming_events"] }),
  });
}

export function useDeleteProgrammingEvent() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await rel("programming_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programming_events"] }),
  });
}
