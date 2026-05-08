import { Suspense, lazy, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ArtworkSheetPDFProps } from "@/lib/pdf/ArtworkSheetPDF";

const PrintSheetPanel = lazy(() => import("./PrintSheetPanel"));

// Fullscreen-ish overlay with a PDF preview. Users print or download via
// the PDFViewer's built-in toolbar.
export function PrintSheetModal({
  artwork,
  galleryName,
  imageUrlFor,
  onClose,
}: ArtworkSheetPDFProps & { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background/95 p-4"
      role="dialog"
      aria-label={`Print preview — ${artwork.title}`}
    >
      <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
        <div className="text-sm">
          <span className="font-medium">{artwork.title}</span>
          <span className="text-muted-foreground"> · {artwork.internal_id}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" /> Close
        </Button>
      </div>
      <div className="min-h-0 flex-1 border border-border">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading preview…
            </div>
          }
        >
          <PrintSheetPanel
            artwork={artwork}
            galleryName={galleryName}
            imageUrlFor={imageUrlFor}
          />
        </Suspense>
      </div>
    </div>
  );
}
