import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, error } = useProfile();
  const location = useLocation();

  if (authLoading || (session && profileLoading)) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!profile) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight">No profile assigned</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Your account is signed in but has no profile in this gallery. An
          admin needs to add you to the team before you can use YGManager.
          {error ? ` (${error.message})` : ""}
        </p>
        <Button variant="outline" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}
