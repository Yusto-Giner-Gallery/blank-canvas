import { FileText, FolderPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SelectionBar({
  count,
  onAddToCollection,
  onGenerateDossier,
  onClear,
}: {
  count: number;
  onAddToCollection: () => void;
  onGenerateDossier: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="sticky bottom-4 z-30 mx-auto flex w-fit items-center gap-2 rounded-md border border-border bg-popover px-3 py-2 shadow-lg">
      <span className="text-sm">{count} selected</span>
      <Button size="sm" onClick={onAddToCollection}>
        <FolderPlus className="h-4 w-4" />
        Add to collection
      </Button>
      <Button size="sm" variant="outline" onClick={onGenerateDossier}>
        <FileText className="h-4 w-4" />
        Generate dossier
      </Button>
      <Button variant="ghost" size="sm" onClick={onClear} aria-label="Clear">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
