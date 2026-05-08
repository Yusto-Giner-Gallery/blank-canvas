// Rich-text utilities for the dossier editor + PDF templates.
//
// Storage shape: body_blocks[<field>] stays a plain string (legacy consumers
// — AI text review, email composer — read this); body_blocks[<field>_html]
// carries the rich version when set. Editor reads the HTML sibling first,
// falls back to plain. On save it writes BOTH.
//
// Vocabulary is intentionally narrow: only the tags + inline-style props
// listed below survive sanitisation, because the @react-pdf renderer can
// only honour what `parseHtmlToRuns` knows how to translate. Anything else
// would diverge between the HTML preview and the PDF export.

const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "br",
  "div",
  "p",
  "span",
]);

const ALLOWED_STYLE_PROPS = new Set([
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-align",
  "color",
]);

// Tag → semantic flag the PDF runs care about.
const BOLD_TAGS = new Set(["b", "strong"]);
const ITALIC_TAGS = new Set(["i", "em"]);
const UNDERLINE_TAGS = new Set(["u"]);

export type RichRun = {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
};

export type RichParagraph = {
  align: "left" | "center" | "right";
  runs: RichRun[];
};

// === Sanitiser =============================================================

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(
    `<div id="ygm-root">${html}</div>`,
    "text/html",
  );
  const root = doc.getElementById("ygm-root");
  if (!root) return "";
  cleanNode(root);
  return root.innerHTML;
}

function cleanNode(el: Element): void {
  const children = Array.from(el.children);
  for (const child of children) {
    const tag = child.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      // Unwrap: replace the bad node with its children.
      const parent = child.parentNode;
      if (!parent) continue;
      while (child.firstChild) parent.insertBefore(child.firstChild, child);
      parent.removeChild(child);
      continue;
    }
    // Strip every attribute except a sanitised inline style.
    const styleAttr = child.getAttribute("style");
    for (const attr of Array.from(child.attributes)) {
      child.removeAttribute(attr.name);
    }
    if (styleAttr) {
      const cleaned = sanitizeStyle(styleAttr);
      if (cleaned) child.setAttribute("style", cleaned);
    }
    cleanNode(child);
  }
}

function sanitizeStyle(style: string): string {
  return style
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const [prop] = decl.split(":");
      return ALLOWED_STYLE_PROPS.has(prop?.trim().toLowerCase() ?? "");
    })
    .join("; ");
}

// === HTML → plain text =====================================================

export function htmlToPlain(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return collectText(doc.body);
}

function collectText(node: Node): string {
  let out = "";
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      out += child.textContent ?? "";
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === "br") {
        out += "\n";
      } else {
        const inner = collectText(el);
        if (tag === "div" || tag === "p") {
          out += inner + "\n";
        } else {
          out += inner;
        }
      }
    }
  }
  return out.replace(/\n{3,}/g, "\n\n").trimEnd();
}

// === HTML → run paragraphs (PDF-ready) =====================================

type StyleStack = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  align: "left" | "center" | "right";
};

const ROOT_STACK: StyleStack = {
  bold: false,
  italic: false,
  underline: false,
  align: "left",
};

export function parseHtmlToRuns(html: string): RichParagraph[] {
  if (!html) return [{ align: "left", runs: [] }];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const paragraphs: RichParagraph[] = [{ align: "left", runs: [] }];
  walk(doc.body, ROOT_STACK, paragraphs);
  return paragraphs.filter((p) => p.runs.some((r) => r.text.length > 0));
}

function walk(node: Node, parent: StyleStack, out: RichParagraph[]): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? "").replace(/​/g, "");
      if (!text) continue;
      // If the text has explicit "\n" mid-string, split on it as paragraph
      // breaks (mirrors the multiline EditableText \n-insertion behaviour).
      const segments = text.split(/\n/);
      segments.forEach((seg, i) => {
        if (i > 0) startNewParagraph(out, parent.align);
        if (!seg) return;
        out[out.length - 1].runs.push(runFromStack(seg, parent));
      });
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") {
      startNewParagraph(out, parent.align);
      continue;
    }
    const next: StyleStack = { ...parent };
    if (BOLD_TAGS.has(tag)) next.bold = true;
    if (ITALIC_TAGS.has(tag)) next.italic = true;
    if (UNDERLINE_TAGS.has(tag)) next.underline = true;
    applyStyleAttr(el, next);

    const isBlock = tag === "div" || tag === "p";
    if (isBlock && out[out.length - 1].runs.length > 0) {
      startNewParagraph(out, next.align);
    } else if (isBlock) {
      out[out.length - 1].align = next.align;
    }

    walk(el, next, out);

    if (isBlock) {
      startNewParagraph(out, parent.align);
    }
  }
}

function startNewParagraph(
  out: RichParagraph[],
  align: "left" | "center" | "right",
) {
  if (out[out.length - 1].runs.length === 0) {
    out[out.length - 1].align = align;
    return;
  }
  out.push({ align, runs: [] });
}

function runFromStack(text: string, s: StyleStack): RichRun {
  return {
    text,
    bold: s.bold,
    italic: s.italic,
    underline: s.underline,
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    color: s.color,
  };
}

function applyStyleAttr(el: HTMLElement, target: StyleStack): void {
  const style = el.getAttribute("style");
  if (!style) return;
  for (const decl of style.split(";")) {
    const [propRaw, valueRaw] = decl.split(":");
    if (!propRaw || !valueRaw) continue;
    const prop = propRaw.trim().toLowerCase();
    const value = valueRaw.trim();
    switch (prop) {
      case "font-weight":
        if (
          value === "bold" ||
          value === "bolder" ||
          /^(?:[6-9]\d{2}|1000)$/.test(value)
        )
          target.bold = true;
        break;
      case "font-style":
        if (value === "italic" || value === "oblique") target.italic = true;
        break;
      case "text-decoration":
        if (/underline/.test(value)) target.underline = true;
        break;
      case "font-family":
        target.fontFamily = value
          .replace(/^['"]|['"]$/g, "")
          .replace(/\s*,.*$/, "");
        break;
      case "font-size": {
        const px = parsePixels(value);
        if (px != null) target.fontSize = px;
        break;
      }
      case "color":
        target.color = value;
        break;
      case "text-align":
        if (value === "left" || value === "center" || value === "right") {
          target.align = value;
        }
        break;
    }
  }
}

function parsePixels(value: string): number | null {
  // Accepts "14px", "14pt", "14" — interprets bare numbers as pt.
  const m = value.match(/^(\d+(?:\.\d+)?)(px|pt|em)?$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] ?? "pt").toLowerCase();
  if (unit === "px") return n; // treat 1px ≈ 1pt for our preview/PDF mapping
  if (unit === "em") return n * 12; // assume 12pt base
  return n; // pt
}

// === Preview convenience: lift a plain string into HTML for the editor ====

export function plainToHtml(s: string): string {
  if (!s) return "";
  return s
    .split(/\n/)
    .map((p) => `<div>${escapeHtml(p) || "<br>"}</div>`)
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
