// Outlined-title typography via opentype.js path extraction.
//
// @react-pdf/renderer's SVG <Text> renderer only fills (no stroke), so to
// reproduce the PARALLELS hollow title we extract glyph outlines from a
// real font file and render them as <Path stroke fill="none">.
//
// Font is loaded once per page (browser fetch or node fs read), parsed via
// opentype.js, and cached at module level. The hook in
// src/hooks/useTitleSvgPath.ts subscribes the editor to the resolved path
// string + bounds so it can pass them into the PDF render.

// opentype.js ships both CJS (named exports on the module object) and ESM
// (named exports). Different bundlers/runtimes pick different files, so
// route through a wildcard import + .default fallback so both vite (uses
// the .mjs) and tsx node (uses the CJS build) resolve the same symbols.
import * as opentypeNs from "opentype.js";
import type { Font } from "opentype.js";

type OpenTypeApi = { parse: (buf: ArrayBuffer) => Font };
const opentype: OpenTypeApi =
  (opentypeNs as unknown as { default?: OpenTypeApi }).default ??
  (opentypeNs as unknown as OpenTypeApi);
const parseOpenTypeFont = opentype.parse;

const FONT_URL = "/fonts/Inter-Bold.ttf";

let fontPromise: Promise<Font> | null = null;

export function loadTitleFont(): Promise<Font> {
  if (fontPromise) return fontPromise;
  fontPromise = (async () => {
    if (typeof window !== "undefined") {
      const r = await fetch(FONT_URL);
      if (!r.ok) throw new Error(`Title font fetch failed: ${r.status}`);
      return parseOpenTypeFont(await r.arrayBuffer());
    }
    // node / tsx smoke test path
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const buf = await fs.readFile(path.join(process.cwd(), "public/fonts/Inter-Bold.ttf"));
    return parseOpenTypeFont(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  })().catch((e) => {
    fontPromise = null; // allow retry on transient failures
    throw e;
  });
  return fontPromise;
}

export type TitlePathData = {
  d: string;
  width: number;
  cap_height: number;
};

// Returns SVG path data for outlining `text` at `fontSize` with extra
// letter spacing in PDF points. The path is positioned with its baseline
// at y=0, so callers translate to put it where they want.
export async function getTitleSvgPath(
  text: string,
  fontSize: number,
  letterSpacing = 0,
): Promise<TitlePathData | null> {
  if (!text) return null;
  const font = await loadTitleFont();
  // opentype letterSpacing option is in em units; convert from points.
  const lsEm = letterSpacing / fontSize;
  const path = font.getPath(text, 0, 0, fontSize, { letterSpacing: lsEm });
  const width = font.getAdvanceWidth(text, fontSize, { letterSpacing: lsEm });
  const cap_height = ((font.tables.os2 as { sCapHeight?: number })?.sCapHeight ?? font.ascender)
    / font.unitsPerEm
    * fontSize;
  return { d: path.toPathData(2), width, cap_height };
}
