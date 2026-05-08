import { cn } from "@/lib/utils";

function initials(name: string | null | undefined, fallback: string): string {
  const source = (name ?? "").trim() || fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  email,
  size = "sm",
  className,
}: {
  name?: string | null;
  email?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const label = initials(name, email ?? "");
  return (
    <span
      title={name?.trim() || email || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-border bg-background font-semibold uppercase tracking-wide text-foreground",
        size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function AvatarStack({
  members,
  max = 3,
}: {
  members: Array<{ id: string; full_name?: string | null; email?: string | null }>;
  max?: number;
}) {
  if (members.length === 0) return null;
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((m) => (
        <Avatar
          key={m.id}
          name={m.full_name}
          email={m.email}
          className="ring-1 ring-card"
        />
      ))}
      {overflow > 0 ? (
        <span className="inline-flex h-6 min-w-6 items-center justify-center border border-border bg-muted px-1 text-[10px] font-semibold text-muted-foreground ring-1 ring-card">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
