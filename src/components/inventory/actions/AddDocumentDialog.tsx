import { useEffect, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  documentUrl,
  useArtworkDocuments,
  useDeleteArtworkDocument,
  useUploadArtworkDocument,
} from "@/hooks/useArtworkDocuments";

const MAX_BYTES = 25 * 1024 * 1024;

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function AddDocumentDialog({
  artwork_id,
  artwork_title,
  onClose,
}: {
  artwork_id: string;
  artwork_title: string;
  onClose: () => void;
}) {
  const docs = useArtworkDocuments(artwork_id);
  const upload = useUploadArtworkDocument();
  const remove = useDeleteArtworkDocument();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("File exceeds 25 MB cap");
      return;
    }
    setPendingFile(file);
  }

  async function onUpload() {
    if (!pendingFile) return;
    try {
      await upload.mutateAsync({ artwork_id, file: pendingFile });
      toast.success("Document uploaded");
      setPendingFile(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onDelete(doc_id: string, storage_path: string) {
    if (!window.confirm("Delete this document?")) return;
    try {
      await remove.mutateAsync({
        document_id: doc_id,
        artwork_id,
        storage_path,
      });
      toast.success("Document removed");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const docList = docs.data ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label={`Documents for ${artwork_title}`}
        className="w-full max-w-md space-y-4 rounded-md border border-border bg-popover p-5 shadow-lg"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Certificates, condition reports, signed agreements. Max 25 MB.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Upload new file
          </Label>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={onPick}
          />
          {!pendingFile ? (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> Choose file
            </Button>
          ) : (
            <div className="flex items-center justify-between gap-2 border border-border px-2 py-1.5 text-sm">
              <span className="truncate">
                {pendingFile.name}
                <span className="ml-2 text-xs text-muted-foreground">
                  {fmtBytes(pendingFile.size)}
                </span>
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingFile(null)}
                  disabled={upload.isPending}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={onUpload}
                  disabled={upload.isPending}
                >
                  {upload.isPending ? "Uploading…" : "Upload"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-xs text-muted-foreground">
            Existing documents
          </Label>
          {docs.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : docList.length === 0 ? (
            <p className="text-xs text-muted-foreground">None yet.</p>
          ) : (
            <ul className="space-y-1">
              {docList.map((d) => {
                const url = documentUrl(d.storage_path);
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 border border-border px-2 py-1.5 text-sm"
                  >
                    <a
                      href={url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate hover:underline"
                    >
                      {d.filename}
                    </a>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {d.byte_size != null ? fmtBytes(d.byte_size) : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDelete(d.id, d.storage_path)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${d.filename}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
