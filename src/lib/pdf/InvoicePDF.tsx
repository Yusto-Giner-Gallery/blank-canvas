import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { baseStyles, formatPrice, palette } from "./shared";
import type {
  Contact,
  Invoice,
  InvoiceLine,
} from "@/integrations/supabase/domain";

const local = StyleSheet.create({
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  metaCol: { flex: 1 },
  metaLabel: {
    fontSize: 8,
    color: palette.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  metaValue: { fontSize: 11, color: palette.ink, lineHeight: 1.4 },
  table: {
    borderTopWidth: 1,
    borderTopColor: palette.ink,
    borderBottomWidth: 1,
    borderBottomColor: palette.hairline,
    marginBottom: 12,
  },
  thead: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: palette.hairline,
  },
  th: { fontSize: 8, color: palette.muted, textTransform: "uppercase", letterSpacing: 1 },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: palette.hairline,
  },
  cellDescription: { fontSize: 10, color: palette.ink, flex: 3, paddingRight: 8 },
  cellNumber: {
    fontSize: 10,
    color: palette.ink,
    flex: 1,
    textAlign: "right",
    paddingHorizontal: 4,
  },
  totals: { marginTop: 8, alignItems: "flex-end" },
  totalLine: { flexDirection: "row", justifyContent: "flex-end", gap: 18, marginBottom: 4 },
  totalLabel: { fontSize: 9, color: palette.muted, textTransform: "uppercase", letterSpacing: 1 },
  totalValue: { fontSize: 10, color: palette.ink, minWidth: 80, textAlign: "right" },
  grandLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 },
  grandValue: { fontSize: 14, fontWeight: 700, minWidth: 100, textAlign: "right" },
  payCta: {
    marginTop: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: palette.ink,
    backgroundColor: "#fafafa",
  },
  payText: { fontSize: 10, color: palette.body, lineHeight: 1.5 },
  payLink: { fontSize: 10, color: palette.ink, marginTop: 4 },
});

export type InvoicePDFProps = {
  invoice: Invoice;
  contact: Contact | null;
  lines: InvoiceLine[];
  galleryName: string;
};

export function InvoicePDF({ invoice, contact, lines, galleryName }: InvoicePDFProps) {
  const subtotal = lines.reduce((s, l) => s + l.amount_eur, 0);
  const totalDiscount = lines.reduce((s, l) => s + l.discount_eur, 0);
  const total = subtotal - totalDiscount;
  const issued = invoice.issued_at
    ? new Date(invoice.issued_at).toLocaleDateString("en-GB")
    : new Date(invoice.created_at).toLocaleDateString("en-GB");

  return (
    <Document title={`Invoice ${invoice.id.slice(0, 8)}`}>
      <Page size="A4" style={baseStyles.page}>
        <View style={baseStyles.header} fixed>
          <Text style={baseStyles.wordmark}>{galleryName}</Text>
          <Text style={baseStyles.kindLabel}>Invoice</Text>
        </View>

        <Text style={baseStyles.title}>Invoice</Text>

        <View style={local.meta}>
          <View style={local.metaCol}>
            <Text style={local.metaLabel}>Bill to</Text>
            <Text style={local.metaValue}>
              {contact?.full_name ?? "—"}
              {"\n"}
              {contact?.email ?? ""}
            </Text>
          </View>
          <View style={local.metaCol}>
            <Text style={local.metaLabel}>Invoice no.</Text>
            <Text style={local.metaValue}>{invoice.id.slice(0, 8).toUpperCase()}</Text>
          </View>
          <View style={local.metaCol}>
            <Text style={local.metaLabel}>Issued</Text>
            <Text style={local.metaValue}>{issued}</Text>
          </View>
          {invoice.status !== "draft" ? (
            <View style={local.metaCol}>
              <Text style={local.metaLabel}>Status</Text>
              <Text style={local.metaValue}>{invoice.status.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>

        <View style={local.table}>
          <View style={local.thead}>
            <Text style={[local.th, { flex: 3 }]}>Description</Text>
            <Text style={[local.th, { flex: 1, textAlign: "right" }]}>Amount</Text>
            <Text style={[local.th, { flex: 1, textAlign: "right" }]}>Discount</Text>
            <Text style={[local.th, { flex: 1, textAlign: "right" }]}>Line total</Text>
          </View>
          {lines.map((l) => (
            <View key={l.id} style={local.row} wrap={false}>
              <Text style={local.cellDescription}>{l.description || "—"}</Text>
              <Text style={local.cellNumber}>{formatPrice(l.amount_eur)}</Text>
              <Text style={local.cellNumber}>
                {l.discount_eur > 0 ? `-${formatPrice(l.discount_eur)}` : "—"}
              </Text>
              <Text style={local.cellNumber}>
                {formatPrice(l.amount_eur - l.discount_eur)}
              </Text>
            </View>
          ))}
        </View>

        <View style={local.totals}>
          <View style={local.totalLine}>
            <Text style={local.totalLabel}>Subtotal</Text>
            <Text style={local.totalValue}>{formatPrice(subtotal)}</Text>
          </View>
          {totalDiscount > 0 ? (
            <View style={local.totalLine}>
              <Text style={local.totalLabel}>Discount</Text>
              <Text style={local.totalValue}>-{formatPrice(totalDiscount)}</Text>
            </View>
          ) : null}
          <View style={local.totalLine}>
            <Text style={local.grandLabel}>Total (EUR)</Text>
            <Text style={local.grandValue}>{formatPrice(total)}</Text>
          </View>
        </View>

        {invoice.stripe_payment_link ? (
          <View style={local.payCta}>
            <Text style={local.payText}>
              To pay this invoice online, follow the secure Stripe link
              below.
            </Text>
            <Text style={local.payLink}>{invoice.stripe_payment_link}</Text>
          </View>
        ) : null}

        <View style={baseStyles.footer} fixed>
          <Text>{galleryName} · Currency EUR</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
