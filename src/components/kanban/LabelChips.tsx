import type { CardLabel } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

const COLOR: Record<CardLabel, string> = {
  red: "bg-[hsl(0_72%_55%)]",
  orange: "bg-[hsl(25_100%_55%)]",
  yellow: "bg-[hsl(45_100%_55%)]",
  green: "bg-[hsl(140_60%_45%)]",
  blue: "bg-[hsl(220_70%_55%)]",
  purple: "bg-[hsl(280_55%_55%)]",
  shipping: "bg-foreground text-background",
};

const LABEL: Record<CardLabel, string> = {
  red: "Red",
  orange: "Orange",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
  shipping: "Shipping",
};

export const ALL_LABELS: CardLabel[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "shipping",
];

export function LabelDot({ label }: { label: CardLabel }) {
  return (
    <span
      title={LABEL[label]}
      className={cn(
        "inline-block h-2.5 w-7 rounded-sm",
        COLOR[label],
      )}
    />
  );
}

export function LabelChip({
  label,
  active,
  onClick,
}: {
  label: CardLabel;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-sm border px-2 py-1 text-xs transition-colors",
        active
          ? "border-foreground"
          : "border-border opacity-60 hover:opacity-100",
        label === "shipping" && active && "bg-foreground text-background",
      )}
    >
      <LabelDot label={label} />
      {LABEL[label]}
    </button>
  );
}
