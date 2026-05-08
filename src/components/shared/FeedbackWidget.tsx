import { useState } from "react";
import { Bug, Plus } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { FeedbackModal } from "./FeedbackModal";

// Hidden by default. On pointer devices, hovering the bottom-left
// corner reveals the icons. On touch (no hover), tapping the small
// hot-zone toggles them — they do not stay visible permanently.
export function FeedbackWidget() {
  const location = useLocation();
  const [open, setOpen] = useState<null | "bug" | "feature">(null);
  const [revealed, setRevealed] = useState(false);

  const visible = revealed || open !== null;

  return (
    <>
      <div
        className="pointer-events-auto fixed bottom-0 left-0 z-40 flex h-32 w-32 items-end justify-start p-4"
        onMouseEnter={() => setRevealed(true)}
        onMouseLeave={() => setRevealed(false)}
        onClick={() => setRevealed((v) => !v)}
      >
        <div
          className={cn(
            "flex flex-col items-start gap-2 transition-opacity duration-200",
            visible ? "opacity-100" : "opacity-0",
          )}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen("feature");
            }}
            aria-label="Request a feature"
            tabIndex={visible ? 0 : -1}
            className="flex h-9 w-9 items-center justify-center border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen("bug");
            }}
            aria-label="Report a bug"
            tabIndex={visible ? 0 : -1}
            className="flex h-9 w-9 items-center justify-center border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Bug className="h-4 w-4" />
          </button>
        </div>
      </div>
      {open ? (
        <FeedbackModal
          kind={open}
          page_path={location.pathname}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}
