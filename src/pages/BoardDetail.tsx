import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, CalendarClock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card as UiCard,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useBoard,
  useCreateCard,
  useCreateList,
  useDeleteList,
  useMoveCard,
} from "@/hooks/useKanban";
import { LabelDot } from "@/components/kanban/LabelChips";
import { CardDetailModal } from "@/components/kanban/CardDetailModal";
import type { Card } from "@/integrations/supabase/domain";
import { cn } from "@/lib/utils";

function isDueSoon(due: string | null): boolean {
  if (!due) return false;
  const d = new Date(due).getTime();
  const week = 7 * 24 * 60 * 60 * 1000;
  return d - Date.now() < week;
}

function CardTile({ card, onOpen }: { card: Card; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { type: "card" } });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const due = card.due_date;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return;
        // Don't open while pointer is mid-drag handler.
        e.stopPropagation();
        onOpen();
      }}
      className="cursor-pointer rounded-md border border-border bg-card p-2.5 text-sm shadow-sm hover:border-foreground/40"
    >
      {card.labels.length > 0 ? (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {card.labels.map((l) => (
            <LabelDot key={l} label={l} />
          ))}
        </div>
      ) : null}
      <div className="text-sm">{card.title}</div>
      {due ? (
        <div
          className={cn(
            "mt-1.5 inline-flex items-center gap-1 text-xs",
            isDueSoon(due) ? "text-[hsl(var(--attention))]" : "text-muted-foreground",
          )}
        >
          <CalendarClock className="h-3 w-3" />
          {new Date(due).toLocaleDateString("en-GB")}
        </div>
      ) : null}
    </div>
  );
}

