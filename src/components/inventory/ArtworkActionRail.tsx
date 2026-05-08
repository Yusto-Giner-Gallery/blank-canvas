import { useState, type ComponentType } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  Ban,
  Copy,
  Download,
  FileText,
  FilePlus,
  FolderPlus,
  Hand,
  Handshake,
  ImagePlus,
  MapPin,
  MessageSquare,
  Pencil,
  Printer,
  ReceiptText,
  Send,
  Tag,
  Trash2,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useUpdateArtwork } from "@/hooks/useUpdateArtwork";
import { useDuplicateArtwork } from "@/hooks/useDuplicateArtwork";
import { useDownloadArtworkImages } from "@/hooks/useDownloadArtworkImages";
import { useActiveLoan, useEndLoan } from "@/hooks/useLoans";
import {
  useActiveConsignment,
  useEndConsignment,
} from "@/hooks/useConsignments";
import {
  useActiveShipment,
  useUpdateShipmentStatus,
} from "@/hooks/useShipments";
import { CollectionPicker } from "@/components/inventory/CollectionPicker";
import { DossierFromSelectionPicker } from "@/components/inventory/DossierFromSelectionPicker";
import { MoveLocationDialog } from "@/components/inventory/actions/MoveLocationDialog";
import { MarkSoldDialog } from "@/components/inventory/actions/MarkSoldDialog";
import { NewOfferDialog } from "@/components/inventory/actions/NewOfferDialog";
import { AddToInvoiceDialog } from "@/components/inventory/actions/AddToInvoiceDialog";
import { LoanOutDialog } from "@/components/inventory/actions/LoanOutDialog";
import { ConsignOutDialog } from "@/components/inventory/actions/ConsignOutDialog";
import { CreateShipmentDialog } from "@/components/inventory/actions/CreateShipmentDialog";
import { AddDocumentDialog } from "@/components/inventory/actions/AddDocumentDialog";
import { PrintSheetModal } from "@/components/inventory/PrintSheetModal";
import type { ArtworkWithFilters } from "@/hooks/useArtworks";

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border first:border-t-0">
      <div className="px-1 pb-1.5 pt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="pb-2">{children}</div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  onClick,
  active,
  destructive,
  disabled,
  pending,
  hint,
}: {
  icon: LucideIcon | ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  active?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  pending?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      title={hint}
      className={
        "group flex w-full items-center gap-3 px-2 py-1.5 text-left text-sm transition-colors " +
        "hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50 " +
        (destructive
          ? "text-destructive hover:text-destructive "
          : active
            ? "text-foreground "
            : "text-foreground ")
      }
    >
      {active ? (
        <span className="h-2 w-2 shrink-0 bg-foreground" aria-hidden="true" />
      ) : (
        <Icon
          className={
            "h-4 w-4 shrink-0 " +
            (destructive
              ? "text-destructive"
              : "text-muted-foreground group-hover:text-foreground")
          }
        />
      )}
      <span className="truncate">{pending ? "Working…" : label}</span>
    </button>
  );
}

type DialogKind =
  | null
  | "move-location"
  | "tearsheet"
  | "collection"
  | "mark-sold"
  | "new-offer"
  | "add-to-invoice"
  | "loan-out"
  | "consign-out"
  | "create-shipment"
  | "documents"
  | "print";

const SHIPMENT_NEXT_LABEL: Record<string, string> = {
  prep: "Mark in transit",
  in_transit: "Mark delivered",
  delivered: "Shipment delivered",
  returned: "Shipment returned",
};

const SHIPMENT_NEXT_STATUS: Record<string, "in_transit" | "delivered" | null> = {
  prep: "in_transit",
  in_transit: "delivered",
  delivered: null,
  returned: null,
};

