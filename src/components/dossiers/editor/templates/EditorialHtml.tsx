import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type {
  ArtworkListItem,
  Dossier,
  DossierArtistIntro,
  DossierCustomPage,
  EditorialPageLayout,
  PageLayoutVariant,
} from "@/integrations/supabase/domain";
import { palette } from "@/lib/pdf/shared";
import { imageUrl } from "@/hooks/useArtworks";
import { buildPageSequence } from "@/lib/dossier/editorial-order";
import { EditableText } from "../EditableText";
import { EditableImageSlot } from "../EditableImageSlot";
import { PageLayoutSwitcher } from "../PageLayoutSwitcher";
import { Button } from "@/components/ui/button";

const PAGE_W = 792;
const PAGE_H = 595;
const BAND_W = 320;
const MARGIN = 40;

const FIXED_DISCLAIMER = "TAXES and transport excluded / IVA y Transporte no incluido";

type Props = {
  dossier: Dossier;
  artworks: ArtworkListItem[];
  galleryName: string;
  onUpdate: (patch: Partial<Dossier["body_blocks"]>) => void;
};

export function EditorialHtml({
  dossier,
  artworks,
  galleryName,
  onUpdate,
}: Props) {
  const accent = dossier.body_blocks.accent_color?.trim() || palette.accent;
  const showTitle = dossier.body_blocks.show_title ?? "";
  const intros = dossier.body_blocks.artist_intros ?? {};
  const layouts = dossier.body_blocks.page_layouts ?? {};
  const customPages = dossier.body_blocks.custom_pages ?? [];

  // Same helper used by EditorialPDF — single source of truth for ordering.
  const sequence = useMemo(
    () => buildPageSequence(artworks, layouts, customPages),
    [artworks, layouts, customPages],
  );

  function patchIntro(artistId: string, patch: Partial<DossierArtistIntro>) {
    onUpdate({
      artist_intros: {
        ...intros,
        [artistId]: { ...(intros[artistId] ?? {}), ...patch },
      },
    });
  }

  function setVariant(artworkId: string, variant: PageLayoutVariant, extra?: Partial<EditorialPageLayout>) {
    const next: Record<string, EditorialPageLayout> = { ...layouts };
    next[artworkId] = { ...next[artworkId], variant, ...extra };
    onUpdate({ page_layouts: next });
  }

  function clearPair(rightArtworkId: string) {
    // When unpairing, search for any layout pointing at rightArtworkId.
    const next: Record<string, EditorialPageLayout> = {};
    for (const [k, v] of Object.entries(layouts)) {
      if (v.variant === "pair_with" && v.pair_artwork_id === rightArtworkId) {
        next[k] = { variant: "image_right" };
      } else {
        next[k] = v;
      }
    }
    onUpdate({ page_layouts: next });
  }

  function addCustomPage() {
    const maxPos = customPages.reduce((m, p) => Math.max(m, p.position), -1);
    const next: DossierCustomPage = {
      id: crypto.randomUUID(),
      image_path: "",
      caption: "",
      position: maxPos + 1,
    };
    onUpdate({ custom_pages: [...customPages, next] });
  }

  function patchCustomPage(id: string, patch: Partial<DossierCustomPage>) {
    onUpdate({
      custom_pages: customPages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  }

  function deleteCustomPage(id: string) {
    onUpdate({ custom_pages: customPages.filter((p) => p.id !== id) });
  }

  return (
    <div className="space-y-4">
      {sequence.map((spec, i) => {
        if (spec.type === "cover") {
          return (
            <CoverPage
              key={`cover-${i}`}
              accent={accent}
              showTitle={(showTitle || dossier.title || "").toUpperCase()}
              artistNames={artistNamesFor(sequence)}
              onTitleChange={(v) => onUpdate({ show_title: v })}
            />
          );
        }
        if (spec.type === "artist_intro") {
          const intro = intros[spec.artist.id] ?? {};
          return (
            <ArtistIntroPage
              key={`intro-${spec.artist.id}`}
              artistName={spec.artist.name}
              intro={intro}
              dossierId={dossier.id}
              galleryName={galleryName}
              accent={accent}
              onPatch={(p) => patchIntro(spec.artist.id, p)}
            />
          );
        }
        if (spec.type === "custom") {
          return (
            <CustomPageBlock
              key={`custom-${spec.page.id}`}
              page={spec.page}
              dossierId={dossier.id}
              galleryName={galleryName}
              accent={accent}
              onPatch={(p) => patchCustomPage(spec.page.id, p)}
              onDelete={() => deleteCustomPage(spec.page.id)}
            />
          );
        }
        // Artwork page — variant-specific render
        const aw = spec.artwork;
        return (
          <ArtworkPageBlock
            key={`aw-${aw.id}`}
            artwork={aw}
            paired={spec.paired_with}
            variant={spec.variant}
            galleryName={galleryName}
            accent={accent}
            siblingArtworks={artworks.filter((x) => x.id !== aw.id)}
            onChangeVariant={(variant, extra) => setVariant(aw.id, variant, extra)}
            onClearPair={() => spec.paired_with && clearPair(spec.paired_with.id)}
            detailImageUrl={imageUrl(layouts[aw.id]?.detail_image_path)}
            onDetailUpload={(path) =>
              setVariant(aw.id, "detail_zoom", { detail_image_path: path })
            }
          />
        );
      })}

      <div className="flex items-center justify-end pt-2">
        <Button type="button" variant="outline" size="sm" onClick={addCustomPage}>
          <Plus className="h-4 w-4" />
          Add custom page
        </Button>
      </div>
    </div>
  );
}

function artistNamesFor(sequence: ReturnType<typeof buildPageSequence>) {
  return sequence
    .filter((p): p is Extract<typeof sequence[number], { type: "artist_intro" }> =>
      p.type === "artist_intro",
    )
    .map((p) => p.artist.name);
}

// ---- page blocks ---------------------------------------------------------

function Page({ children }: { children: React.ReactNode }) {
  // ResizeObserver-driven scale wrapper so PDF coords (792×595) render at any
  // preview width without divergent positioning logic.
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = outerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setScale(w / PAGE_W);
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
        aspectRatio: `${PAGE_W} / ${PAGE_H}`,
        fontFamily: "Helvetica, Arial, sans-serif",
      }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: PAGE_W,
          height: PAGE_H,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function CoverPage({
  accent,
  showTitle,
  artistNames,
  onTitleChange,
}: {
  accent: string;
  showTitle: string;
  artistNames: string[];
  onTitleChange: (next: string) => void;
}) {
  return (
    <Page>
      <div
        className="absolute inset-y-0 left-0"
        style={{ width: BAND_W, backgroundColor: accent }}
      />
      <EditableText
        value={showTitle}
        onChange={onTitleChange}
        placeholder="UPPERCASE COVER TITLE"
        ariaLabel="Show title"
        className="absolute font-bold text-white uppercase tracking-[0.18em]"
        style={{
          top: 56,
          left: MARGIN,
          width: BAND_W - MARGIN,
          fontSize: 42,
          lineHeight: 1.1,
        }}
      />
      <Slash accent={accent} />
      <div
        className="absolute flex flex-col items-end"
        style={{ right: MARGIN, bottom: 56 }}
      >
        {artistNames.map((name) => (
          <div
            key={name}
            className="font-bold underline"
            style={{ color: accent, fontSize: 14, marginTop: 2 }}
          >
            {name}
          </div>
        ))}
      </div>
    </Page>
  );
}

function Slash({ accent }: { accent: string }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
      width={PAGE_W}
      height={PAGE_H}
    >
      <line x1={240} y1={200} x2={300} y2={320} stroke="#ffffff" strokeWidth={18} strokeLinecap="butt" />
      <line x1={320} y1={360} x2={380} y2={480} stroke={accent} strokeWidth={18} strokeLinecap="butt" />
    </svg>
  );
}

function Wordmark({
  galleryName,
  white = false,
  accent,
}: {
  galleryName: string;
  white?: boolean;
  accent: string;
}) {
  const parts = galleryName.split("/").map((s) => s.trim()).filter(Boolean);
  const color = white ? "#ffffff" : "#0a0a0a";
  return (
    <div
      className="absolute uppercase"
      style={{ top: 28, left: MARGIN, fontSize: 9, letterSpacing: 2, color }}
    >
      {parts.length < 2 ? (
        galleryName
      ) : (
        <>
          {parts[0]} <span style={{ color: accent }}>/</span>{" "}
          {parts.slice(1).join(" / ")}
        </>
      )}
    </div>
  );
}

function ArtistIntroPage({
  artistName,
  intro,
  dossierId,
  galleryName,
  accent,
  onPatch,
}: {
  artistName: string;
  intro: DossierArtistIntro;
  dossierId: string;
  galleryName: string;
  accent: string;
  onPatch: (p: Partial<DossierArtistIntro>) => void;
}) {
  return (
    <Page>
      <div className="absolute inset-0 bg-neutral-900">
        <EditableImageSlot
          storagePath={intro.photo_path}
          dossierId={dossierId}
          onChange={(p) => onPatch({ photo_path: p ?? undefined })}
          fit="cover"
          alt={`${artistName} portrait`}
          className="h-full w-full border-0"
        />
        <div className="pointer-events-none absolute inset-0 bg-black/35" />
      </div>
      <Wordmark galleryName={galleryName} white accent={accent} />
      <div
        className="absolute flex flex-col items-end text-white"
        style={{ top: 28, right: MARGIN }}
      >
        <div className="font-bold uppercase tracking-wide" style={{ fontSize: 16 }}>
          {artistName.toUpperCase()}
        </div>
        <EditableText
          value={intro.instagram ?? ""}
          onChange={(v) => onPatch({ instagram: v })}
          placeholder="@handle"
          ariaLabel={`${artistName} Instagram`}
          className="text-xs"
        />
      </div>
      <div
        className="absolute grid grid-cols-2 gap-6 text-white"
        style={{ left: MARGIN, right: MARGIN, bottom: 56 }}
      >
        <div>
          <div className="mb-2 uppercase tracking-wider" style={{ fontSize: 9 }}>EN</div>
          <EditableText
            value={intro.bio_en ?? ""}
            onChange={(v) => onPatch({ bio_en: v })}
            placeholder="English bio…"
            multiline
            ariaLabel={`${artistName} bio EN`}
            className="block text-[8.5px] leading-relaxed"
          />
        </div>
        <div>
          <div className="mb-2 uppercase tracking-wider" style={{ fontSize: 9 }}>ES</div>
          <EditableText
            value={intro.bio_es ?? ""}
            onChange={(v) => onPatch({ bio_es: v })}
            placeholder="Bio en español…"
            multiline
            ariaLabel={`${artistName} bio ES`}
            className="block text-[8.5px] leading-relaxed"
          />
        </div>
      </div>
    </Page>
  );
}

function ArtworkMetaBlock({
  artwork,
  alignRight = false,
}: {
  artwork: ArtworkListItem;
  alignRight?: boolean;
}) {
  const dims = [artwork.width_cm, artwork.height_cm, artwork.depth_cm]
    .filter((n): n is number => typeof n === "number")
    .join(" x ");
  const price =
    artwork.price_eur == null
      ? ""
      : new Intl.NumberFormat("en-IE", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }).format(artwork.price_eur);
  return (
    <div className={alignRight ? "text-left" : ""}>
      {artwork.artist?.name ? (
        <div style={{ fontSize: 10 }}>{artwork.artist.name}</div>
      ) : null}
      <div className="font-bold" style={{ fontSize: 10, marginTop: 2 }}>
        {artwork.title}
        {artwork.year ? `, ${artwork.year}` : ""}
      </div>
      {artwork.medium ? (
        <div className="text-foreground/80" style={{ fontSize: 9, marginTop: 2 }}>
          {artwork.medium}
        </div>
      ) : null}
      {dims ? (
        <div className="text-foreground/80" style={{ fontSize: 9, marginTop: 2 }}>
          {dims} cm
        </div>
      ) : null}
      {price ? (
        <div className="font-bold" style={{ fontSize: 10, marginTop: 14 }}>
          {price}{" "}
          <span className="font-normal" style={{ fontSize: 8 }}>
            | {FIXED_DISCLAIMER}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ArtworkPageBlock({
  artwork,
  paired,
  variant,
  galleryName,
  accent,
  siblingArtworks,
  onChangeVariant,
  onClearPair,
  detailImageUrl,
  onDetailUpload,
}: {
  artwork: ArtworkListItem;
  paired: ArtworkListItem | undefined;
  variant: PageLayoutVariant;
  galleryName: string;
  accent: string;
  siblingArtworks: ArtworkListItem[];
  onChangeVariant: (variant: PageLayoutVariant, extra?: Partial<EditorialPageLayout>) => void;
  onClearPair: () => void;
  detailImageUrl: string | null;
  onDetailUpload: (path: string) => void;
}) {
  const [pairPickerOpen, setPairPickerOpen] = useState(false);
  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-30 flex items-center gap-2">
        {variant === "pair_with" && paired ? (
          <button
            type="button"
            onClick={onClearPair}
            className="border border-border bg-background/90 px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground hover:text-destructive"
          >
            Unpair
          </button>
        ) : null}
        <PageLayoutSwitcher
          current={variant}
          onChange={(v) => {
            if (v === "pair_with") {
              setPairPickerOpen(true);
            } else {
              onChangeVariant(v);
            }
          }}
          onPickPair={() => setPairPickerOpen(true)}
        />
      </div>
      {pairPickerOpen ? (
        <PairPicker
          siblings={siblingArtworks}
          onPick={(otherId) => {
            onChangeVariant("pair_with", { pair_artwork_id: otherId });
            setPairPickerOpen(false);
          }}
          onClose={() => setPairPickerOpen(false)}
        />
      ) : null}

      {variant === "image_right" ? (
        <Page>
          <Wordmark galleryName={galleryName} accent={accent} />
          <div
            className="absolute flex items-center justify-center"
            style={{
              top: 70,
              right: MARGIN,
              width: PAGE_W / 2 - MARGIN,
              bottom: 110,
            }}
          >
            <ArtworkImage path={artwork.primary_image?.storage_path} />
          </div>
          <div
            className="absolute"
            style={{ left: MARGIN, bottom: 50, width: PAGE_W / 2 - MARGIN * 2 }}
          >
            <ArtworkMetaBlock artwork={artwork} />
          </div>
        </Page>
      ) : null}

      {variant === "full_image" ? (
        <Page>
          <div className="absolute inset-0 bg-neutral-900">
            <FullImage path={artwork.primary_image?.storage_path} />
          </div>
          <div
            className="absolute text-white"
            style={{ left: MARGIN, bottom: 24, fontSize: 8, textShadow: "0 0 2px rgba(0,0,0,0.6)" }}
          >
            {artwork.artist?.name ? `${artwork.artist.name} — ` : ""}
            {artwork.title}
            {artwork.year ? `, ${artwork.year}` : ""}
          </div>
        </Page>
      ) : null}

      {variant === "detail_zoom" ? (
        <Page>
          <div className="absolute inset-0 bg-neutral-950" />
          <div className="absolute" style={{ top: 30, left: 30, right: 30, bottom: 30 }}>
            {detailImageUrl ? (
              <img
                src={detailImageUrl}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : (
              <ArtworkImageContained path={artwork.primary_image?.storage_path} />
            )}
          </div>
          {/* Optional: upload a different "detail" image just for this page */}
          <div className="absolute right-3 bottom-3 z-20 w-40">
            <EditableImageSlot
              storagePath={null}
              dossierId={artwork.id}
              onChange={(p) => p && onDetailUpload(p)}
              fit="contain"
              className="h-12"
              alt="Upload detail image"
            />
          </div>
        </Page>
      ) : null}

      {variant === "pair_with" && paired ? (
        <Page>
          <Wordmark galleryName={galleryName} accent={accent} />
          <div
            className="absolute flex items-center justify-center"
            style={{ top: 70, left: MARGIN, width: PAGE_W / 2 - MARGIN - 8, bottom: 110 }}
          >
            <ArtworkImage path={artwork.primary_image?.storage_path} />
          </div>
          <div
            className="absolute flex items-center justify-center"
            style={{ top: 70, right: MARGIN, width: PAGE_W / 2 - MARGIN - 8, bottom: 110 }}
          >
            <ArtworkImage path={paired.primary_image?.storage_path} />
          </div>
          <div
            className="absolute"
            style={{ left: MARGIN, bottom: 50, width: PAGE_W / 2 - MARGIN - 8 }}
          >
            <ArtworkMetaBlock artwork={artwork} />
          </div>
          <div
            className="absolute"
            style={{ right: MARGIN, bottom: 50, width: PAGE_W / 2 - MARGIN - 8 }}
          >
            <ArtworkMetaBlock artwork={paired} alignRight />
          </div>
        </Page>
      ) : null}

      {variant === "pair_with" && !paired ? (
        <Page>
          <Wordmark galleryName={galleryName} accent={accent} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">
              Pick a partner artwork from the picker (top right).
            </div>
          </div>
        </Page>
      ) : null}
    </div>
  );
}

function CustomPageBlock({
  page,
  dossierId,
  galleryName,
  accent,
  onPatch,
  onDelete,
}: {
  page: DossierCustomPage;
  dossierId: string;
  galleryName: string;
  accent: string;
  onPatch: (p: Partial<DossierCustomPage>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-30">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 border border-border bg-background/90 px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground hover:text-destructive"
          aria-label="Delete custom page"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </div>
      <Page>
        <div className="absolute inset-0 bg-neutral-900">
          <EditableImageSlot
            storagePath={page.image_path || null}
            dossierId={dossierId}
            onChange={(p) => onPatch({ image_path: p ?? "" })}
            fit="cover"
            className="h-full w-full border-0"
            alt={page.caption || "Custom page image"}
          />
        </div>
        <Wordmark galleryName={galleryName} accent={accent} />
        <EditableText
          value={page.caption ?? ""}
          onChange={(v) => onPatch({ caption: v })}
          placeholder="Caption (optional)"
          ariaLabel="Custom page caption"
          className="absolute text-white"
          style={{
            left: MARGIN,
            bottom: 24,
            fontSize: 8,
            textShadow: "0 0 2px rgba(0,0,0,0.6)",
          }}
        />
      </Page>
    </div>
  );
}

function PairPicker({
  siblings,
  onPick,
  onClose,
}: {
  siblings: ArtworkListItem[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-background/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[70vh] w-[480px] overflow-auto border border-border bg-popover p-3">
        <div className="mb-2 text-sm font-medium">Pair with…</div>
        {siblings.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            No other artworks available to pair.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {siblings.map((s) => {
              const url = imageUrl(s.primary_image?.storage_path);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onPick(s.id)}
                  className="flex flex-col items-start gap-1 border border-border p-2 text-left text-xs hover:bg-muted"
                >
                  <div className="flex h-20 w-full items-center justify-center bg-muted">
                    {url ? (
                      <img src={url} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">No image</span>
                    )}
                  </div>
                  <div className="line-clamp-1 font-medium">{s.title}</div>
                  <div className="line-clamp-1 text-[10px] text-muted-foreground">
                    {s.artist?.name ?? "—"}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-3 text-right">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---- image render helpers (HTML) -----------------------------------------

function ArtworkImage({ path }: { path: string | null | undefined }) {
  const url = imageUrl(path);
  if (!url) {
    return (
      <div
        className="flex items-center justify-center bg-muted text-xs text-muted-foreground"
        style={{ width: 240, height: 320 }}
      >
        No image
      </div>
    );
  }
  return <img src={url} alt="" className="max-h-full max-w-full object-contain" />;
}

function ArtworkImageContained({ path }: { path: string | null | undefined }) {
  const url = imageUrl(path);
  if (!url)
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
        No image
      </div>
    );
  return <img src={url} alt="" className="h-full w-full object-contain" />;
}

function FullImage({ path }: { path: string | null | undefined }) {
  const url = imageUrl(path);
  if (!url)
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-white/60">
        No image — drop one on the artwork
      </div>
    );
  return <img src={url} alt="" className="h-full w-full object-cover" />;
}
