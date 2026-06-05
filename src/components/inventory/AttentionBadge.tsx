import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useAttentionReasons } from "@/hooks/useAttentionReasons";

// The orange flag. When given an `artworkId` it becomes a button that opens
// a small task-list popover explaining *what* needs attention (1.5). Without
// an id it falls back to the static label.
export function AttentionBadge({ artworkId }: { artworkId?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const reasons = useAttentionReasons(artworkId ?? "", open && !!artworkId);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const className =
    "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium text-[hsl(var(--attention))] ring-1 ring-[hsl(var(--attention))]/40";

  if (!artworkId) {
    return (
      <span className={className} title="Needs attention this week">
        <AlertTriangle className="h-3 w-3" />
        Attention
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        className={className}
        title="What needs attention?"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPos({
            x: Math.min(e.clientX, window.innerWidth - 292),
            y: e.clientY + 8,
          });
          setOpen((o) => !o);
        }}
      >
        <AlertTriangle className="h-3 w-3" />
        Attention
      </button>
      {open ? (
        <div
          ref={ref}
          role="dialog"
          aria-label="Needs attention"
          style={{ left: pos.x, top: pos.y, width: 280 }}
          className="fixed z-50 rounded-md border border-border bg-popover p-3 shadow-lg"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Needs attention
          </div>
          {reasons.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (reasons.data?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground">
              Flagged by the attention view. No itemised tasks found.
            </p>
          ) : (
            <ul className="space-y-2">
              {reasons.data!.map((r) => (
                <li key={r.id} className="flex gap-2 text-xs">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--attention))]" />
                  <span>
                    <span className="font-medium">{r.label}</span>
                    {r.detail ? (
                      <span className="block text-muted-foreground">{r.detail}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </>
  );
}
