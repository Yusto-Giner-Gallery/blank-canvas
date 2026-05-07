import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Json } from "@/integrations/supabase/types";
import { snapshotFeedback } from "@/lib/feedback-buffer";
import { useProfile } from "./useProfile";

type FeedbackKind = "bug" | "feature";

type SubmitArgs = {
  kind: FeedbackKind;
  description: string;
  page_path: string;
};

export function useSubmitFeedback() {
  const { profile } = useProfile();

  return useMutation<{ ok: true }, Error, SubmitArgs>({
    mutationFn: async ({ kind, description, page_path }) => {
      if (!profile) throw new Error("Not signed in");
      const snap = kind === "bug" ? snapshotFeedback() : null;
      const { error } = await supabase.from("feedback_reports").insert({
        gallery_id: profile.gallery_id,
        profile_id: profile.id,
        kind,
        description: description.trim(),
        page_path,
        user_agent: navigator.userAgent,
        // safeSerialise in feedback-buffer guarantees JSON-shape output;
        // cast to Json so the supabase Insert type accepts the buffers.
        console_logs: (snap?.logs ?? null) as unknown as Json,
        action_history: (snap?.actions ?? null) as unknown as Json,
      });
      if (error) throw error;
      return { ok: true };
    },
  });
}
