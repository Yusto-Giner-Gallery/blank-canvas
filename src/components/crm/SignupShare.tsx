import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, QrCode, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useGallery } from "@/hooks/useGallery";

export function SignupShare() {
  const [open, setOpen] = useState(false);
  const { data: gallery } = useGallery();
  const url =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/signup-contact${
          gallery ? `?gallery=${gallery.id}` : ""
        }`;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function copyLink() {
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <QrCode className="h-4 w-4" />
        <span className="hidden sm:inline">Share signup</span>
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm space-y-4 rounded-md border border-border bg-popover p-5 text-center shadow-lg">
            <div className="flex items-center justify-between text-left">
              <h2 className="text-base font-semibold tracking-tight">Public signup</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-left text-xs text-muted-foreground">
              Scan from a phone or share the link. The form requires no
              login and creates a contact in this gallery.
            </p>
            <div className="flex justify-center rounded-md bg-white p-4">
              <QRCodeSVG value={url} size={180} />
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-sm border border-border bg-muted px-2 py-1 text-left text-xs">
                {url}
              </code>
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
