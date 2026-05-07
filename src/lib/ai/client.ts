// Single AI client module (CLAUDE.md §2 + §4b). Every AI feature in the
// app imports from here. Provider is switched via VITE_AI_PROVIDER:
//   - "lovable" → calls the `ai-generate` edge function (Lovable AI)
//   - "stub"    → deterministic placeholder text (offline / dev fallback)

import { supabase } from "@/lib/supabase";
import type { ArtworkListItem } from "@/integrations/supabase/domain";

export type AIRequest =
  | {
      kind: "exhibition_blurb";
      dossier_kind: string;
      title: string;
      artworks: ArtworkListItem[];
    }
  | {
      kind: "artwork_description";
      artwork: ArtworkListItem;
    }
  | {
      kind: "collector_pitch";
      artwork: ArtworkListItem;
      contact_name?: string;
    };

const PROVIDER = (import.meta.env.VITE_AI_PROVIDER ?? "lovable") as
  | "stub"
  | "lovable";

function stubResponse(req: AIRequest): string {
  switch (req.kind) {
    case "exhibition_blurb": {
      const artistNames = Array.from(
        new Set(req.artworks.map((a) => a.artist?.name).filter(Boolean)),
      );
      const artistList =
        artistNames.length === 0
          ? "the artists in this selection"
          : artistNames.slice(0, 4).join(", ") +
            (artistNames.length > 4 ? ", and others" : "");
      return [
        `[stub blurb — ${req.dossier_kind}] "${req.title}"`,
        ``,
        `This dossier brings together ${req.artworks.length} works by ${artistList}.`,
        `Replace this text with a real exhibition statement, or click "Generate with AI" once a provider is wired up in src/lib/ai/client.ts.`,
      ].join("\n");
    }
    case "artwork_description": {
      const a = req.artwork;
      const size = [a.width_cm, a.height_cm, a.depth_cm]
        .filter((n): n is number => typeof n === "number")
        .join(" × ");
      return `[stub description] ${a.title} by ${a.artist?.name ?? "the artist"}${
        size ? `, ${size} cm` : ""
      }${a.year ? `, ${a.year}` : ""}.`;
    }
    case "collector_pitch": {
      const lead = req.contact_name ? `Dear ${req.contact_name},` : `Hello,`;
      return [
        `[stub pitch]`,
        ``,
        lead,
        ``,
        `I thought of you when looking at "${req.artwork.title}" by ${req.artwork.artist?.name ?? "the artist"}. Replace this body with a personalised note.`,
      ].join("\n");
    }
  }
}

export async function generateText(req: AIRequest): Promise<string> {
  if (PROVIDER === "stub") return stubResponse(req);

  const { data, error } = await supabase.functions.invoke<{
    text?: string;
    error?: string;
  }>("ai-generate", { body: req });

  if (error) {
    // Surface a useful message; the caller decides how to display it.
    throw new Error(error.message || "AI request failed");
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.text) throw new Error("AI returned an empty response");
  return data.text;
}

