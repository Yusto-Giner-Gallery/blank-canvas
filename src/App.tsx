import { Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { Toaster } from "@/components/ui/sonner";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import Login from "@/pages/Login";
import Index from "@/pages/Index";
import Inventory from "@/pages/Inventory";
import ArtworkDetail from "@/pages/ArtworkDetail";
import BulkUpload from "@/pages/BulkUpload";
import InventoryImport from "@/pages/InventoryImport";
import Collections from "@/pages/Collections";
import CollectionDetail from "@/pages/CollectionDetail";
import Dossiers from "@/pages/Dossiers";
import DossierEditor from "@/pages/DossierEditor";
import Contacts from "@/pages/Contacts";
import ContactDetail from "@/pages/ContactDetail";
import PublicSignup from "@/pages/PublicSignup";
import Invoices from "@/pages/Invoices";
import InvoiceDetail from "@/pages/InvoiceDetail";
import Pipeline from "@/pages/Pipeline";
import Kanban from "@/pages/Kanban";
import BoardDetail from "@/pages/BoardDetail";
import Team from "@/pages/Team";
import AcceptInvite from "@/pages/AcceptInvite";
import Feedback from "@/pages/Feedback";
import PageSettings from "@/pages/PageSettings";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <LocaleProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup-contact" element={<PublicSignup />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Index />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/inventory/upload" element={<BulkUpload />} />
          <Route path="/inventory/import" element={<InventoryImport />} />
          <Route path="/inventory/:id" element={<ArtworkDetail />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:id" element={<CollectionDetail />} />
          <Route path="/dossiers" element={<Dossiers />} />
          <Route path="/dossiers/:id" element={<DossierEditor />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/kanban" element={<Kanban />} />
          <Route path="/kanban/:id" element={<BoardDetail />} />
          <Route path="/team" element={<Team />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/settings" element={<PageSettings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </LocaleProvider>
  );
}
