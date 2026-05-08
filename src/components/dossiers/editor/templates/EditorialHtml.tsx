import { useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { DraggableTextBlock } from "../DraggableTextBlock";
import { PageScaleContext } from "../PageScaleContext";
import { htmlToPlain, plainToHtml } from "@/lib/dossier/rich-text";
import { EditableImageSlot } from "../EditableImageSlot";
import { PageLayoutSwitcher } from "../PageLayoutSwitcher";
import { Button } from "@/components/ui/button";

const PAGE_W = 792;
const PAGE_H = 595;
const BAND_W = 341.2;
const MARGIN = 40;

const FIXED_DISCLAIMER = "TAXES and transport excluded / IVA y Transporte no incluido";

type Props = {
  dossier: Dossier;
  artworks: ArtworkListItem[];
  galleryName: string;
  onUpdate: (patch: Partial<Dossier["body_blocks"]>) => void;
  onUpdateLayout: (next: string[]) => void;
};

export function EditorialHtml({
  dossier,
  artworks,
  galleryName,
  onUpdate,
  onUpdateLayout,
}: Props) {
  const accent = dossier.body_blocks.accent_color?.trim() || palette.accent;
  const showTitle = dossier.body_blocks.show_title ?? "";
  const intros = dossier.body_blocks.artist_intros ?? {};
  const layouts = dossier.body_blocks.page_layouts ?? {};
  const customPages = dossier.body_blocks.custom_pages ?? [];
  const textOffsets = dossier.body_blocks.text_offsets ?? {};

  function setOffset(blockKey: string, next: { x: number; y: number }) {
    const map: Record<string, { x: number; y: number }> = { ...textOffsets };
    if (next.x === 0 && next.y === 0) {
      delete map[blockKey];
    } else {
      map[blockKey] = next;
    }
    onUpdate({ text_offsets: map });
  }

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

  // Drag-to-reorder. Two independent SortableContexts so artworks don't
  // accidentally swap with custom pages: artwork ids drive image_layout,
  // custom-page ids drive position renumbering.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );
  const artworkIds = useMemo(() => artworks.map((a) => a.id), [artworks]);
  const customIds = useMemo(
    () => [...customPages].sort((a, b) => a.position - b.position).map((p) => p.id),
    [customPages],
  );
  function handleArtworkDrag(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = artworkIds.indexOf(String(active.id));
    const newIndex = artworkIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onUpdateLayout(arrayMove(artworkIds, oldIndex, newIndex));
  }
  function handleCustomDrag(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = customIds.indexOf(String(active.id));
    const newIndex = customIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(customIds, oldIndex, newIndex);
    const byId = new Map(customPages.map((p) => [p.id, p]));
    onUpdate({
      custom_pages: reordered.map((id, idx) => ({
        ...(byId.get(id) as DossierCustomPage),
        position: idx,
      })),
    });
  }

  // Split sequence into the three sections so each gets its own DndContext.
  const coverSpec = sequence.find((s) => s.type === "cover");
  const artistAndArtworkSpecs = sequence.filter(
    (s) => s.type === "artist_intro" || s.type === "artwork",
  );
  const customSpecs = sequence.filter((s) => s.type === "custom");

  const watermark = dossier.body_blocks.watermark?.trim() || "";
  const disclaimer = dossier.body_blocks.disclaimer ?? FIXED_DISCLAIMER;
  function onDisclaimerChange(next: string) {
    onUpdate({ disclaimer: next });
  }

  return (
    <div className="space-y-4">
      {coverSpec ? (
        <CoverPage
          accent={accent}
          showTitle={(showTitle || dossier.title || "").toUpperCase()}
          showTitleHtml={dossier.body_blocks.show_title_html ?? ""}
          artistNames={artistNamesFor(sequence)}
          textOffsets={textOffsets}
          setOffset={setOffset}
          watermark={watermark}
          onTitleChange={(plain, html) =>
            onUpdate({ show_title: plain, show_title_html: html })
          }
        />
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleArtworkDrag}
      >
        <SortableContext items={artworkIds} strategy={rectSortingStrategy}>
          {artistAndArtworkSpecs.map((spec) => {
            if (spec.type === "artist_intro") {
              const intro = intros[spec.artist.id] ?? {};
              return (
                <ArtistIntroPage
                  key={`intro-${spec.artist.id}`}
                  artistId={spec.artist.id}
                  artistName={spec.artist.name}
                  intro={intro}
                  dossierId={dossier.id}
                  galleryName={galleryName}
                  accent={accent}
                  textOffsets={textOffsets}
                  setOffset={setOffset}
                  watermark={watermark}
                  onPatch={(p) => patchIntro(spec.artist.id, p)}
                />
              );
            }
            const aw = spec.artwork;
            return (
              <SortableArtworkPage
                key={`aw-${aw.id}`}
                artwork={aw}
                paired={spec.paired_with}
                variant={spec.variant}
                galleryName={galleryName}
                accent={accent}
                siblingArtworks={artworks.filter((x) => x.id !== aw.id)}
                textOffsets={textOffsets}
                setOffset={setOffset}
                watermark={watermark}
                disclaimer={disclaimer}
                onDisclaimerChange={onDisclaimerChange}
                onChangeVariant={(variant, extra) => setVariant(aw.id, variant, extra)}
                onClearPair={() => spec.paired_with && clearPair(spec.paired_with.id)}
                detailImageUrl={imageUrl(layouts[aw.id]?.detail_image_path)}
                onDetailUpload={(path) =>
                  setVariant(aw.id, "detail_zoom", { detail_image_path: path })
                }
              />
            );
          })}
        </SortableContext>
      </DndContext>

      {customSpecs.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCustomDrag}
        >
          <SortableContext items={customIds} strategy={rectSortingStrategy}>
            {customSpecs.map((spec) =>
              spec.type === "custom" ? (
                <SortableCustomPage
                  key={`custom-${spec.page.id}`}
                  page={spec.page}
                  dossierId={dossier.id}
                  galleryName={galleryName}
                  accent={accent}
                  watermark={watermark}
                  onPatch={(p) => patchCustomPage(spec.page.id, p)}
                  onDelete={() => deleteCustomPage(spec.page.id)}
                />
              ) : null,
            )}
          </SortableContext>
        </DndContext>
      ) : null}

      <div className="flex items-center justify-end pt-2">
        <Button type="button" variant="outline" size="sm" onClick={addCustomPage}>
          <Plus className="h-4 w-4" />
          Add custom page
        </Button>
      </div>
    </div>
  );
}

