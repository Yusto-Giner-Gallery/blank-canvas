import { PDFViewer } from "@react-pdf/renderer";
import {
  ArtworkSheetPDF,
  type ArtworkSheetPDFProps,
} from "@/lib/pdf/ArtworkSheetPDF";

// Lazy-loaded: keeps @react-pdf/renderer out of the main bundle. The
// PDFViewer toolbar exposes the browser's native print and download
// buttons, which is what "Print" should mean.
export default function PrintSheetPanel(props: ArtworkSheetPDFProps) {
  return (
    <PDFViewer width="100%" height="100%" className="bg-background">
      <ArtworkSheetPDF {...props} />
    </PDFViewer>
  );
}
