import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DossierPDF } from "@/lib/pdf/DossierPDF";
import { imageUrl } from "@/hooks/useArtworks";
import type { ArtworkListItem, Dossier } from "@/integrations/supabase/domain";
import type { TitlePathData } from "@/lib/pdf/shared";

export default function PdfDownloadButton({
  dossier,
  artworks,
  galleryName,
  titlePath,
}: {
  dossier: Dossier | null;
  artworks: ArtworkListItem[];
  galleryName: string;
  titlePath?: TitlePathData | null;
}) {
  if (!dossier) {
    return (
      <Button size="sm" variant="outline" disabled>
        <Download className="h-4 w-4" /> Download
      </Button>
    );
  }
  const filename = `${dossier.title.replace(/[^a-zA-Z0-9-]+/g, "_") || "dossier"}.pdf`;
  return (
    <PDFDownloadLink
      document={
        <DossierPDF
          dossier={dossier}
          artworks={artworks}
          galleryName={galleryName}
          imageUrlFor={imageUrl}
          titlePath={titlePath}
        />
      }
      fileName={filename}
    >
      {({ loading }) => (
        <Button size="sm" variant="outline" disabled={loading}>
          <Download className="h-4 w-4" />
          {loading ? "Preparing…" : "Download"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
