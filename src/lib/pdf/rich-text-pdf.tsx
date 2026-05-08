import type React from "react";
import { Link, Text, View } from "@react-pdf/renderer";
import {
  parseHtmlToRuns,
  type RichRun,
  type RichParagraph,
} from "@/lib/dossier/rich-text";

// Translate a sanitised HTML string (from the WYSIWYG editor) into nested
// @react-pdf <Text> elements. The structure walks paragraphs → runs:
//
//   <View>
//     <Text style={{textAlign: "...", ...base}}>
//       <Text style={{fontWeight: "bold", ...}}>Hello </Text>
//       <Text style={{fontStyle: "italic"}}>world</Text>
//     </Text>
//     ...
//   </View>
//
// @react-pdf supports nested <Text> with style props; that's the supported
// path for inline formatting changes (no HTML parsing in the renderer).

type BaseStyle = React.ComponentProps<typeof Text>["style"];

const FONT_FALLBACKS: Record<string, string> = {
  // Map common aliases to fonts @react-pdf has registered (Helvetica,
  // Times-Roman, Courier are built in; Inter is registered in
  // shared.ts).
  helvetica: "Helvetica",
  arial: "Helvetica",
  sans: "Helvetica",
  "sans-serif": "Helvetica",
  times: "Times-Roman",
  "times-roman": "Times-Roman",
  serif: "Times-Roman",
  courier: "Courier",
  mono: "Courier",
  monospace: "Courier",
  inter: "Inter",
};

function resolveFont(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const key = name.toLowerCase();
  return FONT_FALLBACKS[key] ?? name;
}

function runStyle(run: RichRun): React.CSSProperties {
  const out: React.CSSProperties = {};
  if (run.bold) out.fontWeight = "bold";
  if (run.italic) out.fontStyle = "italic";
  // @react-pdf accepts space-separated values for textDecoration.
  const decorations: string[] = [];
  if (run.underline) decorations.push("underline");
  if (run.strike) decorations.push("line-through");
  if (decorations.length > 0) out.textDecoration = decorations.join(" ");
  if (run.fontSize) out.fontSize = run.fontSize;
  const family = resolveFont(run.fontFamily);
  if (family) out.fontFamily = family;
  if (run.color) out.color = run.color;
  return out;
}

export function RichText({
  html,
  baseStyle,
  fallback,
}: {
  html: string | undefined | null;
  baseStyle?: BaseStyle;
  // Plain-text fallback when html is empty / malformed.
  fallback?: string;
}) {
  const paragraphs: RichParagraph[] = html
    ? parseHtmlToRuns(html)
    : fallback
      ? [
          {
            align: "left",
            runs: [
              {
                text: fallback,
                bold: false,
                italic: false,
                underline: false,
                strike: false,
              },
            ],
          },
        ]
      : [];
  if (paragraphs.length === 0) return null;
  return (
    <View>
      {paragraphs.map((p, i) => (
        <Text
          key={i}
          // @react-pdf merges arrays of styles; later wins.
          style={[baseStyle, { textAlign: p.align }] as never}
        >
          {p.runs.map((run, j) => {
            const style = runStyle(run);
            // Hyperlinks get the @react-pdf <Link> primitive — clickable
            // in PDF viewers — with the formatted run inside it.
            if (run.href) {
              return (
                <Link key={j} src={run.href} style={style as never}>
                  {run.text}
                </Link>
              );
            }
            return (
              <Text key={j} style={style as never}>
                {run.text}
              </Text>
            );
          })}
        </Text>
      ))}
    </View>
  );
}
