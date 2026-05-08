import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

// Full-screen click-to-zoom overlay. A single instance is mounted at the
// app root; any image surface calls `useLightbox().open({ src })` (or pass
// a list + index for prev/next paging). Esc / backdrop / × close. Arrow
// keys page when a list is provided. Pure presentation — no data fetching.

type LightboxImage = { src: string; alt?: string };

type OpenArgs = {
  src?: string;
  alt?: string;
  images?: LightboxImage[];
  index?: number;
};

type Ctx = { open: (args: OpenArgs) => void };

const LightboxContext = createContext<Ctx | null>(null);

export function useLightbox() {
  const ctx = useContext(LightboxContext);
  if (!ctx) throw new Error("useLightbox must be used inside <LightboxProvider>");
  return ctx;
}

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [images, setImages] = useState<LightboxImage[] | null>(null);
  const [index, setIndex] = useState(0);

  const open = useCallback((args: OpenArgs) => {
    const list =
      args.images && args.images.length > 0
        ? args.images
        : args.src
        ? [{ src: args.src, alt: args.alt }]
        : [];
    if (list.length === 0) return;
    setImages(list);
    setIndex(Math.max(0, Math.min(args.index ?? 0, list.length - 1)));
  }, []);

  const close = useCallback(() => setImages(null), []);

  const prev = useCallback(() => {
    setIndex((i) => (images ? (i - 1 + images.length) % images.length : 0));
  }, [images]);

  const next = useCallback(() => {
    setIndex((i) => (images ? (i + 1) % images.length : 0));
  }, [images]);

  useEffect(() => {
    if (!images) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [images, close, prev, next]);

  const value = useMemo<Ctx>(() => ({ open }), [open]);

  return (
    <LightboxContext.Provider value={value}>
      {children}
      {images
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              onClick={close}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                }}
                aria-label="Close"
                className="absolute right-4 top-4 rounded-sm border border-white/30 bg-black/40 p-2 text-white/90 hover:bg-black/70"
              >
                <X className="h-5 w-5" />
              </button>
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      prev();
                    }}
                    aria-label="Previous"
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-sm border border-white/30 bg-black/40 p-2 text-white/90 hover:bg-black/70"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      next();
                    }}
                    aria-label="Next"
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-sm border border-white/30 bg-black/40 p-2 text-white/90 hover:bg-black/70"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-sm bg-black/60 px-3 py-1 text-xs text-white/80">
                    {index + 1} / {images.length}
                  </div>
                </>
              ) : null}
              <img
                key={index}
                src={images[index].src}
                alt={images[index].alt ?? ""}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[95vh] max-w-[95vw] object-contain"
              />
            </div>,
            document.body,
          )
        : null}
    </LightboxContext.Provider>
  );
}
