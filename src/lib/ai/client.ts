// Single AI client module (CLAUDE.md §2 + §4b). Every AI feature in the
// app imports from here. Provider is switched via VITE_AI_PROVIDER:
//   - "lovable" → calls the `ai-generate` edge function (Lovable AI)
//   - "stub"    → deterministic placeholder text (offline / dev fallback)

import { supabase } from "@/lib/supabase";
import type { ArtworkListItem } from "@/integrations/supabase/domain";

export type CleanupRow = {
  id: string;
  filename: string;
  current: {
    title: string | null;
    artist_name: string | null;
    medium: string | null;
    width_cm: number | null;
    height_cm: number | null;
    depth_cm: number | null;
    year: number | null;
    price_eur: number | null;
  };
};

export type CleanedRow = {
  id: string;
  title: string | null;
  artist_name: string | null;
  medium: string | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  year: number | null;
  price_eur: number | null;
};

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
    }
  | {
      kind: "cleanup_filenames";
      rows: CleanupRow[];
      known_artists: string[];
    };

const PROVIDER = (import.meta.env.VITE_AI_PROVIDER ?? "lovable") as
  | "stub"
  | "lovable";

function stubResponse(req: AIRequest): string {
  switch (req.kind) {
    case "cleanup_filenames": {
      // Stub: echo current values unchanged so the UI flow still works
      // when the AI provider is offline.
      return JSON.stringify({
        rows: req.rows.map((r) => ({ id: r.id, ...r.current })),
      });
    }
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

// Strip optional ```json fences and parse. Models occasionally wrap JSON
// despite being told not to.
function parseJsonResponse(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(cleaned);
}

export async function cleanupFilenames(
  rows: CleanupRow[],
  knownArtists: string[],
): Promise<CleanedRow[]> {
  if (rows.length === 0) return [];
  const text = await generateText({
    kind: "cleanup_filenames",
    rows,
    known_artists: knownArtists,
  });
  const parsed = parseJsonResponse(text) as { rows?: CleanedRow[] };
  if (!parsed?.rows || !Array.isArray(parsed.rows)) {
    throw new Error("AI cleanup returned an unexpected shape");
  }
  return parsed.rows;
}

