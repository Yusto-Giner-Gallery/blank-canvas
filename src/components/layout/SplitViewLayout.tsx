import { useEffect, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Two-pane wrapper for the master-detail layout. Left: a narrower list, the
// "master." Right: the currently-peeked record's detail component, the
// "detail." Mobile (< md) collapses to single-pane: when `selectedId` is
// set, the detail covers the list; a back affordance returns the user.
//
// The list keeps its scroll position when switching between detail records
// because the list element itself doesn't unmount; only the detail pane's
// child does.
//
// Usage:
//   <SplitViewLayout
//     list={<MyList onSelect={setPeek} selectedId={peek} />}
//     detail={peek ? <MyDetail id={peek} inline /> : null}
//     selectedId={peek}
//     onClearSelection={() => setPeek(null)}
//     listWidth="w-80"
//   />

type Props = {
  list: React.ReactNode;
  detail: React.ReactNode;
  selectedId: string | null;
  onClearSelection: () => void;
  /** Tailwind width class for the list pane on md+. Default w-96 (384 px). */
  listWidth?: string;
  /** Optional empty-state node for when nothing is selected on md+. */
  emptyState?: React.ReactNode;
};

export function SplitViewLayout({
  list,
  detail,
  selectedId,
  onClearSelection,
  listWidth = "md:w-96",
  emptyState,
}: Props) {
  const detailRef = useRef<HTMLDivElement>(null);

  // Scroll the detail pane to the top whenever a different record is
  // selected — without this, peeking a tall artwork then a short one
  // leaves the second view scrolled mid-page.
  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0 });
  }, [selectedId]);

  const hasSelection = selectedId != null && selectedId !== "";

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[480px] gap-0 overflow-hidden border border-border bg-background">
      {/* List pane. Hidden on mobile when a detail is active so the user
          gets the full width for the record. */}
      <div
        className={cn(
          "flex flex-col border-r border-border",
          "w-full md:w-auto",
          listWidth,
          hasSelection ? "hidden md:flex" : "flex",
        )}
      >
        <div className="flex-1 overflow-y-auto">{list}</div>
      </div>

      {/* Detail pane. */}
      <div
        ref={detailRef}
        className={cn(
          "flex-1 overflow-y-auto bg-background",
          hasSelection ? "block" : "hidden md:block",
        )}
      >
        {hasSelection ? (
          <>
            {/* Mobile-only "back to list" affordance. Hidden on md+ since
                the list is already visible alongside. */}
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background px-4 py-2 md:hidden">
              <button
                type="button"
                onClick={onClearSelection}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            </div>
            <div className="p-4 md:p-6">{detail}</div>
          </>
        ) : (
          <div className="hidden h-full items-center justify-center text-sm text-muted-foreground md:flex">
            {emptyState ?? "Select a record from the list to see its details."}
          </div>
        )}
      </div>
    </div>
  );
}
