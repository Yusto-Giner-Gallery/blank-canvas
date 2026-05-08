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

export function GroupShowHtml({
  dossier,
  artworks,
  galleryName,
  onUpdate,
  onUpdateTitle,
}: Props) {
  const intro = dossier.body_blocks.intro ?? "";
  const descriptions = dossier.body_blocks.artwork_descriptions ?? {};
  const artistNames = Array.from(
    new Set(artworks.map((a) => a.artist?.name).filter((n): n is string => !!n)),
  );

  function setDescription(awId: string, text: string) {
    onUpdate({ artwork_descriptions: { ...descriptions, [awId]: text } });
  }

  return (
    <StandardPage>
      <PageHeader galleryName={galleryName} kindLabel="Group show" />
      <EditableText
        value={dossier.title}
        onChange={onUpdateTitle}
        ariaLabel="Dossier title"
        className="block font-bold"
        style={{ fontSize: 24, marginTop: 18, marginBottom: 4 }}
        placeholder="Group show title"
      />
      {artistNames.length > 0 ? (
        <div style={{ fontSize: 11, marginTop: 2, marginBottom: 14 }}>
          {artistNames.join(" · ")}
        </div>
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
      <div className="grid grid-cols-3 gap-3">
        {artworks.map((a) => {
          const url = imageUrl(a.primary_image?.storage_path);
          return (
            <div key={a.id}>
              <div
                className="bg-muted"
                style={{
                  height: 110,
                  border: "1px solid #e5e5e5",
                  marginBottom: 4,
                }}
              >
                {url ? (
                  <img src={url} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="font-bold" style={{ fontSize: 9, marginTop: 4 }}>
                {a.artist?.name ?? "—"}
              </div>
              <div className="text-muted-foreground" style={{ fontSize: 8 }}>
                {a.title}
                {a.year ? `, ${a.year}` : ""}
              </div>
              <EditableText
                value={descriptions[a.id] ?? ""}
                onChange={(v) => setDescription(a.id, v)}
                placeholder="Description…"
                multiline
                ariaLabel={`${a.title} description`}
                className="block"
                style={{ fontSize: 8, marginTop: 3, lineHeight: 1.4 }}
              />
            </div>
          );
        })}
      </div>
    </StandardPage>
  );
}
