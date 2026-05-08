import { useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useDeleteBoard,
  useUpdateBoard,
  type BoardCover,
  type BoardWithCount,
} from "@/hooks/useKanban";
import { labelBg } from "./LabelChips";
import { cn, errorMessage } from "@/lib/utils";

const COVER_OPTIONS: BoardCover[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
];

export function EditBoardModal({
  board,
  onClose,
}: {
  board: BoardWithCount;
  onClose: () => void;
}) {
  const update = useUpdateBoard();
  const del = useDeleteBoard();
  const [name, setName] = useState(board.name);
  const [color, setColor] = useState<BoardCover | null>(board.color ?? null);
  const [starred, setStarred] = useState<boolean>(!!board.starred);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await update.mutateAsync({
        id: board.id,
        patch: { name: name.trim(), color, starred },
      });
      toast.success("Board updated");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onDelete() {
    if (
      !window.confirm(
        `Delete board "${board.name}"? Lists and cards will also be deleted.`,
      )
    )
      return;
    try {
      await del.mutateAsync({ id: board.id });
      toast.success("Board deleted");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={onSave}
        className="w-full max-w-md space-y-4 border border-border bg-popover p-5"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Edit board</h2>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cover</Label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setColor(null)}
              aria-label="No cover"
              className={cn(
                "h-7 w-12 border",
                color === null
                  ? "border-foreground"
                  : "border-border opacity-70 hover:opacity-100",
              )}
            />
            {COVER_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Cover ${c}`}
                className={cn(
                  "h-7 w-12 border transition-opacity",
                  labelBg(c),
                  color === c
                    ? "border-foreground"
                    : "border-transparent opacity-80 hover:opacity-100",
                )}
              />
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={starred}
            onChange={(e) => setStarred(e.target.checked)}
            className="h-4 w-4 accent-foreground"
          />
          <Star
            className={cn(
              "h-4 w-4",
              starred ? "fill-accent-red text-accent-red" : "text-muted-foreground",
            )}
          />
          Pin to the Starred section
        </label>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={del.isPending}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {del.isPending ? "Deleting…" : "Delete"}
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || update.isPending}
            >
              {update.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
