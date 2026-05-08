import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ArtworkListItem,
  Dossier,
  DossierArtistIntro,
} from "@/integrations/supabase/domain";
import { palette } from "@/lib/pdf/shared";
import { imageUrl } from "@/hooks/useArtworks";
import { EditableText } from "../EditableText";
import { EditableImageSlot } from "../EditableImageSlot";

// HTML mirror of EditorialPDF. Same A4-landscape aspect, same slots, same
// typography family. Renders editable in the live preview; the source of
// truth is the Dossier object, mutated via the on*Change callbacks. The
// PDF export reads the same Dossier data — no divergent state.

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

  // Group artworks by canonical artist name (mirrors EditorialPDF).
  const artists = useMemo(() => {
    type G = { id: string; name: string; artworks: ArtworkListItem[] };
    const byName = new Map<string, G>();
    for (const a of artworks) {
      if (!a.artist) continue;
      const key = a.artist.name.trim().toLowerCase();
      const existing = byName.get(key);
      if (existing) existing.artworks.push(a);
      else
        byName.set(key, {
          id: a.artist.id,
          name: a.artist.name,
          artworks: [a],
        });
    }
    return Array.from(byName.values());
  }, [artworks]);

  function patchIntro(artistId: string, patch: Partial<DossierArtistIntro>) {
    onUpdate({
      artist_intros: {
        ...intros,
        [artistId]: { ...(intros[artistId] ?? {}), ...patch },
      },
    });
  }

  return (
    <div className="space-y-4">
      {/* Cover */}
      <Page>
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: BAND_W, backgroundColor: accent }}
        />
        <EditableText
          value={(showTitle || dossier.title || "").toUpperCase()}
          onChange={(v) => onUpdate({ show_title: v })}
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
        {/* Broken slash — colinear segments straddling the band edge. */}
        <Slash accent={accent} />
        {/* Artist names bottom-right */}
        <div
          className="absolute flex flex-col items-end"
          style={{ right: MARGIN, bottom: 56 }}
        >
          {artists.map((a) => (
            <div
              key={a.id}
              className="font-bold underline"
              style={{ color: accent, fontSize: 14, marginTop: 2 }}
            >
              {a.name}
            </div>
          ))}
          {artists.length === 0 ? (
            <div
              className="text-xs italic"
              style={{ color: accent, opacity: 0.7 }}
            >
              Add artworks to populate the artist list.
            </div>
          ) : null}
        </div>
      </Page>

      {/* Per-artist intro + artwork pages */}
      {artists.map((artist) => {
        const intro = intros[artist.id] ?? {};
        return (
          <div key={artist.id} className="space-y-4">
            <ArtistIntroPage
              artistName={artist.name}
              intro={intro}
              dossierId={dossier.id}
              galleryName={galleryName}
              accent={accent}
              onPatch={(p) => patchIntro(artist.id, p)}
            />
            {artist.artworks.map((aw) => (
              <ArtworkPageHtml
                key={aw.id}
                artwork={aw}
                galleryName={galleryName}
                accent={accent}
              />
            ))}
          </div>
        );
      })}

    </div>
  );
}

// ---- pieces ---------------------------------------------------------------

function Page({ children }: { children: React.ReactNode }) {
  // Fixed-aspect A4 landscape "page" — inner content uses raw PDF pixel
  // coords (792x595) and is scaled to the responsive parent via
  // transform:scale + ResizeObserver. This keeps per-element positioning
  // identical to the PDF template (one source of truth for slot positions).
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

function Slash({ accent }: { accent: string }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
      width={PAGE_W}
      height={PAGE_H}
    >
      <line
        x1={240}
        y1={200}
        x2={300}
        y2={320}
        stroke="#ffffff"
        strokeWidth={18}
        strokeLinecap="butt"
      />
      <line
        x1={320}
        y1={360}
        x2={380}
        y2={480}
        stroke={accent}
        strokeWidth={18}
        strokeLinecap="butt"
      />
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
      style={{
        top: 28,
        left: MARGIN,
        fontSize: 9,
        letterSpacing: 2,
        color,
      }}
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
  onPatch: (patch: Partial<DossierArtistIntro>) => void;
}) {
  return (
    <Page>
      {/* Background photo slot fills the page */}
      <div className="absolute inset-0 bg-neutral-900">
        <EditableImageSlot
          storagePath={intro.photo_path}
          dossierId={dossierId}
          onChange={(p) => onPatch({ photo_path: p ?? undefined })}
          fit="cover"
          alt={`${artistName} portrait`}
          className="h-full w-full border-0"
        />
        {/* Dim scrim so white text reads */}
        <div className="pointer-events-none absolute inset-0 bg-black/35" />
      </div>
      <Wordmark galleryName={galleryName} white accent={accent} />
      <div
        className="absolute flex flex-col items-end text-white"
        style={{ top: 28, right: MARGIN }}
      >
        <div
          className="font-bold uppercase tracking-wide"
          style={{ fontSize: 16 }}
        >
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
          <div
            className="mb-2 uppercase tracking-wider"
            style={{ fontSize: 9 }}
          >
            EN
          </div>
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
          <div
            className="mb-2 uppercase tracking-wider"
            style={{ fontSize: 9 }}
          >
            ES
          </div>
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

function ArtworkPageHtml({
  artwork,
  galleryName,
  accent,
}: {
  artwork: ArtworkListItem;
  galleryName: string;
  accent: string;
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
        <div className="max-h-full max-w-full">
          <ArtworkImage path={artwork.primary_image?.storage_path} />
        </div>
      </div>
      <div
        className="absolute"
        style={{
          left: MARGIN,
          bottom: 50,
          width: PAGE_W / 2 - MARGIN * 2,
        }}
      >
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
    </Page>
  );
}

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
