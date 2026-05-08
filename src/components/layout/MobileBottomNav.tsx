import { NavLink } from "react-router-dom";
import { Frame, Users, TrendingUp, FileText, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/LocaleContext";

// Bottom-tab navigation for the split-view layout on mobile (< md). Replaces
// the hamburger trigger when the user opts into split-view mode in
// /settings. Five-slot iOS / Android pattern: four most-used destinations
// + a "More" tab that opens the full sidebar sheet for everything else.
//
// Render: fixed at bottom, hairline top border, 56px tall, icons + label
// per CLAUDE.md (uppercase, tracking-wider). Active tab gets the accent-red
// left rail flipped horizontal — a 2px top bar above the icon.

type Tab = { to: string; i18nKey: string; icon: typeof Frame };

const TABS: Tab[] = [
  { to: "/inventory", i18nKey: "nav.inventory", icon: Frame },
  { to: "/contacts", i18nKey: "nav.contacts", icon: Users },
  { to: "/pipeline", i18nKey: "nav.pipeline", icon: TrendingUp },
  { to: "/dossiers", i18nKey: "nav.dossiers", icon: FileText },
];

export function MobileBottomNav({ onMore }: { onMore: () => void }) {
  const t = useT();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex h-14 border-t border-border bg-background md:hidden"
    >
      {TABS.map(({ to, i18nKey, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 text-[10px] font-medium uppercase tracking-wider transition-colors",
              isActive
                ? "border-accent-red text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )
          }
        >
          <Icon className="h-4 w-4" />
          <span className="leading-none">{t(i18nKey)}</span>
        </NavLink>
      ))}
      <button
        type="button"
        onClick={onMore}
        aria-label="More navigation"
        className="flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 border-transparent text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
        <span className="leading-none">…</span>
      </button>
    </nav>
  );
}
