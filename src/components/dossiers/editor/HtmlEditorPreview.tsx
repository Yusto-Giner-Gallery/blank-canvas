import type { ArtworkListItem, Dossier } from "@/integrations/supabase/domain";
import { EditorialHtml } from "./templates/EditorialHtml";
import { SoloShowHtml } from "./templates/SoloShowHtml";
import { GroupShowHtml } from "./templates/GroupShowHtml";
import { SpecialHtml } from "./templates/SpecialHtml";
import { ArtFairHtml } from "./templates/ArtFairHtml";
import { CollectorOfferHtml } from "./templates/CollectorOfferHtml";

// Top-level dispatcher for the WYSIWYG editor preview. Every dossier kind
// has an HTML mirror; click-to-edit + drop-to-upload work directly on the
// preview, and the PDF export reads from the same body_blocks.

type Props = {
  dossier: Dossier;
  artworks: ArtworkListItem[];
  galleryName: string;
  onUpdate: (patch: Partial<Dossier["body_blocks"]>) => void;
  onUpdateTitle: (next: string) => void;
  onUpdateLayout: (next: string[]) => void;
};

export function HtmlEditorPreview({
  dossier,
  artworks,
  galleryName,
  onUpdate,
  onUpdateTitle,
  onUpdateLayout,
}: Props) {
  switch (dossier.kind) {
    case "editorial":
      return (
        <EditorialHtml
          dossier={dossier}
          artworks={artworks}
          galleryName={galleryName}
          onUpdate={onUpdate}
          onUpdateLayout={onUpdateLayout}
        />
      );
    case "solo_show":
      return (
        <SoloShowHtml
          dossier={dossier}
          artworks={artworks}
          galleryName={galleryName}
          onUpdate={onUpdate}
          onUpdateTitle={onUpdateTitle}
        />
      );
    case "group_show":
      return (
        <GroupShowHtml
          dossier={dossier}
          artworks={artworks}
          galleryName={galleryName}
          onUpdate={onUpdate}
          onUpdateTitle={onUpdateTitle}
        />
      );
    case "special":
      return (
        <SpecialHtml
          dossier={dossier}
          artworks={artworks}
          galleryName={galleryName}
          onUpdate={onUpdate}
          onUpdateTitle={onUpdateTitle}
        />
      );
    case "art_fair":
      return (
        <ArtFairHtml
          dossier={dossier}
          artworks={artworks}
          galleryName={galleryName}
          onUpdate={onUpdate}
          onUpdateTitle={onUpdateTitle}
        />
      );
    case "collector_offer":
      return (
        <CollectorOfferHtml
          dossier={dossier}
          artworks={artworks}
          galleryName={galleryName}
          onUpdate={onUpdate}
          onUpdateTitle={onUpdateTitle}
        />
      );
  }
}

export function hasHtmlEditor(_kind: Dossier["kind"]): boolean {
  // All dossier kinds now have HTML mirrors.
  return true;
}
