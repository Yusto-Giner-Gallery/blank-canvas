import type { ArtworkListItem, Dossier } from "@/integrations/supabase/domain";
import { EditorialHtml } from "./templates/EditorialHtml";

// Top-level dispatcher for the WYSIWYG editor preview. For dossier kinds
// that have an HTML mirror, click-to-edit + drop-to-upload work directly
// on the preview. For kinds that don't have a mirror yet (B-2 will add
// solo/group/special/art_fair/collector_offer), the parent should fall
// back to the read-only PDF preview.

type Props = {
  dossier: Dossier;
  artworks: ArtworkListItem[];
  galleryName: string;
  onUpdate: (patch: Partial<Dossier["body_blocks"]>) => void;
};

export function HtmlEditorPreview({
  dossier,
  artworks,
  galleryName,
  onUpdate,
}: Props) {
  switch (dossier.kind) {
    case "editorial":
      return (
        <EditorialHtml
          dossier={dossier}
          artworks={artworks}
          galleryName={galleryName}
          onUpdate={onUpdate}
        />
      );
    // B-2: HTML mirrors for solo_show, group_show, special, art_fair,
    // collector_offer. Until they exist, return null and let the parent
    // render the existing read-only PDF preview as a fallback.
    default:
      return null;
  }
}

export function hasHtmlEditor(kind: Dossier["kind"]): boolean {
  return kind === "editorial";
}
