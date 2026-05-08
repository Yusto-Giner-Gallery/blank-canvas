import { createContext, useContext } from "react";

// Provides the current CSS scale of the dossier preview page to descendants.
// Mouse drag deltas are in screen px; converting to PDF pt requires dividing
// by this scale (the page is rendered at PAGE_W × PAGE_H pt, then transformed
// to fit its container width).
export const PageScaleContext = createContext<number>(1);

export function usePageScale(): number {
  return useContext(PageScaleContext);
}
