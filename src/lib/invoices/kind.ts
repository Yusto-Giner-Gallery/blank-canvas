// Discriminator between an outgoing sales invoice (gallery → collector,
// the original schema purpose) and an incoming receipt / vendor bill
// (collector → gallery, scanned via ScanInvoiceModal).
//
// Until Lovable adds a real `kind` / `direction` column on `invoices`
// (CLAUDE.md §13), we use the `notes` prefix the scanner writes
// ("Vendor: <name>\nRef: …") as a stable client-side discriminator.
// A single isReceipt() everywhere it matters means the swap to the
// proper column will be a one-line change later.

export function isReceipt(inv: { notes: string | null }): boolean {
  const notes = inv.notes ?? "";
  return /^Vendor:/i.test(notes.trim());
}
