import { useState } from "react";
import { errorMessage } from "@/lib/utils";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import {
  useTeam,
  useSetMemberRole,
  useRemoveMember,
} from "@/hooks/useTeam";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InviteMemberModal } from "@/components/team/InviteMemberModal";
import type { Profile } from "@/integrations/supabase/domain";

export default function Team() {
  const { profile, loading, isAdmin } = useProfile();
  const teamQuery = useTeam();
  const [inviting, setInviting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Profile | null>(null);
  const setRole = useSetMemberRole();
  const removeMember = useRemoveMember();

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const members = teamQuery.data ?? [];

  async function changeRole(m: Profile, role: "admin" | "staff") {
    try {
      await setRole.mutateAsync({ user_id: m.id, role });
      toast.success(
        `${m.full_name || m.email} is now ${role === "admin" ? "an admin" : "staff"}.`,
      );
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function doRemove(m: Profile) {
    try {
      await removeMember.mutateAsync({ user_id: m.id });
      toast.success(`Removed ${m.full_name || m.email}.`);
      setConfirmRemove(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            Members of this gallery. Invited members can view and edit
            everything.
          </p>
        </div>
        <Button size="sm" onClick={() => setInviting(true)}>
          Invite member
        </Button>
      </div>

      {teamQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : teamQuery.error ? (
        <p className="text-sm text-destructive">
          Could not load team. {(teamQuery.error as Error).message}
        </p>
      ) : members.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No team members yet</CardTitle>
            <CardDescription>
              Click "Invite member" to send an email invite. They'll join as
              staff with full access to artworks, contacts, and everything else
              in the gallery.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-right font-medium w-px">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isSelf = m.id === profile?.id;
                return (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      {m.full_name || "—"}
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-3 capitalize">{m.role}</td>
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <div className="flex items-center justify-end gap-2">
                          {m.role === "staff" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => changeRole(m, "admin")}
                              disabled={setRole.isPending}
                            >
                              Promote
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => changeRole(m, "staff")}
                              disabled={setRole.isPending}
                            >
                              Demote
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmRemove(m)}
                            className="text-destructive hover:text-destructive"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {inviting && <InviteMemberModal onClose={() => setInviting(false)} />}

      {confirmRemove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmRemove(null);
          }}
        >
          <div className="w-full max-w-md space-y-3 rounded-md border border-border bg-popover p-5 shadow-lg">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Remove member?
              </h2>
              <p className="text-sm text-muted-foreground">
                {confirmRemove.full_name || confirmRemove.email} will lose
                access immediately and their account will be deleted. This
                cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmRemove(null)}
                disabled={removeMember.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => doRemove(confirmRemove)}
                disabled={removeMember.isPending}
              >
                {removeMember.isPending ? "Removing…" : "Remove member"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
