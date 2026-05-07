import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/integrations/supabase/types";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Team() {
  const { profile, isAdmin } = useProfile();

  const teamQuery = useQuery<Profile[]>({
    queryKey: ["team", profile?.gallery_id ?? null],
    enabled: !!profile && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!isAdmin) return <Navigate to="/" replace />;

  const members = teamQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          Members of this gallery.
        </p>
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
              Invite staff via Lovable Cloud once the backend is set up. Until
              then, profiles can be inserted directly in the Supabase
              dashboard.
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
                  <td className="px-4 py-3">{m.full_name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-3 capitalize">{m.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
