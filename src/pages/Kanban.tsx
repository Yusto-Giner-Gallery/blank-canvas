import { useState } from "react";
import { Link } from "react-router-dom";
import { KanbanSquare, Plus } from "lucide-react";
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
import { useBoards, useCreateBoard } from "@/hooks/useKanban";

export default function Kanban() {
  const { data, isLoading, error } = useBoards();
  const create = useCreateBoard();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const boards = data ?? [];

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ name: name.trim() });
      setName("");
      setAdding(false);
      toast.success("Board created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-4">
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
          className="flex items-end gap-2 rounded-md border border-border bg-card p-3"
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
          <Button type="submit" size="sm" disabled={!name.trim() || create.isPending}>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <Link
              key={b.id}
              to={`/kanban/${b.id}`}
              className="rounded-md border border-border bg-card p-4 transition-colors hover:border-foreground/40"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <KanbanSquare className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{b.name}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {b.card_count} card{b.card_count === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