// Wrappers — apply useSortable on top of the existing page blocks so the
// page itself is the drag target. The grip handle (top-left) is the only
// drag activator; all the inner click-to-edit affordances stay clickable.

function SortableArtworkPage(
  props: React.ComponentProps<typeof ArtworkPageBlock> & { artwork: ArtworkListItem },
) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.artwork.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative">
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label="Drag to reorder"
        className="absolute left-2 top-2 z-30 cursor-grab border border-border bg-background/90 p-1 text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <ArtworkPageBlock {...props} />
    </div>
  );
}

function SortableCustomPage(
  props: React.ComponentProps<typeof CustomPageBlock> & { page: DossierCustomPage },
) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.page.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative">
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label="Drag to reorder"
        className="absolute left-2 top-2 z-30 cursor-grab border border-border bg-background/90 p-1 text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <CustomPageBlock {...props} />
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

function Page({
  children,
  watermark,
}: {
  children: React.ReactNode;
  watermark?: string;
}) {
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
        <PageScaleContext.Provider value={scale}>
          {children}
          {watermark ? <WatermarkOverlay text={watermark} /> : null}
        </PageScaleContext.Provider>
      </div>
    </div>
  );
}

// Diagonal watermark stamped on every page when set. Sits above content but
// pointer-events:none so it never blocks edit affordances. Single-line, scaled
// to the page diagonal so DRAFT / CONFIDENTIAL / RESERVED all read clearly.
function WatermarkOverlay({ text }: { text: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-hidden"
    >
      <div
        style={{
          transform: "rotate(-30deg)",
          color: "rgba(0,0,0,0.10)",
          fontSize: 110,
          fontWeight: 700,
          letterSpacing: 12,
          whiteSpace: "nowrap",
          textTransform: "uppercase",
          userSelect: "none",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        {text}
      </div>
    </div>
  );
}

function CoverPage({
  accent,
  showTitle,
  showTitleHtml,
  artistNames,
  textOffsets,
  setOffset,
  watermark,
  onTitleChange,
}: {
  accent: string;
  showTitle: string;
  showTitleHtml: string;
  artistNames: string[];
  textOffsets: Record<string, { x: number; y: number }>;
  setOffset: (key: string, next: { x: number; y: number }) => void;
  watermark: string;
  onTitleChange: (plain: string, html: string) => void;
}) {
  const titleKey = "cover.title";
  const artistsKey = "cover.artists";
  const titleOffset = textOffsets[titleKey] ?? { x: 0, y: 0 };
  const artistsOffset = textOffsets[artistsKey] ?? { x: 0, y: 0 };
  // Rich-mode title: the toolbar's font-family / size / color / B / I / U
  // controls all act on the same contentEditable, so the user can finally
  // change the title's appearance. The previous outlined-SVG render had
  // the glyphs hard-coded at 42pt Inter Bold and ignored the toolbar.
  return (
    <Page watermark={watermark}>
      <div
        className="absolute inset-y-0 left-0"
        style={{ width: BAND_W, backgroundColor: accent }}
      />
      {/* Outer wrapper carries the absolute page-level positioning so the
          DraggableTextBlock inside can stay in normal flow (its translate
          transform applies on top of where the outer puts it). Critical:
          flipping the order breaks the layout because DraggableTextBlock
          has zero height when its only child is absolute, so bottom:N
          renders at -N of the page. */}
      <div
        className="absolute"
        style={{ top: 56, left: MARGIN, width: BAND_W - MARGIN, minHeight: 60 }}
      >
        <DraggableTextBlock
          blockKey={titleKey}
          offset={titleOffset}
          onCommit={(next) => setOffset(titleKey, next)}
          onReset={() => setOffset(titleKey, { x: 0, y: 0 })}
        >
          <EditableText
            value={showTitleHtml || plainToHtml(showTitle)}
            onChange={(v) => onTitleChange(htmlToPlain(v), v)}
            placeholder="UPPERCASE COVER TITLE"
            ariaLabel="Show title"
            multiline
            rich
            className="block font-bold uppercase tracking-[0.18em] text-white"
            style={{
              fontSize: 42,
              lineHeight: 1.1,
            }}
          />
        </DraggableTextBlock>
      </div>
      <Slash accent={accent} />
      <div
        className="absolute flex flex-col items-end"
        style={{ right: MARGIN, bottom: 60 }}
      >
        <DraggableTextBlock
          blockKey={artistsKey}
          offset={artistsOffset}
          onCommit={(next) => setOffset(artistsKey, next)}
          onReset={() => setOffset(artistsKey, { x: 0, y: 0 })}
        >
          {artistNames.map((name) => (
            <div
              key={name}
              style={{
                color: accent,
                fontSize: 16,
                marginTop: 2,
                fontWeight: 700,
                lineHeight: 1,
                textDecoration: "underline",
                textTransform: "uppercase",
              }}
            >
              {name}
            </div>
          ))}
        </DraggableTextBlock>
      </div>
    </Page>
  );
}

function Slash({ accent }: { accent: string }) {
  // Use the reference slash's exact centerline, then split it at the band
  // seam so the midpoint is locked to the red/white join.
  const x1 = 385.95;
  const y1 = 226.06;
  const x2 = 296.48;
  const y2 = 399.43;
  const sw = 17.85;
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
      width={PAGE_W}
      height={PAGE_H}
    >
      <defs>
        <clipPath id="slash-band-clip">
          <rect x={0} y={0} width={BAND_W} height={PAGE_H} />
        </clipPath>
        <clipPath id="slash-white-clip">
          <rect x={BAND_W} y={0} width={PAGE_W - BAND_W} height={PAGE_H} />
        </clipPath>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#ffffff"
        strokeWidth={sw}
        strokeLinecap="butt"
        clipPath="url(#slash-band-clip)"
      />
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={accent}
        strokeWidth={sw}
        strokeLinecap="butt"
        clipPath="url(#slash-white-clip)"
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

// Single-line editable language label (default "EN" / "ES"). When the
// value is non-empty a hover-revealed × button hides it (sets value to
// ""); when empty, the field renders as a faint "+ label" placeholder
// the user can click to type a new label. So both directions
// (delete + restore) are explicit and discoverable.
function BioLangLabel({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
}) {
  if (value.trim() === "") {
    return (
      <EditableText
        value=""
        onChange={onChange}
        placeholder="+ label"
        ariaLabel={ariaLabel}
        className="mb-2 block uppercase tracking-wider text-white/40"
        style={{ fontSize: 9, minHeight: 11 }}
      />
    );
  }
  return (
    <div className="group/label relative mb-2 inline-flex items-start">
      <EditableText
        value={value}
        onChange={onChange}
        placeholder="EN"
        ariaLabel={ariaLabel}
        className="uppercase tracking-wider"
        style={{ fontSize: 9 }}
      />
      <button
        type="button"
        onClick={() => onChange("")}
        onMouseDown={(e) => e.preventDefault()}
        title="Hide label"
        aria-label="Hide label"
        className="absolute -right-5 -top-1 z-20 flex h-4 w-4 items-center justify-center border border-border bg-background text-foreground opacity-0 transition-opacity group-hover/label:opacity-100 hover:text-destructive focus-visible:opacity-100"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

function ArtistIntroPage({
  artistId,
  artistName,
  intro,
  dossierId,
  galleryName,
  accent,
  textOffsets,
  setOffset,
  watermark,
  onPatch,
}: {
  artistId: string;
  artistName: string;
  intro: DossierArtistIntro;
  dossierId: string;
  galleryName: string;
  accent: string;
  textOffsets: Record<string, { x: number; y: number }>;
  setOffset: (key: string, next: { x: number; y: number }) => void;
  watermark: string;
  onPatch: (p: Partial<DossierArtistIntro>) => void;
}) {
  // Stable slot keys + their saved offsets. Read once per render.
  const nameKey = `intro.${artistId}.name`;
  const handleKey = `intro.${artistId}.handle`;
  const bioEnKey = `intro.${artistId}.bio_en`;
  const bioEsKey = `intro.${artistId}.bio_es`;
  const nameOffset = textOffsets[nameKey] ?? { x: 0, y: 0 };
  const handleOffset = textOffsets[handleKey] ?? { x: 0, y: 0 };
  const bioEnOffset = textOffsets[bioEnKey] ?? { x: 0, y: 0 };
  const bioEsOffset = textOffsets[bioEsKey] ?? { x: 0, y: 0 };

  return (
    <Page watermark={watermark}>
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
        <DraggableTextBlock
          blockKey={nameKey}
          offset={nameOffset}
          onCommit={(next) => setOffset(nameKey, next)}
          onReset={() => setOffset(nameKey, { x: 0, y: 0 })}
        >
          <div className="font-bold uppercase tracking-wide" style={{ fontSize: 16 }}>
            {artistName.toUpperCase()}
          </div>
        </DraggableTextBlock>
        <DraggableTextBlock
          blockKey={handleKey}
          offset={handleOffset}
          onCommit={(next) => setOffset(handleKey, next)}
          onReset={() => setOffset(handleKey, { x: 0, y: 0 })}
        >
          <EditableText
            value={intro.instagram ?? ""}
            onChange={(v) => onPatch({ instagram: v })}
            placeholder="@handle"
            ariaLabel={`${artistName} Instagram`}
            className="text-xs"
          />
        </DraggableTextBlock>
      </div>
      <div
        className="absolute grid grid-cols-2 gap-6 text-white"
        style={{ left: MARGIN, right: MARGIN, bottom: 56 }}
      >
        <DraggableTextBlock
          blockKey={bioEnKey}
          offset={bioEnOffset}
          onCommit={(next) => setOffset(bioEnKey, next)}
          onReset={() => setOffset(bioEnKey, { x: 0, y: 0 })}
        >
          <BioLangLabel
            value={intro.bio_en_label ?? "EN"}
            onChange={(v) => onPatch({ bio_en_label: v })}
            ariaLabel={`${artistName} EN label`}
          />
          <EditableText
            value={intro.bio_en_html ?? plainToHtml(intro.bio_en ?? "")}
            onChange={(v) => onPatch({ bio_en_html: v, bio_en: htmlToPlain(v) })}
            placeholder="English bio…"
            multiline
            rich
            lang="en"
            ariaLabel={`${artistName} bio EN`}
            className="block text-[8.5px] leading-relaxed"
          />
        </DraggableTextBlock>
        <DraggableTextBlock
          blockKey={bioEsKey}
          offset={bioEsOffset}
          onCommit={(next) => setOffset(bioEsKey, next)}
          onReset={() => setOffset(bioEsKey, { x: 0, y: 0 })}
        >
          <BioLangLabel
            value={intro.bio_es_label ?? "ES"}
            onChange={(v) => onPatch({ bio_es_label: v })}
            ariaLabel={`${artistName} ES label`}
          />
          <EditableText
            value={intro.bio_es_html ?? plainToHtml(intro.bio_es ?? "")}
            onChange={(v) => onPatch({ bio_es_html: v, bio_es: htmlToPlain(v) })}
            placeholder="Bio en español…"
            multiline
            rich
            lang="es"
            ariaLabel={`${artistName} bio ES`}
            className="block text-[8.5px] leading-relaxed"
          />
        </DraggableTextBlock>
      </div>
    </Page>
  );
}

function ArtworkMetaBlock({
  artwork,
  alignRight = false,
  disclaimer,
  onDisclaimerChange,
}: {
  artwork: ArtworkListItem;
  alignRight?: boolean;
  disclaimer: string;
  onDisclaimerChange: (next: string) => void;
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
          <span>{price}</span>
          {disclaimer.trim() ? <span className="font-normal" style={{ fontSize: 8 }}> | </span> : null}
          {/* Editable disclaimer with a hover-revealed × button that
              clears it (hides both the leading pipe and the chip). When
              empty, the field renders as a "+ disclaimer" placeholder
              the user can click to type one back. */}
          <span className="group/disclaimer relative inline-flex items-start">
            <EditableText
              value={disclaimer}
              onChange={onDisclaimerChange}
              placeholder="+ disclaimer"
              ariaLabel="Price disclaimer"
              className="font-normal"
              style={{ fontSize: 8, display: "inline-block", verticalAlign: "baseline" }}
            />
            {disclaimer.trim() ? (
              <button
                type="button"
                onClick={() => onDisclaimerChange("")}
                onMouseDown={(e) => e.preventDefault()}
                title="Hide disclaimer"
                aria-label="Hide disclaimer"
                className="absolute -right-5 -top-1 z-20 flex h-4 w-4 items-center justify-center border border-border bg-background text-foreground opacity-0 transition-opacity group-hover/disclaimer:opacity-100 hover:text-destructive focus-visible:opacity-100"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            ) : null}
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
  textOffsets,
  setOffset,
  watermark,
  disclaimer,
  onDisclaimerChange,
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
  textOffsets: Record<string, { x: number; y: number }>;
  setOffset: (key: string, next: { x: number; y: number }) => void;
  watermark: string;
  disclaimer: string;
  onDisclaimerChange: (next: string) => void;
  onChangeVariant: (variant: PageLayoutVariant, extra?: Partial<EditorialPageLayout>) => void;
  onClearPair: () => void;
  detailImageUrl: string | null;
  onDetailUpload: (path: string) => void;
}) {
  const [pairPickerOpen, setPairPickerOpen] = useState(false);
  // Each artwork's meta block has one stable slot keyed by artwork id; the
  // same key lands wherever the artwork's meta is rendered (image_right or
  // pair_with). PDF reads it from the same map, so preview and export move
  // in lockstep.
  const metaKey = `artwork.${artwork.id}.meta`;
  const metaOffset = textOffsets[metaKey] ?? { x: 0, y: 0 };
  const pairedMetaKey = paired ? `artwork.${paired.id}.meta` : null;
  const pairedMetaOffset = pairedMetaKey ? textOffsets[pairedMetaKey] ?? { x: 0, y: 0 } : { x: 0, y: 0 };
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
        <Page watermark={watermark}>
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
            <DraggableTextBlock
              blockKey={metaKey}
              offset={metaOffset}
              onCommit={(next) => setOffset(metaKey, next)}
              onReset={() => setOffset(metaKey, { x: 0, y: 0 })}
            >
              <ArtworkMetaBlock
                artwork={artwork}
                disclaimer={disclaimer}
                onDisclaimerChange={onDisclaimerChange}
              />
            </DraggableTextBlock>
          </div>
        </Page>
      ) : null}

      {variant === "full_image" ? (
        <Page watermark={watermark}>
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
        <Page watermark={watermark}>
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
        <Page watermark={watermark}>
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
            <DraggableTextBlock
              blockKey={metaKey}
              offset={metaOffset}
              onCommit={(next) => setOffset(metaKey, next)}
              onReset={() => setOffset(metaKey, { x: 0, y: 0 })}
            >
              <ArtworkMetaBlock
                artwork={artwork}
                disclaimer={disclaimer}
                onDisclaimerChange={onDisclaimerChange}
              />
            </DraggableTextBlock>
          </div>
          {pairedMetaKey ? (
            <div
              className="absolute"
              style={{ right: MARGIN, bottom: 50, width: PAGE_W / 2 - MARGIN - 8 }}
            >
              <DraggableTextBlock
                blockKey={pairedMetaKey}
                offset={pairedMetaOffset}
                onCommit={(next) => setOffset(pairedMetaKey, next)}
                onReset={() => setOffset(pairedMetaKey, { x: 0, y: 0 })}
              >
                <ArtworkMetaBlock
                  artwork={paired}
                  alignRight
                  disclaimer={disclaimer}
                  onDisclaimerChange={onDisclaimerChange}
                />
              </DraggableTextBlock>
            </div>
          ) : null}
        </Page>
      ) : null}

      {variant === "pair_with" && !paired ? (
        <Page watermark={watermark}>
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
  watermark,
  onPatch,
  onDelete,
}: {
  page: DossierCustomPage;
  dossierId: string;
  galleryName: string;
  accent: string;
  watermark: string;
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
      <Page watermark={watermark}>
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
