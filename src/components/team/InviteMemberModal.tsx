import { useState } from "react";
import { errorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInviteMember } from "@/hooks/useTeam";

export function InviteMemberModal({ onClose }: { onClose: () => void }) {
  const invite = useInviteMember();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  const trimmedEmail = email.trim().toLowerCase();
  const valid = trimmedEmail.includes("@") && trimmedEmail.length >= 3;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    try {
      await invite.mutateAsync({
        email: trimmedEmail,
        full_name: fullName.trim() || undefined,
      });
      toast.success(`Invitation sent to ${trimmedEmail}`);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-3 rounded-md border border-border bg-popover p-5 shadow-lg"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Invite member</h2>
          <p className="text-sm text-muted-foreground">
            They will receive an email invite. Once they accept, they can view
            and edit everything in this gallery.
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Email</Label>
          <Input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="h-9"
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Full name (optional)
          </Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="—"
            className="h-9"
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!valid || invite.isPending}
          >
            {invite.isPending ? "Sending…" : "Send invite"}
          </Button>
        </div>
      </form>
    </div>
  );
}
