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
  if (eur == null) return "POR";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(eur);
}

export function ArtFairHtml({
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
    <StandardPage>
      <PageHeader galleryName={galleryName} kindLabel="Art fair" />
      <div
        className="bg-foreground text-background"
        style={{ padding: 14, marginTop: 18, marginBottom: 16 }}
      >
        <EditableText
          value={dossier.title}
          onChange={onUpdateTitle}
          ariaLabel="Booth title"
          className="block font-bold text-background"
          style={{ fontSize: 22 }}
          placeholder="Booth / fair title"
        />
        <div
          className="uppercase"
          style={{
            fontSize: 9,
            color: "#d4d4d4",
            marginTop: 4,
            letterSpacing: 1,
          }}
        >
          {galleryName.toUpperCase()} · BOOTH OFFER
        </div>
      </div>
      <EditableText
        value={intro}
        onChange={(v) => onUpdate({ intro: v })}
        placeholder="Booth intro…"
        multiline
        ariaLabel="Intro"
        className="block"
        style={{ fontSize: 10, lineHeight: 1.5, marginBottom: 14 }}
      />
      <div className="grid grid-cols-2 gap-3">
        {artworks.map((a) => {
          const url = imageUrl(a.primary_image?.storage_path);
          const dims = [a.width_cm, a.height_cm, a.depth_cm]
            .filter((n): n is number => typeof n === "number")
            .join(" x ");
          return (
            <div key={a.id} style={{ marginBottom: 8 }}>
              <div
                className="bg-muted"
                style={{
                  height: 170,
                  border: "1px solid #e5e5e5",
                  marginBottom: 6,
                }}
              >
                {url ? (
                  <img src={url} alt="" className="h-full w-full object-contain" />
                ) : null}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold flex-1" style={{ fontSize: 11 }}>
                  {a.title}
                </div>
                <div className="font-bold" style={{ fontSize: 11 }}>
                  {formatPrice(a.price_eur)}
                </div>
              </div>
              <div className="text-muted-foreground" style={{ fontSize: 9 }}>
                {a.artist?.name ?? "—"}
                {a.year ? `, ${a.year}` : ""}
              </div>
              <div className="text-muted-foreground" style={{ fontSize: 9 }}>
                {[a.medium, dims ? `${dims} cm` : null].filter(Boolean).join(" · ")}
              </div>
              <EditableText
                value={descriptions[a.id] ?? ""}
                onChange={(v) => setDescription(a.id, v)}
                placeholder="Description…"
                multiline
                ariaLabel={`${a.title} description`}
                className="block"
                style={{ fontSize: 9, marginTop: 4, lineHeight: 1.4 }}
              />
            </div>
          );
        })}
      </div>
      <div
        className="text-muted-foreground"
        style={{ fontSize: 8, marginTop: 12 }}
      >
        Prices in EUR · POR = price on request
      </div>
    </StandardPage>
  );
}
