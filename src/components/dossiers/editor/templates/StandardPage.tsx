import { useEffect, useRef, useState } from "react";

// A4 portrait page primitive used by the standard (non-editorial) HTML
// mirrors. Mirrors @react-pdf's A4 portrait at 595×842pt with a
// ResizeObserver-driven scale so child elements can use raw PDF coords.

export const STD_PAGE_W = 595;
export const STD_PAGE_H = 842;

export function StandardPage({
  children,
  paddingTop = 80,
}: {
  children: React.ReactNode;
  paddingTop?: number;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = outerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setScale(w / STD_PAGE_W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={outerRef}
      className="relative mx-auto overflow-hidden border border-border bg-white text-foreground shadow-sm"
      style={{
        width: "100%",
        aspectRatio: `${STD_PAGE_W} / ${STD_PAGE_H}`,
        fontFamily: "Helvetica, Arial, sans-serif",
      }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: STD_PAGE_W,
          height: STD_PAGE_H,
          transform: `scale(${scale})`,
          padding: 40,
          paddingTop,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function PageHeader({
  galleryName,
  kindLabel,
}: {
  galleryName: string;
  kindLabel: string;
}) {
  return (
    <div
      className="absolute flex items-end justify-between border-b border-foreground pb-2"
      style={{ top: 40, left: 40, right: 40 }}
    >
      <div className="uppercase" style={{ fontSize: 9, letterSpacing: 1 }}>
        {galleryName}
      </div>
      <div
        className="uppercase text-muted-foreground"
        style={{ fontSize: 8, letterSpacing: 1 }}
      >
        {kindLabel}
      </div>
    </div>
  );
}
