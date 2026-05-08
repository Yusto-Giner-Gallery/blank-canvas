// Render the first page of a PDF File to a JPEG data URL so the AI
// vision endpoint (which only accepts images) can process invoices and
// receipts that arrive as PDFs (vendor email attachments, supplier
// portals, etc.). pdfjs-dist + its worker are loaded LAZILY — pulling
// ~750 KB into the main bundle just to handle the occasional PDF would
// be wasteful for users who only ever snap photos.
//
// Returns a data URL of the same shape ScanInvoiceModal already feeds
// to extractInvoice(), so the caller's flow doesn't branch.

let cachedRender:
  | ((file: File, maxDim: number) => Promise<string>)
  | null = null;

export async function pdfFirstPageToImageDataUrl(
  file: File,
  maxDim = 2000,
): Promise<string> {
  const renderFn = await loadRenderer();
  return renderFn(file, maxDim);
}

async function loadRenderer() {
  if (cachedRender) return cachedRender;
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (
    await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
  ).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  cachedRender = async (file: File, maxDim: number): Promise<string> => {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    if (pdf.numPages === 0) throw new Error("PDF has no pages");
    const page = await pdf.getPage(1);
    // Scale so the longer side hits maxDim — receipts have small print,
    // bigger render = better OCR. Cap at 3x to avoid runaway memory.
    const baseViewport = page.getViewport({ scale: 1 });
    const longSide = Math.max(baseViewport.width, baseViewport.height);
    const scale = Math.min(maxDim / longSide, 3);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported in this browser");
    // White background — many PDFs have transparent canvas; without
    // this the JPEG comes out with a black background.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return canvas.toDataURL("image/jpeg", 0.85);
  };
  return cachedRender;
}
