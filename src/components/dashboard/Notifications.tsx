import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Send } from "lucide-react";
import { toast } from "sonner";
import {
  useMyNotifications,
  useCreateNotification,
  useSetNotificationDone,
} from "@/hooks/useNotifications";
import { useGalleryProfiles } from "@/hooks/useGalleryProfiles";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { errorMessage } from "@/lib/utils";

// Dashboard notifications (5.2): tag a teammate with a to-do; it shows on
// their dashboard with a checkbox to mark done.
export function Notifications() {
  const { profile } = useProfile();
  const notifications = useMyNotifications();
  const profiles = useGalleryProfiles().data ?? [];
  const create = useCreateNotification();
  const setDone = useSetNotificationDone();

  const [recipient, setRecipient] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");

  const others = profiles.filter((p) => p.id !== profile?.id);
  const open = (notifications.data ?? []).filter((n) => !n.done);
  const done = (notifications.data ?? []).filter((n) => n.done);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!recipient || !body.trim()) return;
    create.mutate(
      { recipient_profile_id: recipient, body: body.trim(), link: link.trim() || null },
      {
        onSuccess: () => {
          setBody("");
          setLink("");
          toast.success("Notification sent");
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={send}
        className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 sm:flex-row sm:items-center"
      >
        <select
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm sm:w-40"
          aria-label="Notify teammate"
        >
          <option value="">Notify…</option>
          {others.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name ?? "Unnamed"}
            </option>
          ))}
        </select>
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="e.g. please send this invoice to Daniel tomorrow"
          className="h-9 flex-1"
        />
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link (optional)"
          className="h-9 sm:w-40"
        />
        <Button type="submit" size="sm" disabled={create.isPending || !recipient || !body.trim()}>
          <Send className="h-4 w-4" /> Send
        </Button>
      </form>

      {open.length === 0 && done.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell className="h-4 w-4" /> No notifications. Tag a teammate above to
          leave them a to-do.
        </p>
      ) : (
        <ul className="space-y-2">
          {[...open, ...done].map((n) => (
            <li
              key={n.id}
              className="flex items-start gap-3 rounded-md border border-border bg-card p-2 text-sm"
            >
              <Checkbox
                checked={n.done}
                onCheckedChange={(v) => setDone.mutate({ id: n.id, done: v })}
                ariaLabel="Mark done"
              />
              <span className={n.done ? "flex-1 text-muted-foreground line-through" : "flex-1"}>
                {n.body}
                {n.link ? (
                  <Link to={n.link} className="ml-2 text-xs underline">
                    open
                  </Link>
                ) : null}
                <span className="ml-2 text-xs text-muted-foreground">
                  {n.sender?.full_name ? `— ${n.sender.full_name}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
