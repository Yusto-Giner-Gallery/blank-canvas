import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/lib/utils";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Maximize2, Send, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useDeleteDossier,
  useDossier,
  useDossierArtworks,
  useUpdateDossier,
} from "@/hooks/useDossiers";
import { useProfile } from "@/hooks/useProfile";
import { useArtworks, imageUrl } from "@/hooks/useArtworks";
import { useGallery } from "@/hooks/useGallery";
import { useTitleSvgPath } from "@/hooks/useTitleSvgPath";
import { ImageLayoutGrid } from "@/components/dossiers/ImageLayoutGrid";
import { ArtworkDescriptionEditor } from "@/components/dossiers/ArtworkDescriptionEditor";
import { EditorialIntrosEditor } from "@/components/dossiers/EditorialIntrosEditor";
import { SendToContactsModal } from "@/components/dossiers/SendToContactsModal";
import { AICorrectionOverlay } from "@/components/dossiers/AICorrectionOverlay";
import {
  HtmlEditorPreview,
  hasHtmlEditor,
} from "@/components/dossiers/editor/HtmlEditorPreview";
import type {
  Dossier,
  DossierArtistIntro,
  DossierKind,
} from "@/integrations/supabase/domain";

const PdfPanel = lazy(() => import("@/components/dossiers/PdfPanel"));

const KIND_OPTIONS: Array<{ value: DossierKind; label: string }> = [
  { value: "solo_show", label: "Solo show" },
  { value: "group_show", label: "Group show" },
  { value: "special", label: "Special (extra text)" },
  { value: "art_fair", label: "Art fair" },
  { value: "collector_offer", label: "Collector offer" },
  { value: "editorial", label: "Editorial (PARALLELS layout)" },
];

