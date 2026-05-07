import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useArtists } from "@/hooks/useArtists";
import { useArtworks } from "@/hooks/useArtworks";
import {
  useUploadArtworks,
  type DraftArtwork,
} from "@/hooks/useUploadArtworks";
import { parseFilename, type ParseResult } from "@/lib/filename-parser";
import { cn } from "@/lib/utils";

type DraftRow = DraftArtwork & {
  preview_url: string;
  parse: ParseResult;
};

function nextInternalId(existing: string[], offset: number): string {
  const max = existing
    .map((s) => /^YG-(\d+)$/.exec(s)?.[1])
    .filter((s): s is string => !!s)
    .map((n) => parseInt(n, 10))
    .reduce((acc, n) => Math.max(acc, n), 0);
  const n = max + 1 + offset;
  return `YG-${String(n).padStart(4, "0")}`;
}

export default function BulkUpload() {
  const navigate = useNavigate();
  const artistsQuery = useArtists();
  const artworksQuery = useArtworks();
  const upload = useUploadArtworks();
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const artists = artistsQuery.data ?? [];
  const knownIds = useMemo(
    () => (artworksQuery.data ?? []).map((a) => a.internal_id),
    [artworksQuery.data],
  );

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const known = artists.map((a) => a.name);
    setDrafts((prev) => {
      const startOffset = prev.length;
      return [
        ...prev,
        ...list.map((file, i): DraftRow => {
          const parse = parseFilename(file.name, known);
          const matchedArtist =
            parse.artist_match === "exact" && parse.artist_name
              ? artists.find(
                  (a) =>
                    a.name.trim().toLowerCase() ===
                    parse.artist_name!.trim().toLowerCase(),
                )
              : undefined;
          return {
            client_key: crypto.randomUUID(),
            file,
            preview_url: URL.createObjectURL(file),
            parse,
            title: parse.title ?? file.name.replace(/\.[a-z0-9]{2,5}$/i, ""),
            internal_id: nextInternalId(knownIds, startOffset + i),
            artist_id: matchedArtist?.id ?? null,
            artist_name_new: matchedArtist
              ? null
              : parse.artist_name ?? null,
            width_cm: parse.width_cm,
            height_cm: parse.height_cm,
            depth_cm: parse.depth_cm,
          };
        }),
      ];
    });
  }

  function update(key: string, patch: Partial<DraftRow>) {
    setDrafts((prev) =>
      prev.map((d) => (d.client_key === key ? { ...d, ...patch } : d)),
    );
  }

  function remove(key: string) {
    setDrafts((prev) => {
      const removed = prev.find((d) => d.client_key === key);
      if (removed) URL.revokeObjectURL(removed.preview_url);
      return prev.filter((d) => d.client_key !== key);
    });
  }

  const ready =
    drafts.length > 0 &&
    drafts.every(
      (d) =>
        d.title.trim() &&
        d.internal_id.trim() &&
        (d.artist_id || (d.artist_name_new && d.artist_name_new.trim())),
    );

  async function onSubmit() {
    const results = await upload.mutateAsync(drafts);
    const ok = results.filter((r) => !r.error).length;
    const failed = results.length - ok;
    if (failed === 0) {
      toast.success(`Uploaded ${ok} artwork${ok === 1 ? "" : "s"}.`);
      drafts.forEach((d) => URL.revokeObjectURL(d.preview_url));
      navigate("/inventory");
    } else {
      toast.error(`Uploaded ${ok}, ${failed} failed.`);
      setDrafts((prev) =>
        prev.filter((d) => {
          const r = results.find((x) => x.client_key === d.client_key);
          return r?.error;
        }),
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/inventory">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bulk upload</h1>
        <p className="text-sm text-muted-foreground">
          Drop images. Filenames in <code>Title_40x40cm_Artist</code> or{" "}
          <code>Artist_Title_40x40cm</code> are parsed automatically. Confirm
          each row, then upload.
        </p>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "block cursor-pointer rounded-md border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/40",
          dragOver && "border-foreground/60 bg-accent/40",
        )}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.currentTarget.value = "";
          }}
        />
        <Upload className="mx-auto mb-2 h-5 w-5" />
        Drop images here or click to choose
      </label>

      {drafts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nothing to upload yet</CardTitle>
            <CardDescription>
              Add images above to start. {artists.length} artist
              {artists.length === 1 ? "" : "s"} on file for matching.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="w-16 px-3 py-2 text-left font-medium">Image</th>
                <th className="px-3 py-2 text-left font-medium">Title</th>
                <th className="px-3 py-2 text-left font-medium">Artist</th>
                <th className="w-32 px-3 py-2 text-left font-medium">
                  Internal ID
                </th>
                <th className="w-40 px-3 py-2 text-left font-medium">
                  Size (cm)
                </th>
                <th className="w-10 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((d) => {
                const ambiguous =
                  d.parse.format === "unknown" || d.parse.artist_match === "none";
                return (
                  <tr key={d.client_key} className="border-t border-border align-top">
                    <td className="px-3 py-2">
                      <img
                        src={d.preview_url}
                        alt=""
                        className="h-12 w-12 rounded-sm object-cover"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={d.title}
                        onChange={(e) =>
                          update(d.client_key, { title: e.target.value })
                        }
                        className="h-9"
                      />
                      {ambiguous ? (
                        <p className="mt-1 text-xs text-[hsl(var(--attention))]">
                          Filename did not parse cleanly — check fields.
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={d.artist_id ?? "__new__"}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "__new__") {
                            update(d.client_key, {
                              artist_id: null,
                              artist_name_new:
                                d.artist_name_new ?? d.parse.artist_name ?? "",
                            });
                          } else {
                            update(d.client_key, {
                              artist_id: v,
                              artist_name_new: null,
                            });
                          }
                        }}
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="__new__">+ Create new artist</option>
                        {artists.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                      {d.artist_id === null ? (
                        <Input
                          value={d.artist_name_new ?? ""}
                          onChange={(e) =>
                            update(d.client_key, {
                              artist_name_new: e.target.value,
                            })
                          }
                          placeholder="New artist name"
                          className="mt-1 h-9"
                        />
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={d.internal_id}
                        onChange={(e) =>
                          update(d.client_key, { internal_id: e.target.value })
                        }
                        className="h-9"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.1"
                          value={d.width_cm ?? ""}
                          onChange={(e) =>
                            update(d.client_key, {
                              width_cm: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                          placeholder="W"
                          className="h-9"
                        />
                        <span className="text-muted-foreground">×</span>
                        <Input
                          type="number"
                          step="0.1"
                          value={d.height_cm ?? ""}
                          onChange={(e) =>
                            update(d.client_key, {
                              height_cm: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                          placeholder="H"
                          className="h-9"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(d.client_key)}
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Label className="mr-auto text-xs text-muted-foreground">
          {drafts.length} file{drafts.length === 1 ? "" : "s"} ready
        </Label>
        <Button
          onClick={onSubmit}
          disabled={!ready || upload.isPending}
        >
          {upload.isPending ? "Uploading…" : "Upload all"}
        </Button>
      </div>
    </div>
  );
}
