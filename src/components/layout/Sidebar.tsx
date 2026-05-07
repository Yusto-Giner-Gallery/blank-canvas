import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Frame,
  Folder,
  FileText,
  Users,
  Receipt,
  TrendingUp,
  KanbanSquare,
  Shield,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";

type Item = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const items: Item[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Frame },
  { to: "/collections", label: "Collections", icon: Folder },
  { to: "/dossiers", label: "Dossiers", icon: FileText },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/pipeline", label: "Pipeline", icon: TrendingUp },
  { to: "/kanban", label: "Shirika", icon: KanbanSquare },
  { to: "/team", label: "Team", icon: Shield, adminOnly: true },
  { to: "/feedback", label: "Feedback", icon: Inbox, adminOnly: true },
];

export function Sidebar() {
  const { isAdmin } = useProfile();
  const visible = items.filter((i) => !i.adminOnly || isAdmin);

  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-border">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4 text-sm font-semibold uppercase tracking-[0.22em]">
        <span>Yusto</span>
        <span aria-hidden className="text-accent-red text-base font-normal leading-none">/</span>
        <span>Giner</span>
      </div>
      <nav className="flex-1 space-y-px px-0 pb-4 pt-2">
        {visible.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
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
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
