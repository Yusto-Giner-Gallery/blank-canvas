import { useMemo, useState } from "react";
import { Mail, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useContacts } from "@/hooks/useContacts";
import { useTags } from "@/hooks/useTags";
import { useLogContactActivity } from "@/hooks/useLogContactActivity";
import { generateText } from "@/lib/ai/client";
import { buildMailto } from "@/lib/email";
import type { ArtworkListItem, Dossier } from "@/integrations/supabase/domain";
import { cn } from "@/lib/utils";

export function SendToContactsModal({
  dossier,
  artworks,
  galleryName,
  onClose,
}: {
  dossier: Dossier;
  artworks: ArtworkListItem[];
  galleryName: string;
  onClose: () => void;
}) {
  const contacts = useContacts().data ?? [];
  const tags = useTags().data ?? [];
  const log = useLogContactActivity();
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [newsletterOnly, setNewsletterOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (q && !c.full_name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q))
        return false;
      if (newsletterOnly && !c.newsletter_opt_in) return false;
      for (const t of activeTags) {
        if (!c.tag_ids.includes(t)) return false;
      }
      return true;
    });
  }, [contacts, search, newsletterOnly, activeTags]);

  function toggleTag(id: string) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function openDraft(contact_id: string, contact_name: string, email: string) {
    const lead = artworks[0];
    setPendingId(contact_id);
    try {
      const body = lead
        ? await generateText({
            kind: "collector_pitch",
            artwork: lead,
            contact_name,
          })
        : `Hello ${contact_name},\n\nI thought of you for "${dossier.title}".`;
      const subject = `${galleryName} — ${dossier.title}`;
      const url = buildMailto(email, subject, body);
      window.open(url, "_blank");
      log.mutate({
        contact_id,
        kind: "dossier_sent",
        ref_id: dossier.id,
        note: dossier.title,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[80vh] w-full max-w-xl flex-col rounded-md border border-border bg-popover shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Send dossier</h2>
            <p className="text-xs text-muted-foreground">
              Filter, then click "Open draft" to write to a contact in your
              email client. A "{`Dossier sent`}" activity row is logged each time.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 border-b border-border bg-card px-4 py-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="h-9"
          />
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const on = activeTags.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className={cn(
                      "rounded-sm border px-2 py-1 text-xs transition-colors",
                      on
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/60",
                    )}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={newsletterOnly}
              onCheckedChange={setNewsletterOnly}
              ariaLabel="Newsletter only"
            />
            Newsletter opt-in only
          </label>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No contacts match.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.full_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.email}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDraft(c.id, c.full_name, c.email)}
                    disabled={pendingId === c.id}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {pendingId === c.id ? "Opening…" : "Open draft"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>
            {filtered.length} of {contacts.length} contact
            {contacts.length === 1 ? "" : "s"}
          </span>
          <Label className="text-xs text-muted-foreground">
            Mailto opens your default client. Edit before sending.
          </Label>
        </div>
      </div>
    </div>
  );
}
