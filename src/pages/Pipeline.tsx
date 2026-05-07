import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useDeals,
  useUpdateDealStage,
  type DealListItem,
} from "@/hooks/useDeals";
import { NewDealModal } from "@/components/pipeline/NewDealModal";
import type { DealStage } from "@/integrations/supabase/domain";
import { cn } from "@/lib/utils";

const STAGES: Array<{ value: DealStage; label: string }> = [
  { value: "lead", label: "Lead" },
  { value: "interested", label: "Interested" },
  { value: "offer_sent", label: "Offer sent" },
  { value: "negotiating", label: "Negotiating" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

function formatPrice(eur: number | null) {
  if (eur == null) return "";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(eur);
}

function DealCard({ deal }: { deal: DealListItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: deal.id });
  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.6 : 1,
      }
    : { opacity: isDragging ? 0.6 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded-md border border-border bg-card p-3 text-sm shadow-sm hover:border-foreground/40"
    >
      <div className="truncate font-medium">{deal.title}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">
        {deal.contact?.full_name ?? "—"}
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">
          {deal.artwork ? deal.artwork.internal_id : "No artwork"}
        </span>
        <span className="font-medium text-foreground">
          {formatPrice(
            deal.value_eur ?? deal.artwork?.price_eur ?? null,
          )}
        </span>
      </div>
    </div>
  );
}

function Column({
  stage,
  label,
  deals,
}: {
  stage: DealStage;
  label: string;
  deals: DealListItem[];
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 flex-shrink-0 flex-col rounded-md border border-border bg-muted/30",
        isOver && "border-foreground/60 bg-accent/40",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span>{deals.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2">
        {deals.length === 0 ? (
          <p className="px-1 text-xs text-muted-foreground">—</p>
        ) : (
          deals.map((d) => <DealCard key={d.id} deal={d} />)
        )}
      </div>
    </div>
  );
}

export default function Pipeline() {
  const { data, isLoading, error } = useDeals();
  const updateStage = useUpdateDealStage();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const byStage = useMemo(() => {
    const map = new Map<DealStage, DealListItem[]>();
    STAGES.forEach((s) => map.set(s.value, []));
    (data ?? []).forEach((d) => {
      map.get(d.stage)?.push(d);
    });
    return map;
  }, [data]);

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const next = String(over.id) as DealStage;
    if (!STAGES.find((s) => s.value === next)) return;
    const deal = (data ?? []).find((d) => d.id === active.id);
    if (!deal || deal.stage === next) return;
    updateStage.mutate(
      { deal, next_stage: next },
      {
        onSuccess: ({ invoice_id }) => {
          if (invoice_id) {
            toast.success("Deal won — draft invoice created", {
              action: {
                label: "View invoice",
                onClick: () => navigate(`/invoices/${invoice_id}`),
              },
            });
          }
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Drag a deal across columns to update its stage. Reaching "Won"
            auto-generates a draft invoice for that contact.
          </p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New deal</span>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          Could not load deals. {(error as Error).message}
        </p>
      ) : (data ?? []).length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No deals yet</CardTitle>
            <CardDescription>
              Click "New deal" to track an interested collector. Move the
              card to "Won" to auto-create the invoice.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGES.map((s) => (
              <Column
                key={s.value}
                stage={s.value}
                label={s.label}
                deals={byStage.get(s.value) ?? []}
              />
            ))}
          </div>
        </DndContext>
      )}

      {adding ? <NewDealModal onClose={() => setAdding(false)} /> : null}
    </div>
  );
}
