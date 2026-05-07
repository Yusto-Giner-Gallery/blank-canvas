import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useArtworks } from "@/hooks/useArtworks";

export type DraftLine = {
  artwork_id: string | null;
  description: string;
  amount_eur: number;
  discount_eur: number;
};

export function InvoiceLinesEditor({
  lines,
  onChange,
}: {
  lines: DraftLine[];
  onChange: (next: DraftLine[]) => void;
}) {
  const artworks = useArtworks().data ?? [];

  function add() {
    onChange([
      ...lines,
      { artwork_id: null, description: "", amount_eur: 0, discount_eur: 0 },
    ]);
  }
  function update(i: number, patch: Partial<DraftLine>) {
    onChange(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function remove(i: number) {
    onChange(lines.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Artwork</th>
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="w-28 px-3 py-2 text-right font-medium">Amount</th>
              <th className="w-28 px-3 py-2 text-right font-medium">Discount</th>
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No lines yet.
                </td>
              </tr>
            ) : (
              lines.map((l, i) => (
                <tr key={i} className="border-t border-border align-top">
                  <td className="px-3 py-2">
                    <select
                      value={l.artwork_id ?? ""}
                      onChange={(e) => {
                        const id = e.target.value || null;
                        const a = id ? artworks.find((x) => x.id === id) : null;
                        update(i, {
                          artwork_id: id,
                          description: a
                            ? `${a.title} — ${a.artist?.name ?? ""}`
                            : l.description,
                          amount_eur:
                            a?.price_eur != null && l.amount_eur === 0
                              ? a.price_eur
                              : l.amount_eur,
                        });
                      }}
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="">— Free-text line —</option>
                      {artworks.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.internal_id} · {a.title}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={l.description}
                      onChange={(e) => update(i, { description: e.target.value })}
                      className="h-9"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="50"
                      value={l.amount_eur || ""}
                      onChange={(e) =>
                        update(i, { amount_eur: Number(e.target.value || 0) })
                      }
                      className="h-9 text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="50"
                      value={l.discount_eur || ""}
                      onChange={(e) =>
                        update(i, { discount_eur: Number(e.target.value || 0) })
                      }
                      className="h-9 text-right"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(i)}
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" /> Add line
      </Button>
    </div>
  );
}
