// Lovable AI gateway proxy. The single backend entry point for every
// AI feature in the app — keeps prompts + the API key on the server.
// Frontend calls via supabase.functions.invoke('ai-generate', ...).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type CleanupRow = {
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

type AIRequest =
  | {
      kind: "exhibition_blurb";
      dossier_kind: string;
      title: string;
      artworks: Array<{
        title: string;
        year?: number | null;
        medium?: string | null;
        artist?: { name: string } | null;
      }>;
    }
  | {
      kind: "artwork_description";
      artwork: {
        title: string;
        year?: number | null;
        medium?: string | null;
        width_cm?: number | null;
        height_cm?: number | null;
        depth_cm?: number | null;
        artist?: { name: string } | null;
      };
    }
  | {
      kind: "collector_pitch";
      artwork: {
        title: string;
        year?: number | null;
        medium?: string | null;
        artist?: { name: string } | null;
      };
      contact_name?: string;
    }
  | {
      kind: "cleanup_filenames";
      rows: CleanupRow[];
      known_artists: string[];
    }
  | {
      kind: "text_review";
      context: string;
      text: string;
    };

function buildMessages(req: AIRequest): {
  system: string;
  user: string;
} {
  switch (req.kind) {
    case "exhibition_blurb": {
      const lines = req.artworks
        .map(
          (a) =>
            `- "${a.title}"${a.artist?.name ? ` by ${a.artist.name}` : ""}${
              a.year ? `, ${a.year}` : ""
            }${a.medium ? ` — ${a.medium}` : ""}`,
        )
        .join("\n");
      return {
        system:
          "You write concise, professional gallery exhibition statements. 120–180 words, no headings, no bullet points, present tense.",
        user: `Dossier kind: ${req.dossier_kind}\nTitle: ${req.title}\nWorks:\n${lines}\n\nWrite the exhibition statement.`,
      };
    }
    case "artwork_description": {
      const a = req.artwork;
      const dims = [a.width_cm, a.height_cm, a.depth_cm]
        .filter((n): n is number => typeof n === "number")
        .join(" × ");
      return {
        system:
          "You write short, evocative artwork descriptions for a gallery dossier. 60–90 words, one paragraph, no headings.",
        user: `Title: ${a.title}\nArtist: ${a.artist?.name ?? "unknown"}\nYear: ${a.year ?? "—"}\nMedium: ${a.medium ?? "—"}\nDimensions: ${dims ? `${dims} cm` : "—"}`,
      };
    }
    case "collector_pitch": {
      const a = req.artwork;
      return {
        system:
          "You write personalised collector outreach emails on behalf of a gallery. Warm, concise, 80–140 words, no subject line, plain text body only. Sign off with 'Best,' on its own line.",
        user: `Recipient: ${req.contact_name ?? "(unnamed collector)"}\nFeatured work: "${a.title}"${a.artist?.name ? ` by ${a.artist.name}` : ""}${a.year ? `, ${a.year}` : ""}${a.medium ? ` (${a.medium})` : ""}\n\nWrite the email body.`,
      };
    }
    case "cleanup_filenames": {
      const known = req.known_artists.length
        ? req.known_artists.map((n) => `- ${n}`).join("\n")
        : "(none)";
      const rowsBlock = JSON.stringify(req.rows, null, 2);
      return {
        system: [
          "You clean up auto-extracted artwork metadata from filenames for an art gallery's bulk upload.",
          "For each row, look at the original filename and the parser's current guess. Correct any errors:",
          "- title: just the artwork's title. No commas, no leftover medium/size/year text, no orphan punctuation.",
          "- artist_name: ONLY when an exact case-insensitive match against the known artists list. Otherwise null.",
          "- medium: the technique/material — phrases like 'Oil on Canvas', 'Mixed Media on Linen', 'Bronze', 'Watercolor on Paper'.",
          "- width_cm, height_cm, depth_cm: numbers in cm. Ignore image-pixel dimensions when an explicit cm size exists.",
          "- year: 4-digit year or null.",
          "- price_eur: number (euros) or null.",
          "Return STRICT JSON with this exact shape — nothing else, no markdown fences, no commentary:",
          '{"rows":[{"id":"<row id>","title":"<string|null>","artist_name":"<string|null>","medium":"<string|null>","width_cm":<number|null>,"height_cm":<number|null>,"depth_cm":<number|null>,"year":<number|null>,"price_eur":<number|null>}]}',
          "Every row in the input must appear in the output, keyed by the same id.",
        ].join("\n"),
        user: `Known artists:\n${known}\n\nRows to clean:\n${rowsBlock}`,
      };
    }
    case "text_review": {
      return {
        system: [
          "You are a careful copy editor for a contemporary art gallery's communications.",
          "Read the text the user has written and give brief, specific editorial feedback — what works, what could be tightened, what is unclear, what could be restructured.",
          "Never rewrite the text. Never produce alternative versions. Just point out what to improve so the user can edit it themselves.",
          "Return 3 to 7 short bullet points. Use a leading '-' for each bullet, one observation per bullet, plain prose. Total under 200 words.",
          "Be concrete: cite specific phrases, not abstract critiques.",
        ].join("\n"),
        user: `Context: ${req.context}\n\nText:\n"""\n${req.text}\n"""\n\nGive editorial feedback.`,
      };
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as AIRequest;
    if (!body || typeof body !== "object" || !("kind" in body)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { system, user } = buildMessages(body);

    const upstream = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      },
    );

    if (!upstream.ok) {
      const status = upstream.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded — please try again in a moment.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "AI credits exhausted — top up Lovable AI in workspace settings.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const text = await upstream.text();
      console.error("AI gateway error:", status, text);
      return new Response(
        JSON.stringify({ error: "AI gateway upstream error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const json = await upstream.json();
    const content: string =
      json?.choices?.[0]?.message?.content?.trim() ?? "";

    return new Response(JSON.stringify({ text: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-generate error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
