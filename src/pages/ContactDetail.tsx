import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useContact, useContactActivity, useUpdateContact } from "@/hooks/useContacts";
import {
  useAttachContactTag,
  useCreateAndAttachContactTag,
  useDetachContactTag,
} from "@/hooks/useContactTags";
import { useTags } from "@/hooks/useTags";
import type { ContactActivityKind } from "@/integrations/supabase/domain";
import { ActivityTimeline } from "@/components/shared/ActivityTimeline";

const ACTIVITY_LABEL: Record<ContactActivityKind, string> = {
  artwork_shown: "Artwork shown",
  dossier_sent: "Dossier sent",
  reply: "Reply",
  purchase: "Purchase",
};

export default function ContactDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: contact, isLoading } = useContact(id);
  const tagsQuery = useTags();
  const activityQuery = useContactActivity(id);
  const update = useUpdateContact();
  const attach = useAttachContactTag();
  const detach = useDetachContactTag();
  const createAndAttach = useCreateAndAttachContactTag();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState("");
  const [notes, setNotes] = useState("");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (!contact) return;
    setName(contact.full_name);
    setEmail(contact.email);
    setInterest(contact.interest ?? "");
    setNotes(contact.notes ?? "");
  }, [contact]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!contact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contact not found</CardTitle>
          <CardDescription>
            <Link to="/contacts" className="underline">
              Back to contacts
            </Link>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const allTags = tagsQuery.data ?? [];
  const attached = allTags.filter((t) => contact.tag_ids.includes(t.id));
  const available = allTags.filter((t) => !contact.tag_ids.includes(t.id));

  async function onSave() {
    try {
      await update.mutateAsync({
        id,
        patch: {
          full_name: name,
          email,
          interest: interest || null,
          notes: notes || null,
        },
      });
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function onCreateTag(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newTag.trim();
    if (!trimmed) return;
    try {
      await createAndAttach.mutateAsync({ contact_id: id, name: trimmed });
      setNewTag("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  const activity = activityQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/contacts">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">{contact.full_name}</h1>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Interest</Label>
            <Input
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-input bg-background p-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={contact.newsletter_opt_in}
              onCheckedChange={(v) =>
                update.mutate({ id, patch: { newsletter_opt_in: v } })
              }
              ariaLabel="Toggle newsletter"
            />
            Newsletter
          </label>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={onSave} disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {attached.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags yet.</p>
              ) : (
                attached.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 rounded-sm border border-border bg-accent px-2 py-1 text-xs"
                  >
                    {t.name}
                    <button
                      type="button"
                      onClick={() =>
                        detach.mutate({ contact_id: id, tag_id: t.id })
                      }
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${t.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
            {available.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {available.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      attach.mutate({ contact_id: id, tag_id: t.id })
                    }
                    className="inline-flex items-center gap-1 rounded-sm border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" />
                    {t.name}
                  </button>
                ))}
              </div>
            ) : null}
            <form onSubmit={onCreateTag} className="flex gap-2 pt-1">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="New tag (e.g. Can Art Fair)"
                className="h-9 max-w-xs"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!newTag.trim() || createAndAttach.isPending}
              >
                {createAndAttach.isPending ? "Adding…" : "Create + add"}
              </Button>
            </form>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Activity</h2>
            {activityQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No activity yet. Artworks shown, dossiers sent, replies and
                purchases will appear here.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {activity.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start gap-3 rounded-md border border-border bg-card p-2"
                  >
                    <span className="rounded-sm border border-border bg-muted px-2 py-0.5 text-xs">
                      {ACTIVITY_LABEL[a.kind]}
                    </span>
                    <span className="flex-1">{a.note ?? a.ref_id ?? ""}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ActivityTimeline entity_type="contact" entity_id={contact.id} />
        </div>
      </div>
    </div>
  );
}
