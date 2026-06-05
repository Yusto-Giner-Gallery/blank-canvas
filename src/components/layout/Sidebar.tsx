import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Frame,
  Palette,
  Folder,
  FileText,
  Users,
  Receipt,
  ReceiptText,
  TrendingUp,
  CalendarDays,
  KanbanSquare,
  Shield,
  Inbox,
  Settings,
  Bug,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { useT } from "@/lib/i18n/LocaleContext";
import { FeedbackModal } from "@/components/shared/FeedbackModal";
import { useMyAssignedCards } from "@/hooks/useMyAssignedCards";

type Item = {
  to: string;
  // translation key under "nav.<id>"; UI resolves via useT()
  i18nKey: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const items: Item[] = [
  { to: "/", i18nKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/inventory", i18nKey: "nav.inventory", icon: Frame },
  { to: "/artists", i18nKey: "nav.artists", icon: Palette },
  { to: "/sets", i18nKey: "nav.collections", icon: Folder },
  { to: "/dossiers", i18nKey: "nav.dossiers", icon: FileText },
  { to: "/contacts", i18nKey: "nav.contacts", icon: Users },
  { to: "/invoices", i18nKey: "nav.invoices", icon: Receipt },
  { to: "/receipts", i18nKey: "nav.receipts", icon: ReceiptText },
  { to: "/pipeline", i18nKey: "nav.pipeline", icon: TrendingUp },
  { to: "/calendar", i18nKey: "nav.calendar", icon: CalendarDays },
  { to: "/kanban", i18nKey: "nav.shirika", icon: KanbanSquare },
  { to: "/team", i18nKey: "nav.team", icon: Shield, adminOnly: true },
  { to: "/feedback", i18nKey: "nav.feedback", icon: Inbox, adminOnly: true },
];

// Exported so AppShell can render it as a fixed-position element when
// sidebar mode is "autohide" — the wordmark must stay visible whether
// the nav drawer is in or out.
export function Wordmark() {
  return (
    <div className="flex h-14 items-center gap-2 border-b border-border px-4 font-recta text-sm font-medium uppercase tracking-[0.22em]">
      <span>Yusto</span>
      <span aria-hidden className="text-accent-red text-base font-normal leading-none">/</span>
      <span>Giner</span>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin } = useProfile();
  const t = useT();
  // Count of cards the user is a member of — surfaces unseen assignments
  // as a small badge next to "Shirika", same pattern as Linear's inbox
  // count or Asana's "My tasks" badge.
  const assignedCount = useMyAssignedCards().data?.length ?? 0;
  const visible = items.filter((i) => !i.adminOnly || isAdmin);
  return (
    <nav className="flex-1 space-y-px px-0 pb-4 pt-2">
      {visible.map(({ to, i18nKey, icon: Icon }) => {
        const showBadge = i18nKey === "nav.shirika" && assignedCount > 0;
        return (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 border-l-2 px-3 py-2 text-sm font-medium uppercase tracking-wider transition-colors",
                isActive
                  ? "border-accent-red bg-accent text-accent-foreground"
                  : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{t(i18nKey)}</span>
            {showBadge ? (
              <span
                aria-label={`${assignedCount} assigned`}
                // Monochrome badge per CLAUDE.md §3 — accent-red is reserved
                // for chrome (wordmark slash, active rail, page bracket).
                className="inline-flex h-5 min-w-[1.25rem] items-center justify-center border border-foreground bg-foreground px-1.5 text-[10px] font-semibold tabular-nums text-background"
              >
                {assignedCount}
              </span>
            ) : null}
          </NavLink>
        );
      })}
    </nav>
  );
}

// Page settings entry — anchors to the bottom-left of the sidebar. Sits
// below the nav list (which has flex-1) so it's pinned to the bottom on
// any sidebar height. Same styling as a nav item but with a top hairline
// to mark it as a separate "preferences" zone, not a content area.
function SettingsEntry({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  return (
    <NavLink
      to="/settings"
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 border-l-2 border-t border-t-border px-3 py-3 text-sm font-medium uppercase tracking-wider transition-colors",
          isActive
            ? "border-l-accent-red bg-accent text-accent-foreground"
            : "border-l-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
        )
      }
    >
      <Settings className="h-4 w-4" />
      {t("settings.page")}
    </NavLink>
  );
}

function FeedbackEntries({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const [open, setOpen] = useState<null | "bug" | "feature">(null);
  const baseClass =
    "flex w-full items-center gap-3 border-l-2 border-l-transparent px-3 py-3 text-sm font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
  return (
    <>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          setOpen("bug");
        }}
        className={cn(baseClass, "border-t border-t-border")}
      >
        <Bug className="h-4 w-4" />
        Report a bug
      </button>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          setOpen("feature");
        }}
        className={baseClass}
      >
        <Plus className="h-4 w-4" />
        Request a feature
      </button>
      {open ? (
        <FeedbackModal
          kind={open}
          page_path={location.pathname}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-border">
      <Wordmark />
      <NavList />
      <FeedbackEntries />
      <SettingsEntry />
    </aside>
  );
}

// Auto-hide variant: fixed-positioned, slides in from the left edge when
// the cursor enters the hover zone or the sidebar itself, slides out
// otherwise. The wordmark is rendered separately by AppShell as a
// fixed element above this sidebar so it stays visible when the
// drawer is hidden.
//
// Behaviour:
// - Hover zone (8 px strip on the very left edge) sets visible=true on enter.
// - Sidebar onMouseEnter keeps visible=true (no flicker when crossing
//   from the strip onto the sidebar).
// - Sidebar onMouseLeave sets visible=false — moving away in any
//   direction collapses it back.
// - focus-within forces the sidebar visible regardless of mouse so
//   keyboard tab-navigation can reach the nav links without phantom
//   off-screen focus.
//
// Mobile (<md) hides this entirely; the existing MobileSidebar sheet
// (hamburger-triggered) remains the right pattern for touch.
export function AutohideSidebar({
  visible,
  onVisibilityChange,
}: {
  visible: boolean;
  onVisibilityChange: (next: boolean) => void;
}) {
  return (
    <aside
      onMouseEnter={() => onVisibilityChange(true)}
      onMouseLeave={() => onVisibilityChange(false)}
      aria-hidden={visible ? undefined : true}
      className={cn(
        "fixed bottom-0 left-0 top-14 z-30 hidden w-56 flex-col border-r border-border bg-background shadow-sm transition-transform duration-150 ease-out md:flex focus-within:translate-x-0",
        visible ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <NavList />
      <FeedbackEntries />
      <SettingsEntry />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-background/80"
        onClick={onClose}
        aria-hidden
      />
      <aside className="relative flex h-full w-64 flex-col border-r border-border bg-background">
        <div className="relative">
          <Wordmark />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <NavList onNavigate={onClose} />
        <FeedbackEntries onNavigate={onClose} />
        <SettingsEntry onNavigate={onClose} />
      </aside>
    </div>
  );
}
