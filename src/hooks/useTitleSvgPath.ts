import { useEffect, useState } from "react";
import { getTitleSvgPath, type TitlePathData } from "@/lib/pdf/glyph-path";

// Resolves the SVG path data for a title glyph string. Returns null until
// the font is loaded and parsed (first render of the editor); after that,
// returns updated path data whenever `text` / sizing inputs change.

export function useTitleSvgPath(
  text: string,
  fontSize: number,
  letterSpacing = 0,
): TitlePathData | null {
  const [data, setData] = useState<TitlePathData | null>(null);
  useEffect(() => {
    let cancelled = false;
    getTitleSvgPath(text, fontSize, letterSpacing)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        // If font loading fails the cover falls back to solid-white text;
        // we don't bubble the error since it doesn't block editing.
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [text, fontSize, letterSpacing]);
  return data;
}