export default function DossierEditor() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dossierQuery = useDossier(id);
  const artworksQuery = useArtworks();
  const update = useUpdateDossier();
  const del = useDeleteDossier();
  const { isAdmin } = useProfile();
  const galleryQuery = useGallery();
  const galleryName = galleryQuery.data?.name ?? "Gallery";

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<DossierKind>("solo_show");
  const [intro, setIntro] = useState("");
  const [extra, setExtra] = useState("");
  const [showTitle, setShowTitle] = useState("");
  const [showTitleHtml, setShowTitleHtml] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [watermark, setWatermark] = useState("");
  // `undefined` lets the renderer fall back to the default
  // "TAXES and transport excluded …" string. Once the user touches the
  // disclaimer (including deleting it) we persist the value as-is, even
  // an empty string, so the PDF reflects their intent.
  const [disclaimer, setDisclaimer] = useState<string | undefined>(undefined);
  const [artistIntros, setArtistIntros] = useState<Record<string, DossierArtistIntro>>({});
  const [pageLayouts, setPageLayouts] = useState<NonNullable<Dossier["body_blocks"]["page_layouts"]>>({});
  const [customPages, setCustomPages] = useState<NonNullable<Dossier["body_blocks"]["custom_pages"]>>([]);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [layout, setLayout] = useState<string[]>([]);
  const [fillingHardcoded, setFillingHardcoded] = useState(false);
  const [sending, setSending] = useState(false);
  const [reviewing, setReviewing] = useState<{ context: string; text: string } | null>(null);
  const [previewMode, setPreviewMode] = useState<"edit" | "pdf">("edit");
  // 3.3: full-screen enlarge of the live PDF preview (incl. the price list)
  // before downloading.
  const [enlarged, setEnlarged] = useState(false);

  // Hydrate local state from server data once.
  useEffect(() => {
    if (!dossierQuery.data) return;
    const d = dossierQuery.data;
    setTitle(d.title);
    setKind(d.kind);
    setIntro(d.body_blocks.intro ?? "");
    setExtra(d.body_blocks.extra ?? "");
    setShowTitle(d.body_blocks.show_title ?? "");
    setShowTitleHtml(d.body_blocks.show_title_html ?? "");
    setAccentColor(d.body_blocks.accent_color ?? "");
    setWatermark(d.body_blocks.watermark ?? "");
    setDisclaimer(d.body_blocks.disclaimer);
    setArtistIntros(d.body_blocks.artist_intros ?? {});
    setPageLayouts(d.body_blocks.page_layouts ?? {});
    setCustomPages(d.body_blocks.custom_pages ?? []);
    setDescriptions(d.body_blocks.artwork_descriptions ?? {});
    setLayout(d.image_layout);
  }, [dossierQuery.data]);

  const artworks = useDossierArtworks(layout, artworksQuery.data);

  // Outlined title path for the editorial cover. Async-loads Inter-Bold via
  // opentype.js once and re-derives the SVG path whenever the title text /
  // font sizing changes. null until the font is parsed → cover falls back
  // to solid white text.
  const editorialTitleText = (kind === "editorial"
    ? (showTitle || title || "")
    : ""
  ).toUpperCase();
  const titlePath = useTitleSvgPath(editorialTitleText, 42, 3);

  // Unique artists for the editorial-only intro panel. Dedup is by
  // case-insensitive trimmed *name* — not by artist.id — because the
  // gallery often has multiple artist rows for the same person (legacy
  // bulk-upload duplicates from before the lookup-first dedup landed in
  // useUploadArtworks). The first artist row encountered with a given
  // name wins as canonical; subsequent rows with the same name don't
  // produce extra intro blocks. Mirrors the same dedup the PDF render
  // does in lib/dossier/editorial-order.ts → groupArtists.
  const editorialArtists = useMemo(() => {
    const byName = new Map<
      string,
      { id: string; name: string; nationality: string | null; bio: string | null }
    >();
    for (const a of artworks) {
      if (!a.artist) continue;
      const key = a.artist.name.trim().toLowerCase();
      if (!byName.has(key)) {
        byName.set(key, {
          id: a.artist.id,
          name: a.artist.name,
          nationality: null,
          bio: null,
        });
      }
    }
    return Array.from(byName.values());
  }, [artworks]);

  // Optimistic dossier object for the live preview.
  const previewDossier = useMemo(() => {
    if (!dossierQuery.data) return null;
    return {
      ...dossierQuery.data,
      title,
      kind,
      body_blocks: {
        ...dossierQuery.data.body_blocks,
        intro,
        extra: kind === "special" ? extra : undefined,
        artwork_descriptions: descriptions,
        show_title: kind === "editorial" ? showTitle : undefined,
        accent_color:
          kind === "editorial" ? (accentColor.trim() || undefined) : undefined,
        watermark:
          kind === "editorial" ? (watermark.trim() || undefined) : undefined,
        show_title_html: kind === "editorial" ? showTitleHtml : undefined,
        disclaimer: kind === "editorial" ? disclaimer : undefined,
        artist_intros: kind === "editorial" ? artistIntros : undefined,
        page_layouts: kind === "editorial" ? pageLayouts : undefined,
        custom_pages: kind === "editorial" ? customPages : undefined,
      },
      image_layout: layout,
    };
  }, [dossierQuery.data, title, kind, intro, extra, showTitle, showTitleHtml, accentColor, watermark, disclaimer, artistIntros, pageLayouts, customPages, descriptions, layout]);

  async function onSave() {
    try {
      await update.mutateAsync({
        id,
        patch: {
          title,
          kind,
          body_blocks: {
            ...dossierQuery.data?.body_blocks,
            intro,
            extra: kind === "special" ? extra : undefined,
            artwork_descriptions: descriptions,
            show_title: kind === "editorial" ? showTitle : undefined,
            accent_color:
              kind === "editorial" ? (accentColor.trim() || undefined) : undefined,
            watermark:
              kind === "editorial" ? (watermark.trim() || undefined) : undefined,
            show_title_html: kind === "editorial" ? showTitleHtml : undefined,
            disclaimer: kind === "editorial" ? disclaimer : undefined,
            artist_intros: kind === "editorial" ? artistIntros : undefined,
            page_layouts: kind === "editorial" ? pageLayouts : undefined,
            custom_pages: kind === "editorial" ? customPages : undefined,
          },
          image_layout: layout,
        },
      });
      toast.success("Dossier saved");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  // The HTML editor preview emits whole-block patches; we fan-out into the
  // editor's individual setters so the existing form panel + the live PDF
  // export both see the same source of truth (no shadow state).
  function applyBodyBlocksPatch(patch: Partial<Dossier["body_blocks"]>) {
    if ("intro" in patch) setIntro(patch.intro ?? "");
    if ("show_title" in patch) setShowTitle(patch.show_title ?? "");
    if ("accent_color" in patch) setAccentColor(patch.accent_color ?? "");
    if ("watermark" in patch) setWatermark(patch.watermark ?? "");
    if ("show_title_html" in patch) setShowTitleHtml(patch.show_title_html ?? "");
    if ("disclaimer" in patch) setDisclaimer(patch.disclaimer);
    if ("artist_intros" in patch) setArtistIntros(patch.artist_intros ?? {});
    if ("page_layouts" in patch) setPageLayouts(patch.page_layouts ?? {});
    if ("custom_pages" in patch) setCustomPages(patch.custom_pages ?? []);
    if ("artwork_descriptions" in patch)
      setDescriptions(patch.artwork_descriptions ?? {});
    if ("extra" in patch) setExtra(patch.extra ?? "");
  }

  // Editorial — Option 1: Hard-coded fill. Pulls existing fields verbatim,
  // makes no AI calls. Existing `artist_intros` entries are preserved; missing
  // ones are seeded with empty strings + the dossier title as the show title.
  function onFillHardcoded() {
    setFillingHardcoded(true);
    try {
      if (!showTitle) setShowTitle(title);
      setArtistIntros((prev) => {
        const next = { ...prev };
        for (const a of editorialArtists) {
          if (!next[a.id]) {
            next[a.id] = {
              bio_en: a.bio ?? "",
              bio_es: "",
              instagram: "",
              photo_path: "",
            };
          }
        }
        return next;
      });
      toast.success("Filled from existing data");
    } finally {
      setFillingHardcoded(false);
    }
  }

  if (dossierQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!dossierQuery.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dossier not found</CardTitle>
          <CardDescription>
            <Link to="/dossiers" className="underline">
              Back to dossiers
            </Link>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/dossiers">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSending(true)}
            disabled={artworks.length === 0}
          >
            <Send className="h-4 w-4" />
            Send to contacts
          </Button>
          <Button onClick={onSave} disabled={update.isPending} size="sm">
            {update.isPending ? "Saving…" : "Save"}
          </Button>
          {isAdmin && dossierQuery.data ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (
                  !window.confirm(
                    `Delete dossier "${dossierQuery.data?.title ?? ""}"? Artworks themselves are kept.`,
                  )
                )
                  return;
                try {
                  await del.mutateAsync({ id });
                  toast.success("Dossier deleted.");
                  navigate("/dossiers", { replace: true });
                } catch (err) {
                  toast.error(errorMessage(err));
                }
              }}
              disabled={del.isPending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {del.isPending ? "Deleting…" : "Delete"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Template</Label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as DossierKind)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {KIND_OPTIONS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Intro / blurb</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!intro.trim()) {
                    toast.error("Write some text first, then ask the AI for feedback.");
                    return;
                  }
                  setReviewing({
                    context: `${KIND_OPTIONS.find((k) => k.value === kind)?.label ?? "Dossier"} · intro / blurb`,
                    text: intro,
                  });
                }}
              >
                <Sparkles className="h-4 w-4" />
                Correct with AI
              </Button>
            </div>
            <textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-input bg-background p-2 text-sm"
              placeholder="Exhibition blurb, intro paragraph…"
            />
          </div>

          {kind === "special" ? (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Extra text</Label>
              <textarea
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-input bg-background p-2 text-sm"
                placeholder="Special notes only shown on the Special template…"
              />
            </div>
          ) : null}

          {kind === "editorial" ? (
            <div className="space-y-3 border border-border bg-secondary/40 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Editorial dossier
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onFillHardcoded}
                    disabled={fillingHardcoded}
                  >
                    {fillingHardcoded ? "Filling…" : "Fill from data"}
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Show title (cover word, e.g. PARALLELS)
                  </Label>
                  <Input
                    value={showTitle}
                    onChange={(e) => setShowTitle(e.target.value)}
                    className="h-9 uppercase tracking-widest"
                    placeholder="UPPERCASE COVER TITLE"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Accent color
                  </Label>
                  <div className="flex h-9 items-center gap-2">
                    <input
                      type="color"
                      value={accentColor || "#EC6660"}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-9 w-10 cursor-pointer border border-input bg-background p-0"
                      aria-label="Cover accent color"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="#EC6660"
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Watermark (stamps every page)
                </Label>
                <div className="flex h-9 items-center gap-2">
                  <Input
                    value={watermark}
                    onChange={(e) => setWatermark(e.target.value)}
                    placeholder="Leave empty for none"
                    className="h-9"
                    aria-label="Page watermark text"
                  />
                  {(["DRAFT", "CONFIDENTIAL", "RESERVED"] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWatermark(watermark === preset ? "" : preset)}
                      aria-pressed={watermark === preset}
                      className={
                        "h-9 whitespace-nowrap border px-2 text-[11px] uppercase tracking-wide transition-colors " +
                        (watermark === preset
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background hover:bg-muted")
                      }
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <EditorialIntrosEditor
                artists={editorialArtists}
                intros={artistIntros}
                onChange={setArtistIntros}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Image layout ({artworks.length}) — drag to reorder
            </Label>
            {artworks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No artworks in this dossier.
              </p>
            ) : (
              <ImageLayoutGrid artworks={artworks} onReorder={setLayout} />
            )}
          </div>

          {artworks.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Per-artwork descriptions
              </Label>
              <ArtworkDescriptionEditor
                artworks={artworks}
                descriptions={descriptions}
                onChange={setDescriptions}
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              {hasHtmlEditor(kind) ? (
                <div className="ml-2 inline-flex items-center border border-border">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("edit")}
                    className={
                      "px-2 py-1 text-xs uppercase tracking-wide transition-colors " +
                      (previewMode === "edit"
                        ? "bg-foreground text-background"
                        : "bg-background hover:bg-muted")
                    }
                    aria-pressed={previewMode === "edit"}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("pdf")}
                    className={
                      "px-2 py-1 text-xs uppercase tracking-wide transition-colors " +
                      (previewMode === "pdf"
                        ? "bg-foreground text-background"
                        : "bg-background hover:bg-muted")
                    }
                    aria-pressed={previewMode === "pdf"}
                  >
                    PDF
                  </button>
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEnlarged(true)}
                disabled={!previewDossier}
              >
                <Maximize2 className="h-4 w-4" /> Enlarge
              </Button>
              <Suspense
                fallback={
                  <Button size="sm" variant="outline" disabled>
                    <Download className="h-4 w-4" /> Download
                  </Button>
                }
              >
                <PdfDownloadButton
                  dossier={previewDossier}
                  artworks={artworks}
                  galleryName={galleryName}
                  titlePath={titlePath}
                />
              </Suspense>
            </div>
          </div>
          <div className="h-[80vh] overflow-auto rounded-md border border-border bg-muted">
            {previewDossier ? (
              hasHtmlEditor(kind) && previewMode === "edit" ? (
                <div className="p-4">
                  <HtmlEditorPreview
                    dossier={previewDossier}
                    artworks={artworks}
                    galleryName={galleryName}
                    onUpdate={(patch) => applyBodyBlocksPatch(patch)}
                    onUpdateTitle={(next) => setTitle(next)}
                    onUpdateLayout={(next) => setLayout(next)}
                  />
                </div>
              ) : (
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Loading preview…
                    </div>
                  }
                >
                  <PdfPanel
                    dossier={previewDossier}
                    artworks={artworks}
                    galleryName={galleryName}
                    imageUrlFor={imageUrl}
                    titlePath={titlePath}
                  />
                </Suspense>
              )
            ) : null}
          </div>
        </div>
      </div>

      {enlarged && previewDossier ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-sm font-medium">{previewDossier.title} — preview</span>
            <Button size="sm" variant="ghost" onClick={() => setEnlarged(false)}>
              <X className="h-4 w-4" /> Close
            </Button>
          </div>
          <div className="flex-1 overflow-hidden bg-muted">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Loading preview…
                </div>
              }
            >
              <PdfPanel
                dossier={previewDossier}
                artworks={artworks}
                galleryName={galleryName}
                imageUrlFor={imageUrl}
                titlePath={titlePath}
              />
            </Suspense>
          </div>
        </div>
      ) : null}

      {sending && previewDossier ? (
        <SendToContactsModal
          dossier={previewDossier}
          artworks={artworks}
          galleryName={galleryName}
          onClose={() => setSending(false)}
        />
      ) : null}
      {reviewing ? (
        <AICorrectionOverlay
          context={reviewing.context}
          text={reviewing.text}
          onClose={() => setReviewing(null)}
        />
      ) : null}
    </div>
  );
}

// Tiny inline component that participates in the same Suspense boundary as
// PdfPanel — pulls @react-pdf/renderer's PDFDownloadLink lazily.
const PdfDownloadButton = lazy(
  () => import("@/components/dossiers/PdfDownloadButton"),
);
