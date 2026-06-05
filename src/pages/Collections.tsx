import { useState } from "react";
import { Link } from "react-router-dom";
import { Folder, Search } from "lucide-react";
import { useCollections } from "@/hooks/useCollections";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const KIND_LABEL: Record<string, string> = {
  exhibition: "Exhibition",
  fair: "Art fair",
  viewing_room: "Viewing room",
  other: "Other",
};

export default function Collections() {
  const { data, isLoading, error } = useCollections();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const collections = (data ?? []).filter((c) =>
    query ? c.name.toLowerCase().includes(query) : true,
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
        <p className="text-sm text-muted-foreground">
          Curated groups of artworks (exhibitions, art fair booths, viewing
          rooms). Build from the inventory page using multi-select.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search collections…"
          className="h-9 max-w-sm"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          Could not load collections. {(error as Error).message}
        </p>
      ) : collections.length === 0 ? (
        <Card>
          <CardHeader>
            {query ? (
              <>
                <CardTitle>No matches</CardTitle>
                <CardDescription>
                  No collections match "{q}".
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle>No collections yet</CardTitle>
                <CardDescription>
                  Select artworks from the inventory page and choose "Add to
                  collection" to create your first one.
                </CardDescription>
              </>
            )}
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <Link
              key={c.id}
              to={`/collections/${c.id}`}
              className="rounded-md border border-border bg-card p-4 transition-colors hover:border-foreground/40"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{c.name}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {KIND_LABEL[c.kind] ?? c.kind} · {c.artwork_count} artwork
                {c.artwork_count === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
