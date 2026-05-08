import { useEffect, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
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

type AnchorRect = { top: number; left: number; width: number };

export function FormatToolbar() {
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);

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
      onMouseDown={(e) => {
        // Prevent the contentEditable from losing focus when clicking a button.
        e.preventDefault();
      }}
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

      <Separator />

      <Select
        ariaLabel="Font family"
        defaultValue="Helvetica"
        onChange={(v) => exec("fontName", v)}
      >
        {FONTS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </Select>

      <Select
        ariaLabel="Font size"
        defaultValue="12"
        onChange={(v) => applyInlineStyle(`font-size: ${v}pt`)}
      >
        {SIZES.map((s) => (
          <option key={s} value={String(s)}>
            {s}
          </option>
        ))}
      </Select>
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
      className="flex h-7 w-7 items-center justify-center border border-transparent text-muted-foreground hover:border-border hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="mx-0.5 h-5 w-px bg-border" />;
}

function Select({
  children,
  defaultValue,
  ariaLabel,
  onChange,
}: {
  children: React.ReactNode;
  defaultValue: string;
  ariaLabel: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      aria-label={ariaLabel}
      defaultValue={defaultValue}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 border border-border bg-background px-1 text-xs"
    >
      {children}
    </select>
  );
}

function exec(command: string, value?: string) {
  // execCommand needs the editable to still own the selection.
  document.execCommand(command, false, value);
}

// fontSize via execCommand only accepts 1-7 (legacy), which is useless.
// Wrap the selection in a <span style="font-size: Xpt"> instead.
function applyInlineStyle(decl: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const span = document.createElement("span");
  span.setAttribute("style", decl);
  try {
    span.appendChild(range.extractContents());
    range.insertNode(span);
    range.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch {
    /* extractContents throws on cross-block selections; ignore */
  }
}

function isRichEditable(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.dataset?.richEditor !== "true") return false;
  return el.isContentEditable;
}
