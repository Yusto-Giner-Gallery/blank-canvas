import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function TopBar({ onOpenNav }: { onOpenNav?: () => void }) {
  const { user, signOut } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onOpenNav}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.22em] md:hidden">
          <span>Yusto</span>
          <span aria-hidden className="text-accent-red text-base font-normal leading-none">/</span>
          <span>Giner</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </>
        ) : null}
      </div>
    </header>
  );
}
