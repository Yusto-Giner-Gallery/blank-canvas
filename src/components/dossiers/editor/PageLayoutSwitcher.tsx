import { useState } from "react";
import { Check, LayoutPanelLeft } from "lucide-react";
import type { PageLayoutVariant } from "@/integrations/supabase/domain";
import { cn } from "@/lib/utils";

// Tiny popover-style picker for an artwork page's layout variant. Opens on
// click of the badge, closes on outside click or Escape.

const VARIANTS: Array<{
  value: PageLayoutVariant;
  label: string;
  description: string;
}> = [
  { value: "image_right", label: "Image right", description: "Image on the right, meta on the left (default)" },
  { value: "image_left", label: "Image left", description: "Image on the left, meta on the right" },
  { value: "full_image", label: "Full page", description: "Full-bleed image — no meta block" },
  { value: "detail_zoom", label: "Detail zoom", description: "Cropped detail view — no meta block" },
  { value: "pair_with", label: "Pair with…", description: "Two artworks side-by-side on one page" },
];

type Props = {
  current: PageLayoutVariant;
  onChange: (next: PageLayoutVariant) => void;
  onPickPair?: () => void;
};

export function PageLayoutSwitcher({ current, onChange, onPickPair }: Props) {
  const [open, setOpen] = useState(false);
  const currentLabel =
    VARIANTS.find((v) => v.value === current)?.label ?? "Image right";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex items-center gap-1 border border-border bg-background/90 px-2 py-1 text-[10px] uppercase tracking-wide text-foreground hover:bg-muted"
      >
        <LayoutPanelLeft className="h-3 w-3" />
        {currentLabel}
      </button>
      {open ? (
        <>
          {/* Click-outside catcher */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full z-20 mt-1 w-56 border border-border bg-popover text-popover-foreground shadow-lg">
            {VARIANTS.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => {
                  if (v.value === "pair_with") {
                    onPickPair?.();
                  } else {
                    onChange(v.value);
                  }
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-muted",
                  current === v.value && "bg-muted",
                )}
              >
                <Check
                  className={cn(
                    "mt-0.5 h-3 w-3 shrink-0",
                    current === v.value ? "text-foreground" : "text-transparent",
                  )}
                />
                <div>
                  <div className="font-medium">{v.label}</div>
                  <div className="text-muted-foreground">{v.description}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
