import { useEffect, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Floating toolbar that follows the focused contentEditable element. We
// listen at the document level so any rich-mode EditableText activates the
// same toolbar — no per-component prop wiring needed. Buttons go through
// document.execCommand (deprecated but universally supported and the only
// way to format an arbitrary contentEditable selection without writing a
// Slate.js-tier editor).

const FONTS = [
  { value: "Helvetica", label: "Helvetica" },
  { value: "Times-Roman", label: "Times" },
  { value: "Courier", label: "Courier" },
  { value: "Inter", label: "Inter" },
] as const;

const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 72] as const;

// Curated 8-swatch palette + a custom-colour native picker. Sharp / hairline
// aesthetic — the swatches are 14px squares with a 1px border.
const COLOR_SWATCHES = [
  "#0a0a0a",
  "#737373",
  "#ffffff",
  "#EC6660", // PARALLELS coral / brand red
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#a855f7",
] as const;

type AnchorRect = { top: number; left: number; width: number };

// Module-level cached selection range. Some toolbar controls (notably native
// <select>) drop the contentEditable's focus when the dropdown opens; by the
// time onChange fires, window.getSelection() is gone. Snapshotting on every
// `selectionchange` lets exec()/applyInlineStyle() always restore the range
// before mutating, so font size + family round-trip cleanly.
let savedRange: Range | null = null;
function saveSelectionIfRich() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  let n: Node | null = range.commonAncestorContainer;
  while (n) {
    if (
      n.nodeType === 1 &&
      (n as HTMLElement).dataset?.richEditor === "true"
    ) {
      savedRange = range.cloneRange();
      return;
    }
    n = n.parentNode;
  }
}
function restoreSelectionIfNeeded() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    // If the current selection is already inside a rich editable, keep it.
    let n: Node | null = sel.getRangeAt(0).commonAncestorContainer;
    while (n) {
      if (
        n.nodeType === 1 &&
        (n as HTMLElement).dataset?.richEditor === "true"
      ) {
        return;
      }
      n = n.parentNode;
    }
  }
  if (!savedRange) return;
  // Re-focus the original editable, then re-install the saved range.
  let host: Node | null = savedRange.commonAncestorContainer;
  while (host && host.nodeType !== 1) host = host.parentNode;
  while (host) {
    if (
      host.nodeType === 1 &&
      (host as HTMLElement).dataset?.richEditor === "true"
    ) {
      (host as HTMLElement).focus();
      const s = window.getSelection();
      s?.removeAllRanges();
      s?.addRange(savedRange);
      return;
    }
    host = host.parentNode;
  }
}

