import { PDFViewer } from "@react-pdf/renderer";
import { DossierPDF, type DossierPDFProps } from "@/lib/pdf/DossierPDF";

// Lazy-loaded: keeps @react-pdf/renderer (~heavy) out of the main bundle.
export default function PdfPanel(props: DossierPDFProps) {
  return (
    <PDFViewer width="100%" height="100%" showToolbar={false} className="bg-background">
      <DossierPDF {...props} />
    </PDFViewer>
  );
}
