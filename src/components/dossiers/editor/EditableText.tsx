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
    handleBlurInternal();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLElement).blur();
      return;
    }
    if (multiline && e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      // Insert a literal "\n" text node so el.textContent always round-trips
      // line breaks (and renders them via white-space: pre-wrap on the
      // element below). The browser's default Enter inserts <div><br></div>
      // or <p>, neither of which survives textContent serialisation cleanly.
      e.preventDefault();
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const newline = document.createTextNode("\n");
      range.insertNode(newline);
      // Browsers collapse a trailing "\n" with no content after it; pad with
      // a zero-width space so the caret can sit on the new line.
      if (!newline.nextSibling) {
        const pad = document.createTextNode("​");
        newline.parentNode?.insertBefore(pad, newline.nextSibling);
        range.setStartAfter(pad);
        range.setEndAfter(pad);
      } else {
        range.setStartAfter(newline);
        range.setEndAfter(newline);
      }
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      // Revert: restore prop value and blur without committing.
      if (ref.current) ref.current.textContent = value;
      (e.target as HTMLElement).blur();
    }
  }

  function handleBlurInternal() {
    setFocused(false);
    // Strip the zero-width-space pad we use to keep trailing line breaks
    // visible mid-edit; we don't want to persist it.
    const raw = ref.current?.textContent ?? "";
    const next = raw.replace(/​/g, "");
    if (next !== value) onChange(next);
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
        "outline-none cursor-text",
        // Multi-line: preserve newlines, give an empty editor real height
        // so the user can actually click into it (otherwise an empty bio
        // collapses to ~0 px under the preview scale and looks dead).
        multiline && "whitespace-pre-wrap min-h-[1.4em] block",
        // Stack above any sibling click target on the same page (e.g. an
        // EditableImageSlot covering the page background).
        "relative z-10",
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
