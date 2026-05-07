import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileUp, LayoutGrid, List, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useArtworks } from "@/hooks/useArtworks";
import { useFilters } from "@/hooks/useFilters";
import { applyFilters } from "@/lib/filters";
import { ArtworkRow } from "@/components/inventory/ArtworkRow";
import { ArtworkCard } from "@/components/inventory/ArtworkCard";
import { FilterBar } from "@/components/inventory/FilterBar";
import {
  QuickEditPopover,
  type QuickEdit,
} from "@/components/inventory/QuickEditPopover";
import { SelectionBar } from "@/components/inventory/SelectionBar";
import { CollectionPicker } from "@/components/inventory/CollectionPicker";
import { DossierFromSelectionPicker } from "@/components/inventory/DossierFromSelectionPicker";
import { downloadCSV, exportArtworksCSV } from "@/lib/csv";
import type { ArtworkListItem } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type View = "list" | "grid";

export default function Inventory() {
  const [view, setView] = useState<View>("list");
  const [edit, setEdit] = useState<QuickEdit | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [picking, setPicking] = useState(false);
  const [pickingDossier, setPickingDossier] = useState(false);
  const { data, isLoading, error } = useArtworks();
  const { filters, activeCount } = useFilters();

  const filtered = useMemo(
    () => applyFilters(data ?? [], filters),
    [data, filters],
  );
  const total = data?.length ?? 0;

  const onQuickEdit = (a: ArtworkListItem, x: number, y: number) =>
    setEdit({ artwork: a, x, y });

  const onToggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {total} artwork{total === 1 ? "" : "s"}
            {activeCount > 0 ? ` · ${activeCount} filter${activeCount === 1 ? "" : "s"} active` : ""}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              downloadCSV(
                `ygmanager-inventory-${new Date().toISOString().slice(0, 10)}.csv`,
                exportArtworksCSV(filtered),
              )
            }
            disabled={filtered.length === 0}
            title="Export current filter as CSV"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/inventory/import">
              <FileUp className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/inventory/upload">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Bulk upload</span>
            </Link>
          </Button>
          <div className="flex items-center gap-1 rounded-md border border-border p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 px-2", view === "list" && "bg-accent text-accent-foreground")}
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 px-2", view === "grid" && "bg-accent text-accent-foreground")}
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
          </div>
        </div>
      </div>

      <FilterBar />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          Could not load artworks. {(error as Error).message}
        </p>
      ) : total === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No artworks yet</CardTitle>
            <CardDescription>
              Use Bulk upload to add the first images. Filenames in
              {" "}<code>Title_40x40cm_Artist</code> or{" "}
              <code>Artist_Title_40x40cm</code> are parsed automatically.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No matches</CardTitle>
            <CardDescription>
              {total} artwork{total === 1 ? "" : "s"} in inventory, but none
              match the current filters. Adjust or clear above.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : view === "list" ? (
        <div className="overflow-hidden rounded-md border border-border">
          {filtered.map((a) => (
            <ArtworkRow
              key={a.id}
              artwork={a}
              onQuickEdit={onQuickEdit}
              selected={selected.has(a.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((a) => (
            <ArtworkCard
              key={a.id}
              artwork={a}
              onQuickEdit={onQuickEdit}
              selected={selected.has(a.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      )}

      <SelectionBar
        count={selected.size}
        onAddToCollection={() => setPicking(true)}
        onGenerateDossier={() => setPickingDossier(true)}
        onClear={() => setSelected(new Set())}
      />

      {edit ? (
        <QuickEditPopover edit={edit} onClose={() => setEdit(null)} />
      ) : null}

      {picking ? (
        <CollectionPicker
          artwork_ids={Array.from(selected)}
          onClose={() => {
            setPicking(false);
            setSelected(new Set());
          }}
        />
      ) : null}

      {pickingDossier ? (
        <DossierFromSelectionPicker
          artwork_ids={Array.from(selected)}
          onClose={() => {
            setPickingDossier(false);
            setSelected(new Set());
          }}
        />
      ) : null}
    </div>
  );
}
