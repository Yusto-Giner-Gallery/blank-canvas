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

export type EditorialArtistInput = {
  id: string;
  name: string;
  nationality: string | null;
  bio: string | null;
};

export type EditorialDossierResponse = {
  show_title?: string;
  intro?: string;
  artist_intros: Record<string, { bio_en?: string; bio_es?: string }>;
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
    }
  | {
      kind: "editorial_dossier";
      title: string;
      artists: EditorialArtistInput[];
      artwork_count: number;
    }
  | {
      kind: "text_review";
      context: string;
      text: string;
    }
  | {
      kind: "extract_business_card";
      image_data_url: string;
    };

export type ExtractedCard = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  website: string | null;
  address: string | null;
  notes: string | null;
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
    case "extract_business_card": {
      // Stub: empty result so the UI flow is testable without a vision
      // provider. The user can fill the form by hand.
      return JSON.stringify({
        full_name: null,
        email: null,
        phone: null,
        company: null,
        role: null,
        website: null,
        address: null,
        notes: null,
      } satisfies ExtractedCard);
    }
    case "text_review": {
      return [
        `[stub editorial feedback — ${req.context}]`,
        `- The opening sentence could lead with the most concrete claim about the work.`,
        `- Consider tightening any phrase using "very", "really", or "interesting" — they tend to dilute.`,
        `- Watch for repeated nouns within the same paragraph; vary or pronoun where possible.`,
        `- A single specific detail (a year, a location, a technique) usually anchors a blurb better than a general adjective.`,
      ].join("\n");
    }
    case "editorial_dossier": {
      const intros: Record<string, { bio_en?: string; bio_es?: string }> = {};
      for (const a of req.artists) {
        intros[a.id] = {
          bio_en: a.bio
            ? a.bio
            : `[stub EN bio] ${a.name}${a.nationality ? ` (${a.nationality})` : ""}.`,
          bio_es: `[stub ES bio] ${a.name}${a.nationality ? ` (${a.nationality})` : ""}.`,
        };
      }
      return JSON.stringify({
        show_title: req.title || "Untitled",
        intro: `[stub editorial intro] A presentation of ${req.artwork_count} works by ${req.artists
          .map((a) => a.name)
          .join(", ")}.`,
        artist_intros: intros,
      } satisfies EditorialDossierResponse);
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

export async function generateEditorialDossier(
  req: Extract<AIRequest, { kind: "editorial_dossier" }>,
): Promise<EditorialDossierResponse> {
  const text = await generateText(req);
  const parsed = parseJsonResponse(text) as EditorialDossierResponse;
  if (!parsed || typeof parsed !== "object" || !parsed.artist_intros) {
    throw new Error("AI editorial dossier returned an unexpected shape");
  }
  return parsed;
}

// Vision: extract structured contact fields from a business-card image.
// `image_data_url` should be a data URL ("data:image/jpeg;base64,…")
// — caller is responsible for resizing client-side before the call.
export async function extractBusinessCard(
  image_data_url: string,
): Promise<ExtractedCard> {
  if (!image_data_url.startsWith("data:image/")) {
    throw new Error("Expected a data:image/* URL");
  }
  const text = await generateText({
    kind: "extract_business_card",
    image_data_url,
  });
  const parsed = parseJsonResponse(text) as Partial<ExtractedCard>;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI extract returned an unexpected shape");
  }
  // Normalise: model may omit fields. Fill missing keys with null.
  return {
    full_name: parsed.full_name ?? null,
    email: parsed.email ?? null,
    phone: parsed.phone ?? null,
    company: parsed.company ?? null,
    role: parsed.role ?? null,
    website: parsed.website ?? null,
    address: parsed.address ?? null,
    notes: parsed.notes ?? null,
  };
}

// Editorial-feedback request: returns plain prose / bullet list of
// suggestions about the user's text. Never rewrites — just critiques.
export async function reviewText(
  context: string,
  text: string,
): Promise<string> {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new Error("Add some text before requesting feedback.");
  }
  return generateText({ kind: "text_review", context, text: trimmed });
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

