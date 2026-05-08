import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { imageUrl } from "@/hooks/useArtworks";
import { useProfile } from "@/hooks/useProfile";
import { errorMessage } from "@/lib/error";
import { cn } from "@/lib/utils";

// Dossier image slot. Click or drop a file to upload to the artwork-images
// bucket under a `dossier-extras/<dossier_id>/<uuid-filename>` prefix.
// Returns the storage path via onChange so the parent can persist it in
// body_blocks. Bucket reuse is documented in CLAUDE.md §13 (dedicated
// dossier bucket TBD on Lovable).

type Props = {
  storagePath: string | null | undefined;
  dossierId: string;
  onChange: (next: string | null) => void;
  className?: string;
  // "fill" — image stretches to slot bounds (cover). "contain" — fits inside.
  fit?: "cover" | "contain";
  alt?: string;
};

export function EditableImageSlot({
  storagePath,
  dossierId,
  onChange,
  className,
  fit = "cover",
  alt,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { profile } = useProfile();
  const [uploading, setUploading] = useState(false);
  const [hovering, setHovering] = useState(false);
  const url = imageUrl(storagePath);

  async function uploadFile(file: File) {
    if (!profile) {
      toast.error("Not signed in");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please drop an image file");
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const id = crypto.randomUUID();
      const path = `dossier-extras/${dossierId}/${id}-${safeName}`;
      const { error } = await supabase.storage
        .from("artwork-images")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      onChange(path);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setHovering(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    e.target.value = "";
  }

  return (
    <div
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setHovering(true);
      }}
      onDragLeave={() => setHovering(false)}
      onDrop={onDrop}
      className={cn(
        "group relative flex cursor-pointer items-center justify-center overflow-hidden border border-dashed border-border bg-muted/40 transition-colors",
        hovering && "border-foreground bg-muted",
        className,
      )}
      role="button"
      aria-label={alt ?? "Upload image"}
    >
      {url ? (
        <img
          src={url}
          alt={alt ?? ""}
          className={cn(
            "h-full w-full",
            fit === "cover" ? "object-cover" : "object-contain",
          )}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <ImagePlus className="h-5 w-5" />
          <span>Click or drop image</span>
        </div>
      )}
      {uploading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : null}
      {url ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-background/80 px-2 py-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground group-hover:block">
          Click or drop to replace
        </div>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}
