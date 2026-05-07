// Admin-only: change a team member's role or remove them entirely.
// Removing deletes both the profile row and the auth user.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body =
  | { action: "set_role"; user_id: string; role: "admin" | "staff" }
  | { action: "remove"; user_id: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing auth" }, 401);
    }

    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid auth" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: caller, error: profErr } = await admin
      .from("profiles")
      .select("gallery_id, role")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (profErr) throw profErr;
    if (!caller || caller.role !== "admin") {
      return json({ error: "Only admins can manage members" }, 403);
    }

    const body = (await req.json()) as Body;
    if (!body?.user_id) return json({ error: "user_id required" }, 400);
    if (body.user_id === userData.user.id) {
      return json({ error: "You cannot modify your own account here." }, 400);
    }

    const { data: target, error: targetErr } = await admin
      .from("profiles")
      .select("id, gallery_id, role")
      .eq("id", body.user_id)
      .maybeSingle();
    if (targetErr) throw targetErr;
    if (!target || target.gallery_id !== caller.gallery_id) {
      return json({ error: "Member not found" }, 404);
    }

    if (body.action === "set_role") {
      if (body.role !== "admin" && body.role !== "staff") {
        return json({ error: "Invalid role" }, 400);
      }
      // If demoting an admin, ensure at least one admin remains.
      if (target.role === "admin" && body.role !== "admin") {
        const { count } = await admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("gallery_id", caller.gallery_id)
          .eq("role", "admin");
        if ((count ?? 0) <= 1) {
          return json({ error: "At least one admin must remain." }, 400);
        }
      }
      const { error } = await admin
        .from("profiles")
        .update({ role: body.role })
        .eq("id", body.user_id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (body.action === "remove") {
      if (target.role === "admin") {
        const { count } = await admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("gallery_id", caller.gallery_id)
          .eq("role", "admin");
        if ((count ?? 0) <= 1) {
          return json({ error: "At least one admin must remain." }, 400);
        }
      }
      const { error: delProfile } = await admin
        .from("profiles")
        .delete()
        .eq("id", body.user_id);
      if (delProfile) throw delProfile;
      const { error: delUser } = await admin.auth.admin.deleteUser(body.user_id);
      if (delUser) throw delUser;
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("manage-member error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
