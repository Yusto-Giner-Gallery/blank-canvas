import { useMemo, useState } from "react";
import { CalendarDays, MessageCircle, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useProgrammingEvents,
  useCreateProgrammingEvent,
  useDeleteProgrammingEvent,
  type ProgrammingEvent,
} from "@/hooks/useProgrammingEvents";
import { useLocations } from "@/hooks/useLocations";
import { useGallery } from "@/hooks/useGallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { whatsappUrl, invitationMailto } from "@/lib/invitations";
import { errorMessage } from "@/lib/utils";

const KINDS = ["exhibition", "fair", "residency", "shipping", "other"];

// date-only ISO strings ("2026-06-05") parse as UTC midnight; render with
// explicit UTC so the displayed day never drifts by a timezone.
function fmt(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(undefined, {
    ...opts,
    timeZone: "UTC",
  });
}

function eventDateLabel(e: ProgrammingEvent) {
  const start = fmt(e.start_date, { day: "numeric", month: "short", year: "numeric" });
  if (!e.end_date) return start;
  return `${fmt(e.start_date, { day: "numeric", month: "short" })} – ${fmt(e.end_date, { day: "numeric", month: "short", year: "numeric" })}`;
}

export default function Calendar() {
  const events = useProgrammingEvents();
  const locations = useLocations().data ?? [];
  const galleryName = useGallery().data?.name ?? "The gallery";
  const create = useCreateProgrammingEvent();
  const del = useDeleteProgrammingEvent();

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [locationId, setLocationId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [kind, setKind] = useState("exhibition");
  const [tags, setTags] = useState("");

  const [yearFilter, setYearFilter] = useState("");
  const [locFilter, setLocFilter] = useState("");

  const all = events.data ?? [];
  const years = useMemo(
    () =>
      Array.from(new Set(all.map((e) => e.start_date.slice(0, 4)))).sort().reverse(),
    [all],
  );

  const filtered = all.filter((e) => {
    if (yearFilter && e.start_date.slice(0, 4) !== yearFilter) return false;
    if (locFilter && e.location_id !== locFilter) return false;
    return true;
  });

  // Group by "YYYY-MM" for an agenda-by-month view.
  const groups = useMemo(() => {
    const m = new Map<string, ProgrammingEvent[]>();
    for (const e of filtered) {
      const key = e.start_date.slice(0, 7);
      const arr = m.get(key) ?? [];
      arr.push(e);
      m.set(key, arr);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !start) return;
    try {
      await create.mutateAsync({
        title: title.trim(),
        location_id: locationId || null,
        start_date: start,
        end_date: end || null,
        kind,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setTitle("");
      setStart("");
      setEnd("");
      setTags("");
      setAdding(false);
      toast.success("Event added");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Programming by space and year — shows, fairs, residencies, shipping.
          </p>
        </div>
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          <CalendarDays className="h-4 w-4" /> Add event
        </Button>
      </div>

      {adding ? (
        <Card>
          <CardHeader>
            <CardTitle>New event</CardTitle>
            <CardDescription>Tags propagate to filters across the app later.</CardDescription>
          </CardHeader>
          <form onSubmit={onAdd} className="grid gap-3 px-6 pb-6 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Space / location</Label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">—</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Kind</Label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Start date</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} required className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">End date (optional)</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Tags (comma-separated)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Madrid, 2026" className="h-9" />
            </div>
            <div className="flex items-center justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={create.isPending}>
                {create.isPending ? "Adding…" : "Add"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={locFilter}
          onChange={(e) => setLocFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">All spaces</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {events.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No events</CardTitle>
            <CardDescription>
              Add the gallery's shows, fairs and residencies to plan by space and year.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([month, items]) => (
            <section key={month} className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {fmt(`${month}-01`, { month: "long", year: "numeric" })}
              </h2>
              <div className="divide-y divide-border rounded-md border border-border bg-card">
                {items.map((ev) => {
                  const inv = {
                    title: ev.title,
                    date: eventDateLabel(ev),
                    location: ev.location?.name ?? null,
                    galleryName,
                  };
                  return (
                    <div key={ev.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{ev.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {[eventDateLabel(ev), ev.location?.name, ev.kind]
                            .filter(Boolean)
                            .join(" · ")}
                          {ev.tags && ev.tags.length > 0 ? ` · ${ev.tags.join(", ")}` : ""}
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <a href={whatsappUrl(inv)} target="_blank" rel="noreferrer">
                          <MessageCircle className="h-4 w-4" /> WhatsApp
                        </a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a href={invitationMailto(inv)}>
                          <Mail className="h-4 w-4" /> Email
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => del.mutate({ id: ev.id })}
                        aria-label="Delete event"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
