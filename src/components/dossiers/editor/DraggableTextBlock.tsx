import { useEffect, useRef, useState } from "react";
import { Move, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageScale } from "./PageScaleContext";

// Wrapper that lets the user drag a positioned text block on the dossier
// preview. Stores an (x, y) offset in PDF points relative to the template's
// default position; the PDF template applies the same offset so the export
// matches the preview pixel-for-pixel.
//
// Mechanics:
// - PointerEvents-based drag (no @dnd-kit). The preview page applies a CSS
//   transform: scale(N) to fit the viewport, so screen-px deltas are divided
//   by the scale (consumed via PageScaleContext) before being persisted as
//   PDF-pt offsets.
// - Snaps to a 4 pt grid by default. Hold Shift while dragging for free
//   placement.
// - Hover reveals a small "move" handle in the top-left corner and a
//   "reset position" button when the offset is non-zero.
//
// Aesthetic: hairline border, sharp corners, no shadows. Brand red only on
// the active drag border so the moving block is visually distinct.

type Props = {
  /** Stable slot identifier, e.g. "intro.<artist_id>.bio_en". */
  blockKey: string;
  /** Persisted offset from the parent dossier object. */
  offset: { x: number; y: number };
  /** Called once on pointerup, with the committed offset in PDF points. */
  onCommit: (next: { x: number; y: number }) => void;
  /** Optional: reset to {x:0,y:0}. Reveals the reset chip when offset≠0. */
  onReset?: () => void;
  /** Snap step in PDF pt; default 4. Shift disables snap mid-drag. */
  snap?: number;
  className?: string;
  children: React.ReactNode;
};

export function DraggableTextBlock({
  blockKey,
  offset,
  onCommit,
  onReset,
  snap = 4,
  className,
  children,
}: Props) {
  const scale = usePageScale();
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const x = drag?.x ?? offset.x;
  const y = drag?.y ?? offset.y;

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startScreenX = e.clientX;
    const startScreenY = e.clientY;
    const startOffsetX = offset.x;
    const startOffsetY = offset.y;
    let nextX = startOffsetX;
    let nextY = startOffsetY;

    function pickSnap(value: number, free: boolean) {
      if (free) return value;
      return Math.round(value / snap) * snap;
    }

    function onMove(ev: PointerEvent) {
      const safeScale = scale > 0 ? scale : 1;
      const dx = (ev.clientX - startScreenX) / safeScale;
      const dy = (ev.clientY - startScreenY) / safeScale;
      nextX = pickSnap(startOffsetX + dx, ev.shiftKey);
      nextY = pickSnap(startOffsetY + dy, ev.shiftKey);
      setDrag({ x: nextX, y: nextY });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      onCommit({ x: nextX, y: nextY });
      setDrag(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  // Cleanup safety: if the component unmounts mid-drag.
  useEffect(() => {
    return () => setDrag(null);
  }, []);

  const isDragging = drag != null;
  const moved = x !== 0 || y !== 0;

  return (
    <div
      ref={wrapperRef}
      data-block-key={blockKey}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: isDragging ? "none" : "transform 80ms ease-out",
      }}
      className={cn("group/draggable relative", className)}
    >
      {children}

      {/* Hover-revealed handle in the top-left corner. We render it inside
          a position: absolute layer with negative offset so it doesn't push
          the surrounding layout. */}
      <span
        role="button"
        aria-label="Drag to reposition"
        title={`Drag to move — Shift for free placement (offset ${Math.round(x)}, ${Math.round(y)} pt)`}
        onPointerDown={onPointerDown}
        className={cn(
          "absolute -left-3 -top-3 z-20 flex h-6 w-6 cursor-grab items-center justify-center border bg-background text-muted-foreground transition-opacity",
          "opacity-0 group-hover/draggable:opacity-100 focus-visible:opacity-100",
          isDragging
            ? "cursor-grabbing border-accent-red text-accent-red opacity-100"
            : "border-border hover:text-foreground",
        )}
      >
        <Move className="h-3 w-3" />
      </span>

      {/* Reset chip — appears next to the handle when there's a saved
          offset. Single click sends the block back to its template default. */}
      {moved && onReset ? (
        <button
          type="button"
          aria-label="Reset position"
          title="Reset position"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReset();
          }}
          className="absolute -left-3 top-4 z-20 flex h-6 w-6 cursor-pointer items-center justify-center border border-border bg-background text-muted-foreground opacity-0 transition-opacity group-hover/draggable:opacity-100 hover:text-foreground focus-visible:opacity-100"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      ) : null}

      {/* Active-drag outline so the moving block is visually distinct. */}
      {isDragging ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 border border-accent-red"
        />
      ) : null}
    </div>
  );
}
