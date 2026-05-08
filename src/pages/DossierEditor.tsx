import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Send, Sparkles } from "lucide-react";
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
  useDossier,
  useDossierArtworks,
  useUpdateDossier,
} from "@/hooks/useDossiers";
import { useArtworks, imageUrl } from "@/hooks/useArtworks";
import { useGallery } from "@/hooks/useGallery";
import { ImageLayoutGrid } from "@/components/dossiers/ImageLayoutGrid";
import { ArtworkDescriptionEditor } from "@/components/dossiers/ArtworkDescriptionEditor";
import { EditorialIntrosEditor } from "@/components/dossiers/EditorialIntrosEditor";
import { SendToContactsModal } from "@/components/dossiers/SendToContactsModal";
import {
  HtmlEditorPreview,
  hasHtmlEditor,
} from "@/components/dossiers/editor/HtmlEditorPreview";
import { generateText, generateEditorialDossier } from "@/lib/ai/client";
import { errorMessage } from "@/lib/error";
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
  const dossierQuery = useDossier(id);
  const artworksQuery = useArtworks();
  const update = useUpdateDossier();
  const galleryQuery = useGallery();
  const galleryName = galleryQuery.data?.name ?? "Gallery";

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<DossierKind>("solo_show");
  const [intro, setIntro] = useState("");
  const [extra, setExtra] = useState("");
  const [showTitle, setShowTitle] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [artistIntros, setArtistIntros] = useState<Record<string, DossierArtistIntro>>({});
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [layout, setLayout] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [fillingHardcoded, setFillingHardcoded] = useState(false);
  const [fillingAi, setFillingAi] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewMode, setPreviewMode] = useState<"edit" | "pdf">("edit");

  // Hydrate local state from server data once.
  useEffect(() => {
    if (!dossierQuery.data) return;
    const d = dossierQuery.data;
    setTitle(d.title);
    setKind(d.kind);
    setIntro(d.body_blocks.intro ?? "");
    setExtra(d.body_blocks.extra ?? "");
    setShowTitle(d.body_blocks.show_title ?? "");
    setAccentColor(d.body_blocks.accent_color ?? "");
    setArtistIntros(d.body_blocks.artist_intros ?? {});
    setDescriptions(d.body_blocks.artwork_descriptions ?? {});
    setLayout(d.image_layout);
  }, [dossierQuery.data]);

  const artworks = useDossierArtworks(layout, artworksQuery.data);

  // Unique artists in display order, used by the editorial-only intro panel.
  const editorialArtists = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ id: string; name: string; nationality: string | null; bio: string | null }> = [];
    for (const a of artworks) {
      if (a.artist && !seen.has(a.artist.id)) {
        seen.add(a.artist.id);
        out.push({
          id: a.artist.id,
          name: a.artist.name,
          // ArtworkListItem only carries id+name; nationality/bio come from
          // the artwork query's artist if expanded later. Safe defaults here.
          nationality: null,
          bio: null,
        });
      }
    }
    return out;
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
        artist_intros: kind === "editorial" ? artistIntros : undefined,
      },
      image_layout: layout,
    };
  }, [dossierQuery.data, title, kind, intro, extra, showTitle, accentColor, artistIntros, descriptions, layout]);

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
            artist_intros: kind === "editorial" ? artistIntros : undefined,
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
    if ("artist_intros" in patch) setArtistIntros(patch.artist_intros ?? {});
    if ("artwork_descriptions" in patch)
      setDescriptions(patch.artwork_descriptions ?? {});
    if ("extra" in patch) setExtra(patch.extra ?? "");
  }

  async function onGenerateIntro() {
    if (!previewDossier) return;
    setGenerating(true);
    try {
      const text = await generateText({
        kind: "exhibition_blurb",
        dossier_kind: kind,
        title: title || "Untitled dossier",
        artworks,
      });
      setIntro(text);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setGenerating(false);
    }
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

  // Editorial — Option 2: AI fill. Single call returns show_title, intro, and
  // EN/ES bios per artist. User-edited fields are preserved (no overwrite).
  async function onFillAi() {
    if (editorialArtists.length === 0) {
      toast.error("Add artworks with artists before generating");
      return;
    }
    setFillingAi(true);
    try {
      const resp = await generateEditorialDossier({
        kind: "editorial_dossier",
        title: title || "Untitled dossier",
        artists: editorialArtists,
        artwork_count: artworks.length,
      });
      if (!showTitle && resp.show_title) setShowTitle(resp.show_title);
      if (!intro && resp.intro) setIntro(resp.intro);
      setArtistIntros((prev) => {
        const next = { ...prev };
        for (const [artistId, bios] of Object.entries(resp.artist_intros)) {
          const existing = next[artistId] ?? {};
          next[artistId] = {
            ...existing,
            bio_en: existing.bio_en?.trim() ? existing.bio_en : bios.bio_en ?? "",
            bio_es: existing.bio_es?.trim() ? existing.bio_es : bios.bio_es ?? "",
          };
        }
        return next;
      });
      toast.success("AI filled the dossier");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setFillingAi(false);
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
                onClick={onGenerateIntro}
                disabled={generating}
              >
                <Sparkles className="h-4 w-4" />
                {generating ? "Generating…" : "Generate with AI"}
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
                  <Button
                    type="button"
                    size="sm"
                    onClick={onFillAi}
                    disabled={fillingAi}
                  >
                    <Sparkles className="h-4 w-4" />
                    {fillingAi ? "Generating…" : "Generate with AI"}
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
              />
            </Suspense>
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
                  />
                </Suspense>
              )
            ) : null}
          </div>
        </div>
      </div>

      {sending && previewDossier ? (
        <SendToContactsModal
          dossier={previewDossier}
          artworks={artworks}
          galleryName={galleryName}
          onClose={() => setSending(false)}
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
