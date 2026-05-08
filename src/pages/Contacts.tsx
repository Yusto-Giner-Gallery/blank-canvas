import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Camera, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useLayoutMode } from "@/lib/layout/LayoutContext";
import { SplitViewLayout } from "@/components/layout/SplitViewLayout";
import { useT } from "@/lib/i18n/LocaleContext";
import ContactDetail from "./ContactDetail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useContacts, useCreateContact, useUpdateContact } from "@/hooks/useContacts";
import { useTags } from "@/hooks/useTags";
import { SignupShare } from "@/components/crm/SignupShare";
import { ScanContactModal } from "@/components/crm/ScanContactModal";
import { cn, errorMessage } from "@/lib/utils";
import type { ContactWithTags } from "@/hooks/useContacts";

// Table render extracted so it can be used both standalone (classic mode)
// and as the `list` slot of SplitViewLayout (split mode), without an IIFE
// in the JSX that obscured the control flow.
function renderContactsTable({
  filtered,
  splitMode,
  peek,
  selectInSplit,
  update,
}: {
  filtered: ContactWithTags[];
  splitMode: boolean;
  peek: string | null;
  selectInSplit: (id: string) => void;
  update: ReturnType<typeof useUpdateContact>;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">Email</th>
            <th className="hidden px-3 py-2 text-left font-medium md:table-cell">
              Interest
            </th>
            <th className="px-3 py-2 text-left font-medium">Newsletter</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => {
            const peeked = peek === c.id;
            return (
              <tr
                key={c.id}
                className={cn(
                  "border-t border-border hover:bg-accent/40",
                  peeked && "bg-accent/80",
                )}
              >
                <td className="px-3 py-2">
                  {splitMode ? (
                    <button
                      type="button"
                      onClick={() => selectInSplit(c.id)}
                      className="text-left font-medium hover:underline"
                    >
                      {c.full_name}
                    </button>
                  ) : (
                    <Link
                      to={`/contacts/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.full_name}
                    </Link>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
                    <Mail className="h-3 w-3" /> {c.email}
                  </a>
                </td>
                <td className="hidden truncate px-3 py-2 text-muted-foreground md:table-cell">
                  {c.interest ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <Checkbox
                    checked={c.newsletter_opt_in}
                    onCheckedChange={(v) =>
                      update.mutate({ id: c.id, patch: { newsletter_opt_in: v } })
                    }
                    ariaLabel="Toggle newsletter"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Contacts() {
  const t = useT();
  const { data, isLoading, error } = useContacts();
  const tagsQuery = useTags();
  const tags = tagsQuery.data ?? [];
  const create = useCreateContact();
  const update = useUpdateContact();

  const [adding, setAdding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newInterest, setNewInterest] = useState("");
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const { mode: layoutMode } = useLayoutMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const splitMode = layoutMode === "split";
  const peek = splitMode ? searchParams.get("peek") : null;
  function selectInSplit(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set("peek", id);
    setSearchParams(next, { replace: false });
  }
  function clearSplitSelection() {
    const next = new URLSearchParams(searchParams);
    next.delete("peek");
    setSearchParams(next, { replace: true });
  }

  const contacts = data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (q) {
        const hit =
          c.full_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (activeTags.size > 0) {
        for (const t of activeTags) {
          if (!c.tag_ids.includes(t)) return false;
        }
      }
      return true;
    });
  }, [contacts, search, activeTags]);

  function toggleTag(id: string) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    try {
      await create.mutateAsync({
        full_name: newName.trim(),
        email: newEmail.trim(),
        interest: newInterest.trim() || null,
      });
      setNewName("");
      setNewEmail("");
      setNewInterest("");
      setAdding(false);
      toast.success("Contact added");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("contacts.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("contacts.summary", {
              filtered: filtered.length,
              total: contacts.length,
              plural: contacts.length === 1 ? "" : "s",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SignupShare />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScanning(true)}
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">{t("contacts.scanCard")}</span>
          </Button>
          <Button size="sm" onClick={() => setAdding((v) => !v)}>
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("contacts.addContact")}</span>
          </Button>
        </div>
      </div>

      {adding ? (
        <Card>
          <CardHeader>
            <CardTitle>New contact</CardTitle>
            <CardDescription>
              Notes can be added later from the contact page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onAdd} className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Full name</Label>
                <Input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Interest</Label>
                <Input
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="sm:col-span-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAdding(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={create.isPending}>
                  {create.isPending ? "Adding…" : "Add"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3 rounded-md border border-border bg-card p-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("contacts.searchPlaceholder")}
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
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          Could not load contacts. {(error as Error).message}
        </p>
      ) : contacts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("contacts.empty.title")}</CardTitle>
            <CardDescription>{t("contacts.empty.description")}</CardDescription>
          </CardHeader>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No matches</CardTitle>
            <CardDescription>
              {contacts.length} contact{contacts.length === 1 ? "" : "s"} on file
              but none match your filters.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : splitMode ? (
        <SplitViewLayout
          selectedId={peek}
          onClearSelection={clearSplitSelection}
          list={renderContactsTable({
            filtered,
            splitMode,
            peek,
            selectInSplit,
            update,
          })}
          detail={peek ? <ContactDetail id={peek} /> : null}
          emptyState="Select a contact from the list to see their profile."
        />
      ) : (
        renderContactsTable({
          filtered,
          splitMode,
          peek,
          selectInSplit,
          update,
        })
      )}

      {scanning ? (
        <ScanContactModal onClose={() => setScanning(false)} />
      ) : null}
    </div>
  );
}