export function FormatToolbar() {
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const [counts, setCounts] = useState<{ words: number; chars: number }>({
    words: 0,
    chars: 0,
  });

  // Recompute word/char count whenever selection/content changes.
  useEffect(() => {
    function refreshCounts() {
      const el = document.activeElement as HTMLElement | null;
      if (!el || !isRichEditable(el)) return;
      const text = (el.innerText ?? el.textContent ?? "").replace(/​/g, "");
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setCounts({ words, chars: text.length });
    }
    document.addEventListener("input", refreshCounts, true);
    document.addEventListener("selectionchange", refreshCounts);
    refreshCounts();
    return () => {
      document.removeEventListener("input", refreshCounts, true);
      document.removeEventListener("selectionchange", refreshCounts);
    };
  }, [anchor]);

  useEffect(() => {
    function onFocus() {
      const el = document.activeElement as HTMLElement | null;
      if (!el || !isRichEditable(el)) {
        setAnchor(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setAnchor({ top: rect.top, left: rect.left, width: rect.width });
    }
    function onBlur(e: FocusEvent) {
      // Only hide if focus is leaving for something that isn't this toolbar.
      const next = e.relatedTarget as HTMLElement | null;
      if (next && next.closest("[data-format-toolbar]")) return;
      window.setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!active || !isRichEditable(active)) setAnchor(null);
      }, 0);
    }
    function onSelectionChange() {
      saveSelectionIfRich();
      const el = document.activeElement as HTMLElement | null;
      if (!el || !isRichEditable(el)) return;
      const rect = el.getBoundingClientRect();
      setAnchor({ top: rect.top, left: rect.left, width: rect.width });
    }
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, []);

  if (!anchor) return null;

  // Anchor the toolbar above the editable, clamped inside the viewport.
  const top = Math.max(8, anchor.top - 44);
  const left = Math.min(
    Math.max(8, anchor.left),
    window.innerWidth - 460,
  );

  return (
    <div
      data-format-toolbar
      className={cn(
        "fixed z-[60] flex items-center gap-1 border border-border bg-popover p-1 shadow-sm",
        "select-none",
      )}
      style={{ top, left }}
      // NOTE: deliberately NO blanket onMouseDown preventDefault here.
      // preventDefault on a parent mousedown bubbles down and blocks
      // the browser's default action for native <select> elements —
      // which is to open the dropdown. Each button-like control below
      // calls preventDefault on its own onMouseDown to keep the
      // contentEditable focused; selects rely on the saved-range
      // mechanism (saveSelectionIfRich / restoreSelectionIfNeeded) to
      // re-install the cursor when their dropdown closes.
    >
      <ToolBtn ariaLabel="Bold" onClick={() => exec("bold")}>
        <Bold className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn ariaLabel="Italic" onClick={() => exec("italic")}>
        <Italic className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn ariaLabel="Underline" onClick={() => exec("underline")}>
        <Underline className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn ariaLabel="Strikethrough" onClick={() => exec("strikeThrough")}>
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolBtn>

      <Separator />

      <ToolBtn ariaLabel="Align left" onClick={() => exec("justifyLeft")}>
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn ariaLabel="Align center" onClick={() => exec("justifyCenter")}>
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn ariaLabel="Align right" onClick={() => exec("justifyRight")}>
        <AlignRight className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn ariaLabel="Justify" onClick={() => exec("justifyFull")}>
        <AlignJustify className="h-3.5 w-3.5" />
      </ToolBtn>

      <Separator />

      <ToolBtn ariaLabel="Bulleted list" onClick={() => exec("insertUnorderedList")}>
        <List className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        ariaLabel="Numbered list"
        onClick={() => exec("insertOrderedList")}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolBtn>

      <Separator />

      <ToolBtn
        ariaLabel="Insert link"
        onClick={() => {
          const url = window.prompt("Link URL");
          if (!url) return;
          // Basic schema guard — sanitiser also blocks javascript:/data:
          // but skipping the round-trip for the common case.
          const safe = /^(https?:|mailto:|tel:)/i.test(url) ? url : `https://${url}`;
          exec("createLink", safe);
        }}
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn ariaLabel="Remove link" onClick={() => exec("unlink")}>
        <Unlink className="h-3.5 w-3.5" />
      </ToolBtn>

      <Separator />

      <ColorPicker />

      <Separator />

      <ToolBtn
        ariaLabel="Clear formatting"
        onClick={() => {
          exec("removeFormat");
          // removeFormat doesn't strip block-level alignment / lists; do it
          // ourselves so the user gets a true reset.
          exec("formatBlock", "div");
        }}
      >
        <Eraser className="h-3.5 w-3.5" />
      </ToolBtn>

      <Separator />

      <Select
        ariaLabel="Font family"
        placeholder="Font"
        onChange={(v) => applyInlineStyle(`font-family: ${v}`)}
      >
        {FONTS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </Select>

      <Select
        ariaLabel="Font size"
        placeholder="Size"
        onChange={(v) => applyInlineStyle(`font-size: ${v}pt`)}
      >
        {SIZES.map((s) => (
          <option key={s} value={String(s)}>
            {s}
          </option>
        ))}
      </Select>

      <Separator />

      {/* Live word + character count for the focused field. Sits at the
          right edge of the toolbar; readers can ignore but writers will
          appreciate it for catalogue copy that has length targets. */}
      <span className="px-1 text-[11px] tabular-nums text-muted-foreground">
        {counts.words} word{counts.words === 1 ? "" : "s"} · {counts.chars} char
        {counts.chars === 1 ? "" : "s"}
      </span>
    </div>
  );
}

// Color picker: 8 preset swatches + a native <input type="color"> for
// arbitrary hex. Click commits via execCommand("foreColor"), which
// writes <span style="color: ..."> — the sanitiser allows it through
// and the PDF renderer paints accordingly.
function ColorPicker() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseDown={(e) => e.preventDefault()}>
      <button
        type="button"
        aria-label="Text color"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 items-center gap-1 border border-transparent px-1 text-xs text-muted-foreground hover:border-border hover:text-foreground"
      >
        <span className="text-[11px] font-semibold">A</span>
        <span
          aria-hidden
          className="h-2 w-3 border border-border"
          style={{ background: "linear-gradient(to right, #0a0a0a, #EC6660)" }}
        />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-8 z-[70] flex flex-col gap-1 border border-border bg-popover p-1.5 shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-4 gap-1">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => {
                  exec("foreColor", c);
                  setOpen(false);
                }}
                className="h-5 w-5 border border-border"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <input
            type="color"
            aria-label="Custom color"
            onChange={(e) => {
              exec("foreColor", e.target.value);
              setOpen(false);
            }}
            className="h-6 w-full cursor-pointer border border-border"
          />
        </div>
      ) : null}
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      className="flex h-7 w-7 items-center justify-center border border-transparent text-muted-foreground hover:border-border hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="mx-0.5 h-5 w-px bg-border" />;
}

