import type { InvoiceStatus } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

const LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  cancelled: "Cancelled",
};

export function InvoiceStatusPill({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-border px-2 py-0.5 text-xs",
        status === "paid" && "border-foreground bg-foreground text-background",
        status !== "paid" && "text-muted-foreground",
      )}
    >
      {LABEL[status]}
    </span>
  );
}
