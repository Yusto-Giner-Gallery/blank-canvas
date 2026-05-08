import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useBoards,
  useCreateBoard,
  useUpdateBoard,
  type BoardWithCount,
} from "@/hooks/useKanban";
import { useGalleryProfiles } from "@/hooks/useGalleryProfiles";
import { AvatarStack } from "@/components/kanban/Avatar";
import { EditBoardModal } from "@/components/kanban/EditBoardModal";
import { labelBg } from "@/components/kanban/LabelChips";
import { cn, errorMessage } from "@/lib/utils";

export default function Kanban() {
  const { data, isLoading, error } = useBoards();
  const create = useCreateBoard();
  const updateBoard = useUpdateBoard();
  const galleryProfiles = useGalleryProfiles().data ?? [];
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<BoardWithCount | null>(null);

  const boards = data ?? [];

  const { starred, others } = useMemo(() => {
    const s = boards.filter((b) => b.starred);
    const o = boards.filter((b) => !b.starred);
    return { starred: s, others: o };
  }, [boards]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ name: name.trim() });
      setName("");
      setAdding(false);
      toast.success("Board created");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function toggleStar(b: BoardWithCount) {
    try {
      await updateBoard.mutateAsync({
        id: b.id,
        patch: { starred: !b.starred },
      });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Boards</h1>
          <p className="text-sm text-muted-foreground">
            {boards.length} board{boards.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New board</span>
        </Button>
      </div>

      {adding ? (
        <form
          onSubmit={onCreate}
          className="flex items-end gap-2 border border-border bg-card p-3"
        >
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. May Shipments, Kiev Art Fair"
              className="h-9"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!name.trim() || create.isPending}
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </form>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          Could not load boards. {(error as Error).message}
        </p>
      ) : boards.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No boards yet</CardTitle>
            <CardDescription>
              Click "New board" to start tracking shipments, fairs or any
              checklist of work.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {starred.length > 0 ? (
            <Section
              label="Starred"
              icon={<Star className="h-3.5 w-3.5 fill-accent-red text-accent-red" />}
              boards={starred}
              members={galleryProfiles}
              onEdit={setEditing}
              onToggleStar={toggleStar}
            />
          ) : null}
          <Section
            label={starred.length > 0 ? "All boards" : undefined}
            boards={others}
            members={galleryProfiles}
            onEdit={setEditing}
            onToggleStar={toggleStar}
          />
        </div>
      )}

      {editing ? (
        <EditBoardModal board={editing} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}

function Section({
  label,
  icon,
  boards,
  members,
  onEdit,
  onToggleStar,
}: {
  label?: string;
  icon?: React.ReactNode;
  boards: BoardWithCount[];
  members: Array<{ id: string; full_name?: string | null; email?: string | null }>;
  onEdit: (b: BoardWithCount) => void;
  onToggleStar: (b: BoardWithCount) => void;
}) {
  if (boards.length === 0) return null;
  return (
    <div className="space-y-3">
      {label ? (
        <h2 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {icon}
          {label}
        </h2>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {boards.map((b) => (
          <BoardTile
            key={b.id}
            board={b}
            members={members}
            onEdit={() => onEdit(b)}
            onToggleStar={() => onToggleStar(b)}
          />
        ))}
      </div>
    </div>
  );
}

function BoardTile({
  board,
  members,
  onEdit,
  onToggleStar,
}: {
  board: BoardWithCount;
  members: Array<{ id: string; full_name?: string | null; email?: string | null }>;
  onEdit: () => void;
  onToggleStar: () => void;
}) {
  return (
    <div className="group relative overflow-hidden border border-border bg-card transition-colors hover:border-foreground/40">
      <div className={cn("h-2", board.color ? labelBg(board.color) : "bg-muted")} />
      <Link to={`/kanban/${board.id}`} className="block px-4 py-3">
        <div className="text-sm font-semibold leading-tight">{board.name}</div>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <AvatarStack members={members} max={4} />
          <span>
            {board.card_count} card{board.card_count === 1 ? "" : "s"}
          </span>
        </div>
      </Link>
      <div className="absolute right-2 top-2 flex items-center gap-1">
        <button
          type="button"
          aria-label={board.starred ? "Unstar" : "Star"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleStar();
          }}
          className={cn(
            "flex h-7 w-7 items-center justify-center border bg-background transition-opacity",
            board.starred
              ? "border-accent-red opacity-100"
              : "border-border opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          <Star
            className={cn(
              "h-3.5 w-3.5",
              board.starred ? "fill-accent-red text-accent-red" : "text-muted-foreground",
            )}
          />
        </button>
        <button
          type="button"
          aria-label="Edit board"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="flex h-7 w-7 items-center justify-center border border-border bg-background opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
