import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlignLeft,
  CalendarDays,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Plus,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";
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
  useDeleteCardComment,
  useDeleteChecklistItem,
  useRemoveCardMember,
  useToggleChecklistItem,
  useUpdateCardComment,
  useUpdateChecklistItem,
  useUploadCardAttachment,
} from "@/hooks/useCardDetail";
import { useGalleryProfiles } from "@/hooks/useGalleryProfiles";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { parseMentions } from "@/lib/mentions";
import { ALL_LABELS, LabelChip, LabelPill, labelBg } from "./LabelChips";
import type { CardLabel } from "@/integrations/supabase/domain";
import { cn, errorMessage } from "@/lib/utils";

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
  const located = useMemo(() => {
    if (!board) return null;
    for (const l of board.lists) {
      const c = l.cards.find((cc) => cc.id === card_id);
      if (c) return { card: c, list: l };
    }
    return null;
  }, [board, card_id]);
  const card = located?.card ?? null;
  const list = located?.list ?? null;

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
  const updateItem = useUpdateChecklistItem();
  const addComment = useAddCardComment();
  const updateComment = useUpdateCardComment();
  const deleteComment = useDeleteCardComment();
  const uploadAttachment = useUploadCardAttachment();
  const deleteAttachment = useDeleteCardAttachment();
  const { profile: currentProfile } = useProfile();

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
      toast.error(errorMessage(err));
    }
  }

  async function onDelete() {
    if (!card) return;
    if (!window.confirm(`Delete card "${card.title}"?`)) return;
    try {
      await del.mutateAsync({ board_id, id: card.id });
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (!card) return null;

  const cover = labels[0];
  const checklistDone = checklist.filter((c) => c.done).length;
  const checklistPct =
    checklist.length === 0 ? 0 : Math.round((checklistDone / checklist.length) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-4xl border border-border bg-popover">
        {cover ? <div className={cn("h-3", labelBg(cover))} /> : null}
        <div className="flex items-start justify-between gap-2 px-5 pt-4">
          <div className="min-w-0 flex-1 space-y-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 border-0 px-0 text-base font-semibold focus-visible:border focus-visible:px-2"
            />
            {list ? (
              <p className="text-xs text-muted-foreground">
                in list <span className="text-foreground">{list.name}</span>
              </p>
            ) : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-6 px-5 pb-5 pt-4 md:grid-cols-[minmax(0,1fr)_15rem]">
          {/* MAIN COLUMN */}
          <div className="space-y-5">
            {labels.length > 0 ? (
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Labels
                </Label>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {labels.map((l) => (
                    <LabelPill key={l} label={l} />
                  ))}
                </div>
              </div>
            ) : null}

            <section>
              <div className="mb-1.5 flex items-center gap-2">
                <AlignLeft className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Description</Label>
              </div>
              <p className="mb-1 text-xs text-muted-foreground">
                Mention artworks with <code>@artwork:YG-0042</code>.
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Add a more detailed description…"
                className="w-full resize-y border border-input bg-background p-2 text-sm"
              />
            </section>

            {mentioned.length > 0 ? (
              <section>
                <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Mentioned artworks
                </Label>
                <ul className="mt-1.5 flex flex-wrap gap-2">
                  {mentioned.map((a) => (
                    <li key={a.id}>
                      <Link
                        to={`/inventory/${a.id}`}
                        className="inline-flex items-center gap-1 border border-border bg-accent px-2 py-1 text-xs hover:border-foreground/40"
                      >
                        {a.internal_id} · {a.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <div className="mb-2 flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Checklist</Label>
                {checklist.length > 0 ? (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {checklistDone}/{checklist.length}
                  </span>
                ) : null}
              </div>
              {checklist.length > 0 ? (
                <div className="mb-2 h-1 w-full bg-muted">
                  <div
                    className={cn(
                      "h-1 transition-all",
                      checklistPct === 100 ? "bg-foreground" : "bg-muted-foreground",
                    )}
                    style={{ width: `${checklistPct}%` }}
                  />
                </div>
              ) : null}
              <ul className="space-y-1.5">
                {checklist.map((it) => (
                  <ChecklistRow
                    key={it.id}
                    item={it}
                    onToggle={(done) =>
                      toggleItem.mutate({
                        card_id: card.id,
                        id: it.id,
                        done,
                      })
                    }
                    onSave={(text) =>
                      updateItem.mutate({
                        card_id: card.id,
                        id: it.id,
                        text,
                      })
                    }
                    onDelete={() =>
                      deleteItem.mutate({ card_id: card.id, id: it.id })
                    }
                  />
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
                className="mt-2 flex gap-2"
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
            </section>

            <section>
              <div className="mb-2 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Attachments</Label>
              </div>
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
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-foreground hover:text-foreground">
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
            </section>

            <section>
              <div className="mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Activity</Label>
              </div>
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
                className="mb-3 space-y-2"
              >
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  placeholder="Write a comment…"
                  className="w-full resize-y border border-input bg-background p-2 text-sm"
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
              <ul className="space-y-2">
                {comments.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No comments yet.</li>
                ) : (
                  comments.map((c) => (
                    <CommentRow
                      key={c.id}
                      comment={c}
                      isMine={c.profile_id === currentProfile?.id}
                      onSave={(body) =>
                        updateComment.mutate({
                          card_id: card.id,
                          id: c.id,
                          body,
                        })
                      }
                      onDelete={() =>
                        deleteComment.mutate({
                          card_id: card.id,
                          id: c.id,
                        })
                      }
                    />
                  ))
                )}
              </ul>
            </section>
          </div>

          {/* SIDEBAR */}
          <aside className="space-y-5">
            <div>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Add to card
              </h3>
              <div className="space-y-1">
                {/* Members */}
                <details className="group border border-border bg-background">
                  <summary className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-accent">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    Members
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {members.length}
                    </span>
                  </summary>
                  <div className="space-y-2 border-t border-border px-2.5 py-2">
                    {members.length > 0 ? (
                      <ul className="space-y-1">
                        {members.map((m) => (
                          <li
                            key={m.profile_id}
                            className="flex items-center justify-between gap-1 text-xs"
                          >
                            <span className="truncate">
                              {m.profile?.full_name ?? m.profile?.email ?? "—"}
                            </span>
                            <button
                              type="button"
                              aria-label="Remove member"
                              onClick={() =>
                                removeMember.mutate({
                                  card_id: card.id,
                                  profile_id: m.profile_id,
                                })
                              }
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {profiles.filter(
                      (p) => !members.some((m) => m.profile_id === p.id),
                    ).length > 0 ? (
                      <div className="space-y-1">
                        {profiles
                          .filter(
                            (p) => !members.some((m) => m.profile_id === p.id),
                          )
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
                              className="flex w-full items-center gap-1 px-1 py-1 text-left text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Plus className="h-3 w-3" />
                              {p.full_name || p.email}
                            </button>
                          ))}
                      </div>
                    ) : null}
                  </div>
                </details>

                {/* Labels */}
                <details className="group border border-border bg-background">
                  <summary className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-accent">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    Labels
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {labels.length}
                    </span>
                  </summary>
                  <div className="flex flex-wrap gap-1.5 border-t border-border px-2.5 py-2">
                    {ALL_LABELS.map((l) => (
                      <LabelChip
                        key={l}
                        label={l}
                        active={labels.includes(l)}
                        onClick={() => toggleLabel(l)}
                      />
                    ))}
                  </div>
                </details>

                {/* Due date */}
                <details className="group border border-border bg-background">
                  <summary className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-accent">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    Dates
                    {due ? (
                      <span className="ml-auto text-[10px] text-foreground">
                        {new Date(due).toLocaleDateString("en-GB")}
                      </span>
                    ) : null}
                  </summary>
                  <div className="border-t border-border px-2.5 py-2">
                    <Input
                      type="date"
                      value={due}
                      onChange={(e) => setDue(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </details>
              </div>
            </div>

            <div>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Actions
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                disabled={del.isPending}
                className="w-full justify-start"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {del.isPending ? "Deleting…" : "Delete card"}
              </Button>
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSave} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
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

// Inline-editable checklist row. Click the text → input, Enter or blur
// commits, Escape reverts. Matches Trello's pattern.
function ChecklistRow({
  item,
  onToggle,
  onSave,
  onDelete,
}: {
  item: { id: string; text: string; done: boolean };
  onToggle: (done: boolean) => void;
  onSave: (text: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);

  useEffect(() => {
    setDraft(item.text);
  }, [item.text]);

  function commit() {
    const next = draft.trim();
    if (next && next !== item.text) onSave(next);
    if (!next) setDraft(item.text);
    setEditing(false);
  }

  return (
    <li className="group flex items-center gap-2 text-sm">
      <Checkbox
        checked={item.done}
        onCheckedChange={(v) => onToggle(v)}
        ariaLabel={item.text}
      />
      {editing ? (
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(item.text);
              setEditing(false);
            }
          }}
          autoFocus
          className="h-7 px-2"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            "flex-1 cursor-text text-left",
            item.done && "line-through text-muted-foreground",
          )}
        >
          {item.text}
        </button>
      )}
      <button
        type="button"
        className="ml-auto text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
        aria-label="Delete item"
        onClick={onDelete}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </li>
  );
}

// Comment row with edit + delete on the user's own comments.
function CommentRow({
  comment,
  isMine,
  onSave,
  onDelete,
}: {
  comment: {
    id: string;
    body: string;
    created_at: string;
    author: { full_name?: string | null; email?: string | null } | null;
  };
  isMine: boolean;
  onSave: (body: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);

  useEffect(() => {
    setDraft(comment.body);
  }, [comment.body]);

  function commit() {
    const next = draft.trim();
    if (next && next !== comment.body) onSave(next);
    if (!next) setDraft(comment.body);
    setEditing(false);
  }

  return (
    <li className="group border border-border bg-card p-2 text-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{comment.author?.full_name ?? comment.author?.email ?? "—"}</span>
        <span>{new Date(comment.created_at).toLocaleString()}</span>
      </div>
      {editing ? (
        <div className="mt-1 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft(comment.body);
                setEditing(false);
              }
            }}
            className="w-full resize-y border border-input bg-background p-2 text-sm"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(comment.body);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={commit}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
      )}
      {isMine && !editing ? (
        <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="hover:text-foreground"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Delete this comment?")) onDelete();
            }}
            className="hover:text-destructive"
          >
            Delete
          </button>
        </div>
      ) : null}
    </li>
  );
}
