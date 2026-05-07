import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { useDossiers } from "@/hooks/useDossiers";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DossierKind } from "@/integrations/supabase/domain";

const KIND_LABEL: Record<DossierKind, string> = {
  solo_show: "Solo show",
  group_show: "Group show",
  special: "Special",
  art_fair: "Art fair",
  collector_offer: "Collector offer",
};

export default function Dossiers() {
  const { data, isLoading, error } = useDossiers();
  const dossiers = data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dossiers</h1>
        <p className="text-sm text-muted-foreground">
          Catalogues generated from collections. Open a collection and click
          "Generate dossier" to start.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          Could not load dossiers. {(error as Error).message}
        </p>
      ) : dossiers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No dossiers yet</CardTitle>
            <CardDescription>
              Build a collection from inventory, then click "Generate
              dossier" on the collection page.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dossiers.map((d) => (
            <Link
              key={d.id}
              to={`/dossiers/${d.id}`}
              className="rounded-md border border-border bg-card p-4 transition-colors hover:border-foreground/40"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{d.title}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {KIND_LABEL[d.kind]} · {d.image_layout.length} artwork
                {d.image_layout.length === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
