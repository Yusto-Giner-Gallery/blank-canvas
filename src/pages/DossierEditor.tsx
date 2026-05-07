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
import { SendToContactsModal } from "@/components/dossiers/SendToContactsModal";
import { generateText } from "@/lib/ai/client";
import type { DossierKind } from "@/integrations/supabase/types";

const PdfPanel = lazy(() => import("@/components/dossiers/PdfPanel"));

const KIND_OPTIONS: Array<{ value: DossierKind; label: string }> = [
  { value: "solo_show", label: "Solo show" },
  { value: "group_show", label: "Group show" },
  { value: "special", label: "Special (extra text)" },
  { value: "art_fair", label: "Art fair" },
  { value: "collector_offer", label: "Collector offer" },
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
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [layout, setLayout] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  // Hydrate local state from server data once.
  useEffect(() => {
    if (!dossierQuery.data) return;
    const d = dossierQuery.data;
    setTitle(d.title);
    setKind(d.kind);
    setIntro(d.body_blocks.intro ?? "");
    setExtra(d.body_blocks.extra ?? "");
    setDescriptions(d.body_blocks.artwork_descriptions ?? {});
    setLayout(d.image_layout);
  }, [dossierQuery.data]);

  const artworks = useDossierArtworks(layout, artworksQuery.data);

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
      },
      image_layout: layout,
    };
  }, [dossierQuery.data, title, kind, intro, extra, descriptions, layout]);

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
          },
          image_layout: layout,
        },
      });
      toast.success("Dossier saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
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
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
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
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Live preview</Label>
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
          <div className="h-[80vh] overflow-hidden rounded-md border border-border bg-muted">
            {previewDossier ? (
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
