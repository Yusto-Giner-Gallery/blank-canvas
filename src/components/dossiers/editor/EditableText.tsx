import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// contentEditable wrapper. Renders inline as a span/div, lets the user click
// to edit, commits on blur. The component is uncontrolled inside but
// surfaces value via onChange — so the parent owns the source of truth.
//
// Usage notes:
// - We DON'T use defaultValue+onBlur and call setValue from the inside,
//   because that would lose external updates (e.g. AI fill).
// - Re-syncs from `value` on prop change ONLY when the editor isn't focused,
//   to avoid clobbering the caret while typing.
// - `multiline` switches between <span> (one-line) and <div> (multi-line).

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
};

export function EditableText({
  value,
  onChange,
  placeholder,
  multiline = false,
  className,
  ariaLabel,
  style,
}: Props) {
  const ref = useRef<HTMLDivElement | HTMLSpanElement | null>(null);
  const [focused, setFocused] = useState(false);

  // Sync incoming value into the DOM only when not focused (avoids caret
  // jumps on every keystroke since onChange triggers a parent re-render).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (focused) return;
    if (el.textContent !== value) el.textContent = value;
  }, [value, focused]);

  function handleBlur() {
    setFocused(false);
    const next = ref.current?.textContent ?? "";
    if (next !== value) onChange(next);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      // Revert: restore prop value and blur without committing.
      if (ref.current) ref.current.textContent = value;
      (e.target as HTMLElement).blur();
    }
  }

  const Tag = (multiline ? "div" : "span") as "div";
  const isEmpty = !value;

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline={multiline || undefined}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      data-placeholder={placeholder}
      style={style}
      className={cn(
        "outline-none",
        "focus:ring-1 focus:ring-foreground/40 focus:bg-background/40",
        "transition-colors",
        // Show placeholder when empty and not focused.
        isEmpty &&
          "before:content-[attr(data-placeholder)] before:text-muted-foreground/60 before:pointer-events-none",
        className,
      )}
    />
  );
}
