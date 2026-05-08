import { useState } from "react";
import { ImageOff, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ArtworkListItem } from "@/integrations/supabase/domain";
import { generateText } from "@/lib/ai/client";
import { errorMessage } from "@/lib/error";
import { imageUrl } from "@/hooks/useArtworks";

export function ArtworkDescriptionEditor({
  artworks,
  descriptions,
  onChange,
}: {
  artworks: ArtworkListItem[];
  descriptions: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  async function generate(a: ArtworkListItem) {
    setGeneratingId(a.id);
    try {
      const text = await generateText({ kind: "artwork_description", artwork: a });
      onChange({ ...descriptions, [a.id]: text });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setGeneratingId(null);
    }
  }

  if (artworks.length === 0) return null;

  return (
    <div className="space-y-3">
      {artworks.map((a) => {
        const url = imageUrl(a.primary_image?.storage_path);
        return (
          <div
            key={a.id}
            className="flex gap-3 rounded-md border border-border bg-card p-3"
          >
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-muted">
              {url ? (
                <img src={url} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageOff className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{a.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.artist?.name ?? "—"}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => generate(a)}
                  disabled={generatingId === a.id}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {generatingId === a.id ? "Generating…" : "AI"}
                </Button>
              </div>
              <textarea
                value={descriptions[a.id] ?? ""}
                onChange={(e) =>
                  onChange({ ...descriptions, [a.id]: e.target.value })
                }
                rows={2}
                placeholder="Description for this work…"
                className="w-full resize-y rounded-md border border-input bg-background p-2 text-xs"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
