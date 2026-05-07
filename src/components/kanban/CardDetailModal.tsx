import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Paperclip, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useBoard, useDeleteCard, useUpdateCard } from "@/hooks/useKanban";
import {
  useAttachmentUrl,
  useAddCardComment,
  useAddCardMember,
  useAddChecklistItem,
  useCardAttachments,
  useCardChecklist,
  useCardComments,
  useCardMembers,
  useDeleteCardAttachment,
  useDeleteChecklistItem,
  useRemoveCardMember,
  useToggleChecklistItem,
  useUploadCardAttachment,
} from "@/hooks/useCardDetail";
import { useGalleryProfiles } from "@/hooks/useGalleryProfiles";
import { supabase } from "@/lib/supabase";
import { parseMentions } from "@/lib/mentions";
import { ALL_LABELS, LabelChip } from "./LabelChips";
import type { CardLabel } from "@/integrations/supabase/domain";

type MentionedArtwork = { id: string; internal_id: string; title: string };

function useMentioned(internal_ids: string[]) {
  return useQuery<MentionedArtwork[]>({
    queryKey: ["mentioned-artworks", internal_ids.slice().sort().join(",")],
    enabled: internal_ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artworks")
        .select("id, internal_id, title")
        .in("internal_id", internal_ids);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function CardDetailModal({
  board_id,
  card_id,
  onClose,
}: {
  board_id: string;
  card_id: string;
  onClose: () => void;
}) {
  const { data: board } = useBoard(board_id);
  const card = useMemo(() => {
    if (!board) return null;
    for (const l of board.lists) {
      const c = l.cards.find((cc) => cc.id === card_id);
      if (c) return c;
    }
    return null;
  }, [board, card_id]);

  const update = useUpdateCard();
  const del = useDeleteCard();

  const profiles = useGalleryProfiles().data ?? [];
  const members = useCardMembers(card_id).data ?? [];
  const checklist = useCardChecklist(card_id).data ?? [];
  const comments = useCardComments(card_id).data ?? [];
  const attachments = useCardAttachments(card_id).data ?? [];
  const addMember = useAddCardMember();
  const removeMember = useRemoveCardMember();
  const addItem = useAddChecklistItem();
  const toggleItem = useToggleChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const addComment = useAddCardComment();
  const uploadAttachment = useUploadCardAttachment();
  const deleteAttachment = useDeleteCardAttachment();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [labels, setLabels] = useState<CardLabel[]>([]);
  const [newItem, setNewItem] = useState("");
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (!card) return;
    setTitle(card.title);
    setDescription(card.description ?? "");
    setDue(card.due_date ? card.due_date.slice(0, 10) : "");
    setLabels(card.labels ?? []);
  }, [card]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const mentionedIds = useMemo(
    () => parseMentions(`${title}\n${description}`),
    [title, description],
  );
  const mentioned = useMentioned(mentionedIds).data ?? [];

  function toggleLabel(l: CardLabel) {
    setLabels((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l],
    );
  }

  async function onSave() {
    if (!card) return;
    try {
      await update.mutateAsync({
        board_id,
        id: card.id,
        patch: {
          title,
          description: description || null,
          due_date: due ? new Date(due).toISOString() : null,
          labels,
        },
      });
      toast.success("Saved");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function onDelete() {
    if (!card) return;
    if (!window.confirm(`Delete card "${card.title}"?`)) return;
    try {
      await del.mutateAsync({ board_id, id: card.id });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  if (!card) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-2xl space-y-4 rounded-md border border-border bg-popover p-5 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 text-base font-semibold"
          />
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Due date</Label>
            <Input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Labels</Label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_LABELS.map((l) => (
                <LabelChip
                  key={l}
                  label={l}
                  active={labels.includes(l)}
                  onClick={() => toggleLabel(l)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Description — mention artworks with{" "}
            <code>@artwork:YG-0042</code>
          </Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="w-full resize-y rounded-md border border-input bg-background p-2 text-sm"
          />
        </div>

        {mentioned.length > 0 ? (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Mentioned artworks
            </Label>
            <ul className="flex flex-wrap gap-2">
              {mentioned.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/inventory/${a.id}`}
                    className="inline-flex items-center gap-1 rounded-sm border border-border bg-accent px-2 py-1 text-xs hover:border-foreground/40"
                  >
                    {a.internal_id} · {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-xs text-muted-foreground">Members</Label>
          <div className="flex flex-wrap gap-1.5">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">None.</p>
            ) : (
              members.map((m) => (
                <span
                  key={m.profile_id}
                  className="inline-flex items-center gap-1 rounded-sm border border-border bg-accent px-2 py-1 text-xs"
                >
                  {m.profile?.full_name ?? m.profile?.email ?? "—"}
                  <button
                    type="button"
                    aria-label="Remove member"
                    onClick={() =>
                      removeMember.mutate({
                        card_id: card.id,
                        profile_id: m.profile_id,
                      })
                    }
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            )}
          </div>
          {profiles.filter((p) => !members.some((m) => m.profile_id === p.id))
            .length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {profiles
                .filter((p) => !members.some((m) => m.profile_id === p.id))
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      addMember.mutate({
                        card_id: card.id,
                        profile_id: p.id,
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-sm border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" />
                    {p.full_name || p.email}
                  </button>
                ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-xs text-muted-foreground">Checklist</Label>
          <ul className="space-y-1.5">
            {checklist.map((it) => (
              <li key={it.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={it.done}
                  onCheckedChange={(v) =>
                    toggleItem.mutate({
                      card_id: card.id,
                      id: it.id,
                      done: v,
                    })
                  }
                  ariaLabel={it.text}
                />
                <span
                  className={
                    it.done ? "line-through text-muted-foreground" : ""
                  }
                >
                  {it.text}
                </span>
                <button
                  type="button"
                  className="ml-auto text-muted-foreground hover:text-destructive"
                  aria-label="Delete item"
                  onClick={() =>
                    deleteItem.mutate({ card_id: card.id, id: it.id })
                  }
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = newItem.trim();
              if (!t) return;
              addItem.mutate(
                { card_id: card.id, text: t },
                {
                  onSuccess: () => setNewItem(""),
                  onError: (err) => toast.error(err.message),
                },
              );
            }}
            className="flex gap-2"
          >
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add a checklist item"
              className="h-9"
            />
            <Button type="submit" size="sm" disabled={!newItem.trim()}>
              Add
            </Button>
          </form>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-xs text-muted-foreground">Attachments</Label>
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <ul className="space-y-1">
              {attachments.map((a) => (
                <AttachmentRow
                  key={a.id}
                  attachment={a}
                  onDelete={() => {
                    if (!window.confirm(`Remove "${a.name}"?`)) return;
                    deleteAttachment.mutate({
                      card_id: card.id,
                      id: a.id,
                      storage_path: a.storage_path,
                    });
                  }}
                />
              ))}
            </ul>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-foreground hover:text-foreground">
            <input
              type="file"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.currentTarget.value = "";
                if (!f) return;
                uploadAttachment.mutate(
                  { card_id: card.id, file: f },
                  { onError: (err) => toast.error(err.message) },
                );
              }}
            />
            <Paperclip className="h-3.5 w-3.5" />
            {uploadAttachment.isPending ? "Uploading…" : "Upload file"}
          </label>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-xs text-muted-foreground">Comments</Label>
          <ul className="space-y-2">
            {comments.length === 0 ? (
              <li className="text-sm text-muted-foreground">No comments.</li>
            ) : (
              comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-md border border-border bg-card p-2 text-sm"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{c.author?.full_name ?? c.author?.email ?? "—"}</span>
                    <span>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
                </li>
              ))
            )}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const b = newComment.trim();
              if (!b) return;
              addComment.mutate(
                { card_id: card.id, body: b },
                {
                  onSuccess: () => setNewComment(""),
                  onError: (err) => toast.error(err.message),
                },
              );
            }}
            className="space-y-2"
          >
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              placeholder="Write a comment…"
              className="w-full resize-y rounded-md border border-input bg-background p-2 text-sm"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={!newComment.trim() || addComment.isPending}
              >
                {addComment.isPending ? "Posting…" : "Post"}
              </Button>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={onDelete} disabled={del.isPending}>
            <Trash2 className="h-4 w-4" />
            {del.isPending ? "Deleting…" : "Delete card"}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={onSave} disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttachmentRow({
  attachment,
  onDelete,
}: {
  attachment: { id: string; name: string; storage_path: string };
  onDelete: () => void;
}) {
  const { data: url } = useAttachmentUrl(attachment.storage_path);
  return (
    <li className="flex items-center gap-2 rounded-sm border border-border bg-card px-2 py-1 text-sm">
      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 truncate hover:underline"
        >
          {attachment.name}
        </a>
      ) : (
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {attachment.name}
        </span>
      )}
      <button
        type="button"
        aria-label="Remove attachment"
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </li>
  );
}
