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

export function SpecialHtml({
  dossier,
  artworks,
  galleryName,
  onUpdate,
  onUpdateTitle,
}: Props) {
  const intro = dossier.body_blocks.intro ?? "";
  const extra = dossier.body_blocks.extra ?? "";
  const descriptions = dossier.body_blocks.artwork_descriptions ?? {};

  function setDescription(awId: string, text: string) {
    onUpdate({ artwork_descriptions: { ...descriptions, [awId]: text } });
  }

  return (
    <StandardPage>
      <PageHeader galleryName={galleryName} kindLabel="Special" />
      <EditableText
        value={dossier.title}
        onChange={onUpdateTitle}
        ariaLabel="Dossier title"
        className="block font-bold"
        style={{ fontSize: 24, marginTop: 18, marginBottom: 4 }}
        placeholder="Special title"
      />
      <EditableText
        value={intro}
        onChange={(v) => onUpdate({ intro: v })}
        placeholder="Intro paragraph…"
        multiline
        ariaLabel="Intro"
        className="block"
        style={{ fontSize: 10, lineHeight: 1.5, marginBottom: 8 }}
      />
      <div
        className="bg-muted/40"
        style={{
          padding: 12,
          marginTop: 14,
          marginBottom: 14,
          borderLeft: "3px solid #0a0a0a",
        }}
      >
        <EditableText
          value={extra}
          onChange={(v) => onUpdate({ extra: v })}
          placeholder="Special notes / highlight box…"
          multiline
          ariaLabel="Extra"
          className="block"
          style={{ fontSize: 10, lineHeight: 1.5 }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {artworks.map((a) => {
          const url = imageUrl(a.primary_image?.storage_path);
          const dims = [a.width_cm, a.height_cm, a.depth_cm]
            .filter((n): n is number => typeof n === "number")
            .join(" x ");
          return (
            <div key={a.id}>
              <div
                className="bg-muted"
                style={{
                  height: 150,
                  border: "1px solid #e5e5e5",
                  marginBottom: 6,
                }}
              >
                {url ? (
                  <img src={url} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="font-bold" style={{ fontSize: 10 }}>
                {a.title}
              </div>
              <div className="text-muted-foreground" style={{ fontSize: 9 }}>
                {a.artist?.name ?? "—"}
                {a.year ? `, ${a.year}` : ""}
              </div>
              {dims ? (
                <div className="text-muted-foreground" style={{ fontSize: 9 }}>
                  {dims} cm
                </div>
              ) : null}
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
