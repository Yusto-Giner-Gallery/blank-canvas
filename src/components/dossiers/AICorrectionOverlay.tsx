import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reviewText } from "@/lib/ai/client";

// Modal that asks the AI for editorial feedback on a piece of text and
// renders the result as a read-only critique. The user reads the
// suggestions and edits the underlying text themselves — the AI never
// rewrites or replaces the text.
export function AICorrectionOverlay({
  context,
  text,
  onClose,
}: {
  context: string;
  text: string;
  onClose: () => void;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFeedback(null);
    reviewText(context, text)
      .then((res) => {
        if (cancelled) return;
        setFeedback(res);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        toast.error(msg);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [context, text]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-2xl border border-border bg-popover">
        <div className="flex items-start justify-between gap-2 border-b border-border px-5 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Sparkles className="h-4 w-4 text-accent-red" />
              Editorial feedback
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {context}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          <section>
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Your text
            </h3>
            <pre className="max-h-44 overflow-auto whitespace-pre-wrap border border-border bg-background p-3 text-sm">
              {text}
            </pre>
          </section>

          <section>
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Suggestions
            </h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Reviewing…</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : feedback ? (
              <pre className="whitespace-pre-wrap border border-border bg-background p-3 text-sm leading-relaxed">
                {feedback}
              </pre>
            ) : null}
          </section>

          <p className="text-xs text-muted-foreground">
            Read the suggestions and edit your text yourself. The AI will not
            rewrite the content for you.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
