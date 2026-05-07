import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoicePDF, type InvoicePDFProps } from "@/lib/pdf/InvoicePDF";

export default function InvoicePdfDownloadButton(props: InvoicePDFProps) {
  const filename = `invoice-${props.invoice.id.slice(0, 8)}.pdf`;
  return (
    <PDFDownloadLink document={<InvoicePDF {...props} />} fileName={filename}>
      {({ loading }) => (
        <Button size="sm" variant="outline" disabled={loading}>
          <Download className="h-4 w-4" />
          {loading ? "Preparing…" : "Download PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
