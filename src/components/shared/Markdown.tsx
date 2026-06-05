import { Fragment, type ReactNode } from "react";

// Minimal, dependency-free markdown for Kanban card descriptions (5.3):
// supports bullet lists (- / *), links [text](url), images ![alt](url),
// **bold**, and line breaks. Deliberately small — not a full parser. Links
// open in a new tab so a card can point at an external doc (the gallery's
// "Visitas" Excel, etc).
const INLINE = /(!?\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*)/g;

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const parts = text.split(INLINE);
  parts.forEach((part, i) => {
    if (!part) return;
    const img = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) {
      out.push(
        <img
          key={`${keyBase}-${i}`}
          src={img[2]}
          alt={img[1]}
          className="my-1 max-h-48 max-w-full border border-border"
        />,
      );
      return;
    }
    const link = part.match(/^\[([^\]]*)\]\(([^)]+)\)$/);
    if (link) {
      out.push(
        <a
          key={`${keyBase}-${i}`}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          className="text-foreground underline"
        >
          {link[1] || link[2]}
        </a>,
      );
      return;
    }
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      out.push(<strong key={`${keyBase}-${i}`}>{bold[1]}</strong>);
      return;
    }
    out.push(<Fragment key={`${keyBase}-${i}`}>{part}</Fragment>);
  });
  return out;
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="ml-4 list-disc space-y-0.5">
        {bullets.map((b, i) => (
          <li key={i}>{renderInline(b, `li-${blocks.length}-${i}`)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((line, i) => {
    const m = line.match(/^\s*[-*]\s+(.*)$/);
    if (m) {
      bullets.push(m[1]);
      return;
    }
    flush();
    if (line.trim() === "") {
      blocks.push(<div key={`sp-${i}`} className="h-2" />);
    } else {
      blocks.push(<p key={`p-${i}`}>{renderInline(line, `p-${i}`)}</p>);
    }
  });
  flush();

  return <div className={className}>{blocks}</div>;
}
