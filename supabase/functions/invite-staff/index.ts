// Admin-only: invite a new staff member by email. Creates the auth user
// (or reuses an existing one) and inserts a profile row with role='staff'
// scoped to the caller's gallery.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Caller-scoped client → identifies who's calling.
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client → privileged ops (auth.admin, profile insert).
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: callerProfile, error: profErr } = await admin
      .from("profiles")
      .select("gallery_id, role")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (profErr) throw profErr;
    if (!callerProfile || callerProfile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can invite staff" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = (await req.json()) as { email?: string; full_name?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    const full_name = (body.full_name ?? "").trim();
    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Where the invitee lands after clicking the email link. Never trust the
    // request origin here because invites are often sent from editor previews,
    // which would send the recipient back to a Lovable-owned domain instead of
    // the live app. Prefer an explicit SITE_URL secret, otherwise use the
    // production domain. Only fall back to the request origin for localhost.
    const origin = req.headers.get("origin")?.replace(/\/$/, "");
    const siteUrl =
      Deno.env.get("SITE_URL")?.replace(/\/$/, "") ??
      (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
        ? origin
        : "https://www.ygmanager.com");
    const redirectTo = `${siteUrl}/accept-invite`;
    const { data: invited, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(email, { redirectTo });

    let userId = invited?.user?.id;
    // If user already exists, look them up.
    if (!userId && inviteErr) {
      const { data: list } = await admin.auth.admin.listUsers();
      userId = list.users.find((u) => u.email?.toLowerCase() === email)?.id;
      if (!userId) throw inviteErr;
    }

    const { error: upsertErr } = await admin.from("profiles").upsert(
      {
        id: userId!,
        gallery_id: callerProfile.gallery_id,
        role: "staff",
        email,
        full_name: full_name || email.split("@")[0],
      },
      { onConflict: "id" },
    );
    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("invite-staff error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
