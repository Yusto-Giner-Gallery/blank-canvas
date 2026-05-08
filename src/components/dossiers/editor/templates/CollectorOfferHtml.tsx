import type {
  ArtworkListItem,
  Dossier,
} from "@/integrations/supabase/domain";
import { imageUrl } from "@/hooks/useArtworks";
import { EditableText } from "../EditableText";
import { StandardPage, PageHeader } from "./StandardPage";

type Props = {
  dossier: Dossier;
  artworks: ArtworkListItem[];
  galleryName: string;
  onUpdate: (patch: Partial<Dossier["body_blocks"]>) => void;
  onUpdateTitle: (next: string) => void;
};

function formatPrice(eur: number | null | undefined) {
  if (eur == null) return "On request";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(eur);
}

export function CollectorOfferHtml({
  dossier,
  artworks,
  galleryName,
  onUpdate,
  onUpdateTitle,
}: Props) {
  const intro = dossier.body_blocks.intro ?? "";
  const descriptions = dossier.body_blocks.artwork_descriptions ?? {};

  function setDescription(awId: string, text: string) {
    onUpdate({ artwork_descriptions: { ...descriptions, [awId]: text } });
  }

  return (
    <div className="space-y-4">
      {/* Intro page */}
      <StandardPage paddingTop={120}>
        <PageHeader galleryName={galleryName} kindLabel="Collector offer" />
        <EditableText
          value={dossier.title}
          onChange={onUpdateTitle}
          ariaLabel="Dossier title"
          className="block font-bold"
          style={{ fontSize: 28, marginBottom: 14 }}
          placeholder="Collector offer title"
        />
        <EditableText
          value={intro}
          onChange={(v) => onUpdate({ intro: v })}
          placeholder={`A personal selection from ${galleryName}.`}
          multiline
          ariaLabel="Intro"
          className="block"
          style={{ fontSize: 11, lineHeight: 1.6 }}
        />
      </StandardPage>

      {/* One page per artwork */}
      {artworks.map((a) => {
        const url = imageUrl(a.primary_image?.storage_path);
        const dims = [a.width_cm, a.height_cm, a.depth_cm]
          .filter((n): n is number => typeof n === "number")
          .join(" x ");
        return (
          <StandardPage key={a.id}>
            <PageHeader galleryName={galleryName} kindLabel="Collector offer" />
            <div
              className="flex items-center justify-center bg-muted/40"
              style={{ height: 320, marginBottom: 14 }}
            >
              {url ? (
                <img src={url} alt="" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">No image</span>
              )}
            </div>
            <div className="font-bold" style={{ fontSize: 18 }}>
              {a.title}
            </div>
            <div style={{ fontSize: 12, marginTop: 2 }}>
              {a.artist?.name ?? "—"}
            </div>
            <div className="text-muted-foreground" style={{ fontSize: 10, marginTop: 6 }}>
              {[a.medium, dims ? `${dims} cm` : null, a.year ? String(a.year) : null]
                .filter(Boolean)
                .join(" · ")}
            </div>
            <EditableText
              value={descriptions[a.id] ?? ""}
              onChange={(v) => setDescription(a.id, v)}
              placeholder="Personal note for this work…"
              multiline
              ariaLabel={`${a.title} description`}
              className="block"
              style={{ fontSize: 10, marginTop: 14, lineHeight: 1.5 }}
            />
            <div
              className="flex items-end justify-between"
              style={{
                marginTop: 14,
                borderTop: "1px solid #e5e5e5",
                paddingTop: 8,
              }}
            >
              <div
                className="text-muted-foreground uppercase"
                style={{ fontSize: 9, letterSpacing: 1 }}
              >
                Price
              </div>
              <div className="font-bold" style={{ fontSize: 16 }}>
                {formatPrice(a.price_eur)}
              </div>
            </div>
          </StandardPage>
        );
      })}
    </div>
  );
}
