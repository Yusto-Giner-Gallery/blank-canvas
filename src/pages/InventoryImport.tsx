import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CSV_HEADERS, parseArtworkCSV, type ParsedRow } from "@/lib/csv";
import { useImportArtworks } from "@/hooks/useImportArtworks";
import { cn } from "@/lib/utils";

export default function InventoryImport() {
  const navigate = useNavigate();
  const importArtworks = useImportArtworks();
  const [filename, setFilename] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [dragOver, setDragOver] = useState(false);

  function loadFile(file: File) {
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      try {
        setRows(parseArtworkCSV(text));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    };
    reader.onerror = () => toast.error("Could not read file");
    reader.readAsText(file);
  }

  async function onSubmit() {
    if (rows.length === 0) return;
    const results = await importArtworks.mutateAsync(rows);
    const ok = results.filter((r) => !r.error).length;
    const failed = results.length - ok;
    if (failed === 0) {
      toast.success(`Imported ${ok} artwork${ok === 1 ? "" : "s"}`);
      navigate("/inventory");
    } else {
      toast.error(`Imported ${ok}, ${failed} failed. Fix errors and retry.`);
      // Keep failing rows visible by mapping outcomes back.
      const failures = results
        .filter((r) => r.error)
        .map((r) => ({ ...rows[r.index], errors: [r.error!] }));
      setRows(failures);
    }
  }

  const errorCount = rows.reduce((n, r) => n + (r.errors.length > 0 ? 1 : 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/inventory">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import CSV</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV exported from Artlogic (or any tool) with the columns
          below. Headers are case-insensitive; only <code>title</code> and{" "}
          <code>artist_name</code> are required. Missing artists and
          locations will be created on import.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Expected columns</CardTitle>
          <CardDescription className="text-xs">
            <code className="break-words">{CSV_HEADERS.join(", ")}</code>
          </CardDescription>
        </CardHeader>
      </Card>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) loadFile(f);
        }}
        className={cn(
          "block cursor-pointer rounded-md border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/40",
          dragOver && "border-foreground/60 bg-accent/40",
        )}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.currentTarget.value = "";
            if (f) loadFile(f);
          }}
        />
        <FileText className="mx-auto mb-2 h-5 w-5" />
        {filename ? `Loaded "${filename}"` : "Drop a .csv file here or click to choose"}
      </label>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No file yet</CardTitle>
            <CardDescription>
              Pick a CSV above to preview its rows.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {rows.length} row{rows.length === 1 ? "" : "s"}
            {errorCount > 0
              ? ` · ${errorCount} with errors`
              : " · all rows valid"}
            .
          </p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Title</th>
                  <th className="px-2 py-2 text-left font-medium">Artist</th>
                  <th className="px-2 py-2 text-left font-medium">Internal ID</th>
                  <th className="px-2 py-2 text-left font-medium">W × H × D</th>
                  <th className="px-2 py-2 text-left font-medium">Price</th>
                  <th className="px-2 py-2 text-left font-medium">Status</th>
                  <th className="px-2 py-2 text-left font-medium">Notes / errors</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "border-t border-border align-top",
                      r.errors.length > 0 && "bg-destructive/10",
                    )}
                  >
                    <td className="px-2 py-1.5">{r.title || "—"}</td>
                    <td className="px-2 py-1.5">{r.artist_name || "—"}</td>
                    <td className="px-2 py-1.5 font-mono text-[10px]">
                      {r.internal_id ?? "auto"}
                    </td>
                    <td className="px-2 py-1.5">
                      {[r.width_cm, r.height_cm, r.depth_cm]
                        .filter((n): n is number => typeof n === "number")
                        .join(" × ") || "—"}
                    </td>
                    <td className="px-2 py-1.5">
                      {r.price_eur != null ? `€${r.price_eur}` : "—"}
                    </td>
                    <td className="px-2 py-1.5">{r.status}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {r.errors.length > 0
                        ? r.errors.join("; ")
                        : (r.notes ?? "").slice(0, 60)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end">
            <Button
              onClick={onSubmit}
              disabled={
                rows.length === 0 ||
                errorCount > 0 ||
                importArtworks.isPending
              }
            >
              <Upload className="h-4 w-4" />
              {importArtworks.isPending
                ? "Importing…"
                : `Import ${rows.length}`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
