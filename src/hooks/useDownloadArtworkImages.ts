import { useMutation } from "@tanstack/react-query";
import JSZip from "jszip";
import { supabase } from "@/lib/supabase";

// Fetches every artwork_images row for the artwork, downloads each blob
// from the artwork-images bucket, zips them client-side, and triggers a
// browser save. The primary image is named first; the rest follow their
// sort_order. Filenames inside the zip are `<n>_<original-basename>`.
export function useDownloadArtworkImages() {
  return useMutation<
    { count: number },
    Error,
    { artwork_id: string; internal_id: string }
  >({
    mutationFn: async ({ artwork_id, internal_id }) => {
      const { data: rows, error } = await supabase
        .from("artwork_images")
        .select("storage_path, sort_order, is_primary")
        .eq("artwork_id", artwork_id)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const images = rows ?? [];
      if (images.length === 0) throw new Error("No images to download");

      const zip = new JSZip();
      let n = 1;
      for (const img of images) {
        const { data: blob, error: dlErr } = await supabase.storage
          .from("artwork-images")
          .download(img.storage_path);
        if (dlErr) throw dlErr;
        const base =
          img.storage_path.split("/").pop()?.replace(/^\d+_/, "") ?? "image";
        const padded = String(n).padStart(2, "0");
        zip.file(`${padded}_${base}`, blob);
        n += 1;
      }

      const out = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${internal_id}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      return { count: images.length };
    },
  });
}