function Lane({
  list,
  cards,
  boardId,
  onAddCard,
  onDeleteList,
  onOpenCard,
}: {
  list: { id: string; name: string };
  cards: Card[];
  boardId: string;
  onAddCard: (list_id: string, title: string) => void;
  onDeleteList: (list_id: string) => void;
  onOpenCard: (card: Card) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAddCard(list.id, title.trim());
    setTitle("");
    setAdding(false);
  }

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-md border border-border bg-muted/30">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {list.name}
          <span className="ml-1.5 text-foreground/60">{cards.length}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label="Delete list"
          onClick={() => {
            if (window.confirm(`Delete list "${list.name}"? Cards in it will also be removed.`))
              onDeleteList(list.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
        id={list.id}
      >
        <div className="flex flex-1 flex-col gap-2 p-2 min-h-12">
          {cards.map((c) => (
            <CardTile key={c.id} card={c} onOpen={() => onOpenCard(c)} />
          ))}
        </div>
      </SortableContext>
      {adding ? (
        <form onSubmit={submit} className="space-y-2 border-t border-border p-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Card title"
            className="h-9"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={!title.trim()}>
              Add
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="m-1 justify-start"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-4 w-4" /> Add card
        </Button>
      )}
      <span className="sr-only">board {boardId}</span>
    </div>
  );
}

export default function BoardDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { data, isLoading, error } = useBoard(id);
  const createList = useCreateList();
  const deleteList = useDeleteList();
  const createCard = useCreateCard();
  const move = useMoveCard();

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");

  // Local optimistic copy so drag feels instant.
  const [localLists, setLocalLists] = useState(
    () => data?.lists ?? [],
  );
  useEffect(() => {
    if (data) setLocalLists(data.lists);
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const cardById = useMemo(() => {
    const m = new Map<string, Card>();
    localLists.forEach((l) => l.cards.forEach((c) => m.set(c.id, c)));
    return m;
  }, [localLists]);

  function listOfCard(cardId: string) {
    return localLists.find((l) => l.cards.some((c) => c.id === cardId));
  }

  function onDragStart(e: DragStartEvent) {
    setActiveCardId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveCardId(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const fromList = listOfCard(activeId);
    if (!fromList) return;

    // overId may be a card id (drop on a sibling) or a list id (drop on
    // empty space). Resolve target list either way.
    const overList =
      localLists.find((l) => l.id === overId) ?? listOfCard(overId);
    if (!overList) return;

    let next = localLists.map((l) => ({ ...l, cards: [...l.cards] }));
    if (fromList.id === overList.id) {
      const idx = next.findIndex((l) => l.id === fromList.id);
      const ids = next[idx].cards.map((c) => c.id);
      const oldIndex = ids.indexOf(activeId);
      const newIndex = ids.indexOf(overId);
      if (newIndex === -1) return;
      const reordered = arrayMove(next[idx].cards, oldIndex, newIndex);
      next[idx] = { ...next[idx], cards: reordered };
      setLocalLists(next);
      move.mutate(
        {
          board_id: id,
          from_list_id: fromList.id,
          to_list_id: fromList.id,
          to_order: reordered.map((c) => c.id),
        },
        { onError: (err) => toast.error(err.message) },
      );
    } else {
      const fromIdx = next.findIndex((l) => l.id === fromList.id);
      const toIdx = next.findIndex((l) => l.id === overList.id);
      const movingCard = next[fromIdx].cards.find((c) => c.id === activeId);
      if (!movingCard) return;
      next[fromIdx] = {
        ...next[fromIdx],
        cards: next[fromIdx].cards.filter((c) => c.id !== activeId),
      };
      const insertAt = next[toIdx].cards.findIndex((c) => c.id === overId);
      const newCards = next[toIdx].cards.slice();
      newCards.splice(
        insertAt === -1 ? newCards.length : insertAt,
        0,
        { ...movingCard, list_id: overList.id },
      );
      next[toIdx] = { ...next[toIdx], cards: newCards };
      setLocalLists(next);
      move.mutate(
        {
          board_id: id,
          from_list_id: fromList.id,
          to_list_id: overList.id,
          from_order: next[fromIdx].cards.map((c) => c.id),
          to_order: newCards.map((c) => c.id),
        },
        { onError: (err) => toast.error(err.message) },
      );
    }
  }

  async function onAddList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    try {
      await createList.mutateAsync({ board_id: id, name: newListName.trim() });
      setNewListName("");
      setAddingList(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function onAddCard(list_id: string, title: string) {
    try {
      await createCard.mutateAsync({ board_id: id, list_id, title });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function onDeleteList(list_id: string) {
    try {
      await deleteList.mutateAsync({ board_id: id, id: list_id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error)
    return (
      <p className="text-sm text-destructive">
        Could not load board. {(error as Error).message}
      </p>
    );
  if (!data)
    return (
      <UiCard>
        <CardHeader>
          <CardTitle>Board not found</CardTitle>
          <CardDescription>
            <Link to="/kanban" className="underline">
              Back to boards
            </Link>
          </CardDescription>
        </CardHeader>
      </UiCard>
    );

  const activeCard = activeCardId ? cardById.get(activeCardId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/kanban">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">{data.name}</h1>
        <div className="ml-auto" />
        {addingList ? (
          <form onSubmit={onAddList} className="flex items-center gap-2">
            <Input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name"
              className="h-9 w-40"
              autoFocus
            />
            <Button type="submit" size="sm" disabled={!newListName.trim()}>
              Add
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAddingList(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setAddingList(true)}>
            <Plus className="h-4 w-4" /> List
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {localLists.map((l) => (
            <Lane
              key={l.id}
              list={l}
              cards={l.cards}
              boardId={id}
              onAddCard={onAddCard}
              onDeleteList={onDeleteList}
              onOpenCard={(c) => setOpenCardId(c.id)}
            />
          ))}
          {localLists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lists yet. Click "List" above to add one.
            </p>
          ) : null}
        </div>
        <DragOverlay>
          {activeCard ? (
            <div className="rounded-md border border-foreground/40 bg-card p-2.5 text-sm shadow-lg">
              {activeCard.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {openCardId ? (
        <CardDetailModal
          board_id={id}
          card_id={openCardId}
          onClose={() => setOpenCardId(null)}
        />
      ) : null}
    </div>
  );
}
