import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFilters, type Filters } from "@/hooks/useFilters";
import { useArtists } from "@/hooks/useArtists";
import { useLocations } from "@/hooks/useLocations";
import { useTags } from "@/hooks/useTags";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: Array<{ value: Filters["status"]; label: string }> = [
  { value: "", label: "Any status" },
  { value: "available", label: "Available" },
  { value: "on_hold", label: "On hold" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
];

function selectClass(extra?: string) {
  return cn(
    "h-9 w-full rounded-md border border-input bg-background px-2 text-sm",
    extra,
  );
}

export function FilterBar() {
  const { filters, setFilters, clear, activeCount } = useFilters();
  const artists = useArtists().data ?? [];
  const locations = useLocations().data ?? [];
  const tags = useTags().data ?? [];

  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={filters.q}
          onChange={(e) => setFilters({ q: e.target.value })}
          placeholder="Search title, notes, internal ID…"
          className="h-9"
        />
        {activeCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={clear}>
            <X className="h-4 w-4" />
            Clear ({activeCount})
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <select
            className={selectClass()}
            value={filters.status}
            onChange={(e) =>
              setFilters({ status: e.target.value as Filters["status"] })
            }
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value || "any"} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Location</Label>
          <select
            className={selectClass()}
            value={filters.location_id}
            onChange={(e) => setFilters({ location_id: e.target.value })}
          >
            <option value="">Any location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Artist</Label>
          <select
            className={selectClass()}
            value={filters.artist_id}
            onChange={(e) => setFilters({ artist_id: e.target.value })}
          >
            <option value="">Any artist</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tag</Label>
          <select
            className={selectClass()}
            value={filters.tag_id}
            onChange={(e) => setFilters({ tag_id: e.target.value })}
          >
            <option value="">Any tag</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Price € (min / max)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="100"
              value={filters.price_min ?? ""}
              onChange={(e) =>
                setFilters({
                  price_min: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="0"
              className="h-9"
            />
            <Input
              type="number"
              step="100"
              value={filters.price_max ?? ""}
              onChange={(e) =>
                setFilters({
                  price_max: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="2000"
              className="h-9"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Year (min / max)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={filters.year_min ?? ""}
              onChange={(e) =>
                setFilters({
                  year_min: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="1980"
              className="h-9"
            />
            <Input
              type="number"
              value={filters.year_max ?? ""}
              onChange={(e) =>
                setFilters({
                  year_max: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="2026"
              className="h-9"
            />
          </div>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">
            Artist nationality (contains)
          </Label>
          <Input
            value={filters.nationality}
            onChange={(e) => setFilters({ nationality: e.target.value })}
            placeholder="Spanish"
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}
