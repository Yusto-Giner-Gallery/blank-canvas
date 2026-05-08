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

export function SoloShowHtml({
  dossier,
  artworks,
  galleryName,
  onUpdate,
  onUpdateTitle,
}: Props) {
  const lead = artworks[0];
  const rest = artworks.slice(1);
  const heroUrl = imageUrl(lead?.primary_image?.storage_path);
  const artistName = lead?.artist?.name ?? "";
  const intro = dossier.body_blocks.intro ?? "";
  const descriptions = dossier.body_blocks.artwork_descriptions ?? {};

  function setDescription(awId: string, text: string) {
    onUpdate({ artwork_descriptions: { ...descriptions, [awId]: text } });
  }

  return (
    <StandardPage>
      <PageHeader galleryName={galleryName} kindLabel="Solo show" />
      <EditableText
        value={dossier.title}
        onChange={onUpdateTitle}
        ariaLabel="Dossier title"
        className="block font-bold"
        style={{ fontSize: 24, marginTop: 18, marginBottom: 4 }}
        placeholder="Solo show title"
      />
      {artistName ? (
        <div style={{ fontSize: 13, marginTop: 2, marginBottom: 14 }}>
          {artistName}
        </div>
      ) : null}
      {heroUrl ? (
        <img
          src={heroUrl}
          alt=""
          className="w-full object-contain"
          style={{ height: 280, marginBottom: 14, border: "1px solid #e5e5e5" }}
        />
      ) : null}
      <EditableText
        value={intro}
        onChange={(v) => onUpdate({ intro: v })}
        placeholder="Exhibition blurb…"
        multiline
        ariaLabel="Intro"
        className="block"
        style={{ fontSize: 10, lineHeight: 1.5, marginBottom: 14 }}
      />
      <div className="grid grid-cols-2 gap-3">
        {rest.map((a) => {
          const url = imageUrl(a.primary_image?.storage_path);
          const dims = [a.width_cm, a.height_cm, a.depth_cm]
            .filter((n): n is number => typeof n === "number")
            .join(" x ");
          return (
            <div key={a.id}>
              <div
                className="bg-muted"
                style={{
                  height: 170,
                  border: "1px solid #e5e5e5",
                  marginBottom: 4,
                }}
              >
                {url ? (
                  <img src={url} alt="" className="h-full w-full object-contain" />
                ) : null}
              </div>
              <div className="text-muted-foreground" style={{ fontSize: 9 }}>
                {a.title}
                {a.year ? `, ${a.year}` : ""}
                {dims ? ` · ${dims} cm` : ""}
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
    </StandardPage>
  );
}