export function ArtworkActionRail({
  artwork,
  galleryName,
  imageUrlFor,
  isAddingImage,
  isDeleting,
  onRequestEdit,
  onRequestAddImage,
  onRequestDelete,
}: {
  artwork: ArtworkWithFilters;
  galleryName: string;
  imageUrlFor: (storage_path: string | null | undefined) => string | null;
  isAddingImage: boolean;
  isDeleting: boolean;
  onRequestEdit: () => void;
  onRequestAddImage: () => void;
  onRequestDelete: () => void;
}) {
  const navigate = useNavigate();
  const update = useUpdateArtwork();
  const duplicate = useDuplicateArtwork();
  const download = useDownloadArtworkImages();
  const activeLoan = useActiveLoan(artwork.id);
  const activeConsignment = useActiveConsignment(artwork.id);
  const activeShipment = useActiveShipment(artwork.id);
  const endLoan = useEndLoan();
  const endConsignment = useEndConsignment();
  const advanceShipment = useUpdateShipmentStatus();
  const [open, setOpen] = useState<DialogKind>(null);

  const isHeld = artwork.status === "on_hold";
  const isArchived = artwork.status === "archived";
  const isSold = artwork.status === "sold";
  const isNfs = artwork.is_nfs === true;
  const onLoan = !!activeLoan.data;
  const onConsignment = !!activeConsignment.data;
  const inShipment = !!activeShipment.data;
  const shipmentStatus = activeShipment.data?.status;

  async function onToggleHold() {
    try {
      await update.mutateAsync({
        id: artwork.id,
        patch: { status: isHeld ? "available" : "on_hold" },
      });
      toast.success(isHeld ? "Released hold" : "Put on hold");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onToggleArchive() {
    try {
      await update.mutateAsync({
        id: artwork.id,
        patch: { status: isArchived ? "available" : "archived" },
      });
      toast.success(isArchived ? "Reactivated" : "Archived");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onDuplicate() {
    try {
      const newId = await duplicate.mutateAsync({ id: artwork.id });
      toast.success("Duplicated");
      navigate(`/inventory/${newId}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onDownload() {
    try {
      const { count } = await download.mutateAsync({
        artwork_id: artwork.id,
        internal_id: artwork.internal_id,
      });
      toast.success(`Downloaded ${count} image${count === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onToggleNfs() {
    try {
      await update.mutateAsync({
        id: artwork.id,
        patch: { is_nfs: !isNfs },
      });
      toast.success(isNfs ? "NFS removed" : "Marked NFS");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onLoanRowClick() {
    if (!activeLoan.data) {
      setOpen("loan-out");
      return;
    }
    if (!window.confirm("Mark this loan as returned?")) return;
    try {
      await endLoan.mutateAsync({
        loan_id: activeLoan.data.id,
        artwork_id: artwork.id,
      });
      toast.success("Loan returned");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onConsignmentRowClick() {
    if (!activeConsignment.data) {
      setOpen("consign-out");
      return;
    }
    if (!window.confirm("Mark consignment as returned? (For a sale, use Mark as Sold instead.)"))
      return;
    try {
      await endConsignment.mutateAsync({
        consignment_id: activeConsignment.data.id,
        artwork_id: artwork.id,
        next_status: "returned",
      });
      toast.success("Consignment returned");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onShipmentRowClick() {
    if (!activeShipment.data) {
      setOpen("create-shipment");
      return;
    }
    const next = SHIPMENT_NEXT_STATUS[shipmentStatus ?? ""];
    if (!next) return;
    const label =
      next === "in_transit" ? "Mark this shipment as in transit?" : "Mark this shipment as delivered?";
    if (!window.confirm(label)) return;
    try {
      await advanceShipment.mutateAsync({
        shipment_id: activeShipment.data.id,
        artwork_id: artwork.id,
        next_status: next,
      });
      toast.success(next === "in_transit" ? "In transit" : "Delivered");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <aside
      aria-label="Artwork actions"
      className="border-border lg:sticky lg:top-4 lg:self-start lg:border-l lg:pl-4"
    >
      <Section label="Status">
        <Row
          icon={Hand}
          label={isHeld ? "Release hold" : "Put on hold"}
          onClick={onToggleHold}
          active={isHeld}
          pending={update.isPending}
        />
        {!isSold ? (
          <Row
            icon={Tag}
            label="Mark as sold"
            onClick={() => setOpen("mark-sold")}
          />
        ) : null}
        <Row
          icon={Ban}
          label={isNfs ? "Unmark NFS" : "Mark NFS"}
          onClick={onToggleNfs}
          active={isNfs}
          pending={update.isPending}
        />
        <Row
          icon={Archive}
          label={isArchived ? "Reactivate" : "Make inactive"}
          onClick={onToggleArchive}
          active={isArchived}
          pending={update.isPending}
        />
      </Section>

      {!isSold ? (
        <Section label="Commerce">
          <Row
            icon={MessageSquare}
            label="New offer"
            onClick={() => setOpen("new-offer")}
          />
          <Row
            icon={ReceiptText}
            label="Add to transaction"
            onClick={() => setOpen("add-to-invoice")}
          />
        </Section>
      ) : null}

      <Section label="Movement">
        <Row
          icon={MapPin}
          label="Move to location"
          onClick={() => setOpen("move-location")}
        />
        <Row
          icon={Send}
          label={onLoan ? "End loan" : "Loan out"}
          onClick={onLoanRowClick}
          active={onLoan}
          pending={endLoan.isPending}
          hint={
            onLoan && activeLoan.data?.contact?.full_name
              ? `On loan to ${activeLoan.data.contact.full_name}`
              : undefined
          }
        />
        <Row
          icon={Handshake}
          label={onConsignment ? "End consignment" : "Consign out"}
          onClick={onConsignmentRowClick}
          active={onConsignment}
          pending={endConsignment.isPending}
          hint={
            onConsignment && activeConsignment.data?.partner?.full_name
              ? `Consigned with ${activeConsignment.data.partner.full_name}`
              : undefined
          }
        />
        <Row
          icon={Truck}
          label={
            inShipment
              ? SHIPMENT_NEXT_LABEL[shipmentStatus ?? ""] ?? "Shipment"
              : "Create shipment"
          }
          onClick={onShipmentRowClick}
          active={inShipment}
          pending={advanceShipment.isPending}
          disabled={
            inShipment && !SHIPMENT_NEXT_STATUS[shipmentStatus ?? ""]
          }
          hint={
            inShipment && activeShipment.data?.tracking_no
              ? `${activeShipment.data.carrier ?? "Carrier"} · ${activeShipment.data.tracking_no}`
              : undefined
          }
        />
      </Section>

      <Section label="Curate">
        <Row
          icon={FolderPlus}
          label="Add to collection"
          onClick={() => setOpen("collection")}
        />
      </Section>

      <Section label="Output">
        <Row
          icon={FileText}
          label="Tearsheet"
          onClick={() => setOpen("tearsheet")}
        />
        <Row
          icon={Printer}
          label="Print"
          onClick={() => setOpen("print")}
        />
        <Row
          icon={Download}
          label="Download images"
          onClick={onDownload}
          pending={download.isPending}
        />
        <Row
          icon={FilePlus}
          label="Add document"
          onClick={() => setOpen("documents")}
        />
        <Row
          icon={ImagePlus}
          label="Add image"
          onClick={onRequestAddImage}
          pending={isAddingImage}
        />
      </Section>

      <Section label="Edit">
        <Row icon={Pencil} label="Edit details" onClick={onRequestEdit} />
        <Row
          icon={Copy}
          label="Duplicate artwork"
          onClick={onDuplicate}
          pending={duplicate.isPending}
        />
        <Row
          icon={Trash2}
          label="Delete"
          onClick={onRequestDelete}
          destructive
          pending={isDeleting}
        />
      </Section>

      {open === "move-location" ? (
        <MoveLocationDialog
          artwork_id={artwork.id}
          current_location_id={artwork.location?.id ?? null}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {open === "tearsheet" ? (
        <DossierFromSelectionPicker
          artwork_ids={[artwork.id]}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {open === "collection" ? (
        <CollectionPicker
          artwork_ids={[artwork.id]}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {open === "mark-sold" ? (
        <MarkSoldDialog
          artwork_id={artwork.id}
          artwork_title={artwork.title}
          internal_id={artwork.internal_id}
          default_price={artwork.price_eur}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {open === "new-offer" ? (
        <NewOfferDialog
          artwork_id={artwork.id}
          artwork_title={artwork.title}
          internal_id={artwork.internal_id}
          default_value={artwork.price_eur}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {open === "add-to-invoice" ? (
        <AddToInvoiceDialog
          artwork_id={artwork.id}
          artwork_title={artwork.title}
          internal_id={artwork.internal_id}
          default_amount={artwork.price_eur}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {open === "print" ? (
        <PrintSheetModal
          artwork={artwork}
          galleryName={galleryName}
          imageUrlFor={imageUrlFor}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {open === "loan-out" ? (
        <LoanOutDialog
          artwork_id={artwork.id}
          artwork_title={artwork.title}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {open === "consign-out" ? (
        <ConsignOutDialog
          artwork_id={artwork.id}
          artwork_title={artwork.title}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {open === "create-shipment" ? (
        <CreateShipmentDialog
          artwork_id={artwork.id}
          artwork_title={artwork.title}
          current_location_id={artwork.location?.id ?? null}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {open === "documents" ? (
        <AddDocumentDialog
          artwork_id={artwork.id}
          artwork_title={artwork.title}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </aside>
  );
}
