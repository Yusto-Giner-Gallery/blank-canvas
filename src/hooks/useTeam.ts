import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

export function useTeam() {
  const { profile, isAdmin } = useProfile();
  return useQuery<Profile[]>({
    queryKey: ["team", profile?.gallery_id ?? null],
    enabled: !!profile && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation<
    { ok: true; user_id: string },
    Error,
    { email: string; full_name?: string }
  >({
    mutationFn: async ({ email, full_name }) => {
      const { data, error } = await supabase.functions.invoke<{
        ok: true;
        user_id: string;
      }>("invite-staff", { body: { email, full_name } });
      if (error) throw error;
      if (!data?.ok) throw new Error("Invite failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

export function useSetMemberRole() {
  const qc = useQueryClient();
  return useMutation<
    { ok: true },
    Error,
    { user_id: string; role: "admin" | "staff" }
  >({
    mutationFn: async (vars) => {
      const { data, error } = await supabase.functions.invoke<{ ok: true }>(
        "manage-member",
        { body: { action: "set_role", ...vars } },
      );
      if (error) throw new Error(await extractError(error, "Update failed"));
      if (!data?.ok) throw new Error("Update failed");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, { user_id: string }>({
    mutationFn: async (vars) => {
      const { data, error } = await supabase.functions.invoke<{ ok: true }>(
        "manage-member",
        { body: { action: "remove", ...vars } },
      );
      if (error) throw new Error(await extractError(error, "Remove failed"));
      if (!data?.ok) throw new Error("Remove failed");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}

async function extractError(error: unknown, fallback: string): Promise<string> {
  // FunctionsHttpError exposes .context.response with the JSON body.
  const ctx = (error as { context?: { response?: Response } })?.context;
  if (ctx?.response) {
    try {
      const body = await ctx.response.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      /* ignore */
    }
  }
  return error instanceof Error ? error.message : fallback;
}
