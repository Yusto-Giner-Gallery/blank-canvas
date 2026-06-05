import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/LocaleContext";
import { useArtworks } from "@/hooks/useArtworks";
import { useInvoices } from "@/hooks/useInvoices";
import { ActivityStream } from "@/components/dashboard/ActivityStream";
import { MyAssignments } from "@/components/dashboard/MyAssignments";
import { Notifications } from "@/components/dashboard/Notifications";

export default function Index() {
  const t = useT();
  // Live counts so the stat cards aren't permanent em-dashes. Each query
  // already runs elsewhere via the realtime hooks, so this is essentially
  // free (cached).
  const artworks = useArtworks();
  const invoices = useInvoices();
  const inventoryCount = artworks.data?.length ?? null;
  const attentionCount =
    artworks.data?.filter((a) => a.needs_attention).length ?? null;
  const openInvoiceCount =
    invoices.data?.filter((i) => i.status === "draft" || i.status === "sent")
      .length ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("dashboard.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.description")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/inventory" className="block transition-colors hover:border-foreground/40">
          <Card className="h-full transition-colors hover:border-foreground/40">
            <CardHeader>
              <CardTitle>{t("dashboard.cards.inventory")}</CardTitle>
              <CardDescription>
                {t("dashboard.cards.inventory.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {inventoryCount ?? "—"}
            </CardContent>
          </Card>
        </Link>
        <Link
          to="/inventory?attention=1"
          className="block transition-colors hover:border-foreground/40"
        >
          <Card className="h-full transition-colors hover:border-foreground/40">
            <CardHeader>
              <CardTitle>{t("dashboard.cards.attention")}</CardTitle>
              <CardDescription>
                {t("dashboard.cards.attention.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold text-[hsl(var(--attention))]">
              {attentionCount ?? "—"}
            </CardContent>
          </Card>
        </Link>
        <Link to="/invoices" className="block transition-colors hover:border-foreground/40">
          <Card className="h-full transition-colors hover:border-foreground/40">
            <CardHeader>
              <CardTitle>{t("dashboard.cards.invoices")}</CardTitle>
              <CardDescription>
                {t("dashboard.cards.invoices.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {openInvoiceCount ?? "—"}
            </CardContent>
          </Card>
        </Link>
      </div>

      <section className="space-y-2">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-[0.18em]">
            Notifications
          </h2>
          <p className="text-xs text-muted-foreground">
            To-dos teammates have sent you, and a quick way to tag someone.
          </p>
        </div>
        <Notifications />
      </section>

      <section className="space-y-2">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-[0.18em]">
            {t("assignments.title")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("assignments.description")}
          </p>
        </div>
        <MyAssignments />
      </section>

      <section className="space-y-2">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-[0.18em]">
            {t("activity.title")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("activity.description")}
          </p>
        </div>
        <ActivityStream />
      </section>
    </div>
  );
}