// Controlled select that always shows its placeholder option. Each pick fires
// onChange and immediately resets the selected value so the user can pick the
// same size/family again (a defaultValue uncontrolled select silently swallows
// repeats). The placeholder option carries the visible label.
function Select({
  children,
  placeholder,
  ariaLabel,
  onChange,
}: {
  children: React.ReactNode;
  placeholder: string;
  ariaLabel: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value=""
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return;
        onChange(v);
        // Reset to the placeholder so re-picking the same value works.
        e.currentTarget.value = "";
      }}
      className="h-7 border border-border bg-background px-1 text-xs"
    >
      <option value="" disabled hidden>
        {placeholder}
      </option>
      {children}
    </select>
  );
}

function exec(command: string, value?: string) {
  // execCommand needs the editable to still own the selection.
  restoreSelectionIfNeeded();
  document.execCommand(command, false, value);
  saveSelectionIfRich();
}

// fontSize / fontFamily via execCommand are unreliable: fontSize takes a
// legacy 1-7 scale; fontName produces deprecated `<font face>` tags that
// our sanitiser strips on next blur. Both go through this helper, which
// wraps the selection in `<span style="...">` (allowed by the sanitiser
// and translated to PDF runs by parseHtmlToRuns).
//
// When the selection is collapsed (caret only, no text), we still insert
// a styled span containing a zero-width space and place the caret inside
// — that way subsequent typing inherits the style. Standard rich-editor
// behaviour. The ZWSP is dropped on blur sanitise.
function applyInlineStyle(decl: string) {
  restoreSelectionIfNeeded();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const span = document.createElement("span");
  span.setAttribute("style", decl);
  try {
    if (range.collapsed) {
      span.appendChild(document.createTextNode("​"));
      range.insertNode(span);
      const caret = document.createRange();
      caret.selectNodeContents(span);
      caret.collapse(false);
      sel.removeAllRanges();
      sel.addRange(caret);
      saveSelectionIfRich();
      return;
    }
    span.appendChild(range.extractContents());
    range.insertNode(span);
    range.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(range);
    saveSelectionIfRich();
  } catch {
    /* extractContents throws on cross-block selections; ignore */
  }
}

function isRichEditable(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.dataset?.richEditor !== "true") return false;
  return el.isContentEditable;
}
