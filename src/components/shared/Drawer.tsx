import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Right-anchored slide-over panel. Used for "peek" drilldowns in split-view
// mode — clicking a contact from a deal card opens this without leaving the
// pipeline. Stack-aware via the optional `depth` prop so a peek-from-peek
// renders above its parent. Click backdrop, click ×, or press Escape to
// close. Respects `prefers-reduced-motion`: no transition when set.
//
// Width: 28rem on md+, full width on mobile. Sized to fit a contact card,
// an artwork meta panel, etc. — bigger surfaces should probably be a route.

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Stack depth — 0 (default) is the topmost. Each nested drawer adds 1. */
  depth?: number;
  /** Width override; default 28rem (~448 px) on md+. */
  widthClass?: string;
  children: React.ReactNode;
};

export function Drawer({
  open,
  onClose,
  title,
  depth = 0,
  widthClass = "md:w-[28rem]",
  children,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while a drawer is open. Compose with stacked drawers:
  // every open drawer sets the lock; the last to close releases it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  // Bumping z by depth so nested drawers stack above siblings.
  const z = 50 + depth * 2;
  return (
    <div className="fixed inset-0" style={{ zIndex: z }}>
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-foreground/30 motion-safe:animate-in motion-safe:fade-in"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col border-l border-border bg-background shadow-sm",
          "motion-safe:animate-in motion-safe:slide-in-from-right",
          widthClass,
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="truncate text-sm font-medium uppercase tracking-wider">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="flex h-7 w-7 items-center justify-center border border-transparent text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}
