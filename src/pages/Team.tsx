import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useTeam } from "@/hooks/useTeam";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteMemberModal } from "@/components/team/InviteMemberModal";

export default function Team() {
  const { profile, loading, isAdmin } = useProfile();
  const teamQuery = useTeam();
  const [inviting, setInviting] = useState(false);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading…</p>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const members = teamQuery.data ?? [];

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
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    {m.full_name || "—"}
                    {m.id === profile?.id && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-3 capitalize">{m.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inviting && <InviteMemberModal onClose={() => setInviting(false)} />}
    </div>
  );
}
