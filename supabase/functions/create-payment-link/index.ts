// Build a Stripe Payment Link (EUR test mode) for an invoice.
// Calls Stripe via the Lovable connector gateway using STRIPE_SANDBOX_API_KEY.
// On success, patches invoices.stripe_payment_link with the URL.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STRIPE_API = "https://api.stripe.com/v1";

function form(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

async function stripeFetch(
  path: string,
  body: Record<string, string>,
  apiKey: string,
): Promise<unknown> {
  const r = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form(body),
  });
  const json = await r.json();
  if (!r.ok) {
    console.error("Stripe error:", path, json);
    throw new Error(json?.error?.message ?? `Stripe ${path} failed`);
  }
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const STRIPE_KEY = Deno.env.get("STRIPE_SANDBOX_API_KEY");
    if (!STRIPE_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "Stripe is not configured. Connect Stripe in the Payments tab.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { invoice_id?: string };
    const invoice_id = body.invoice_id;
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Caller-scoped read enforces RLS (gallery match).
    const { data: invoice, error: invErr } = await callerClient
      .from("invoices")
      .select("id, gallery_id, currency")
      .eq("id", invoice_id)
      .maybeSingle();
    if (invErr) throw invErr;
    if (!invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lines, error: linesErr } = await callerClient
      .from("invoice_lines")
      .select("description, amount_eur, discount_eur")
      .eq("invoice_id", invoice_id)
      .order("sort_order", { ascending: true });
    if (linesErr) throw linesErr;
    if (!lines || lines.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invoice has no line items" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const currency = (invoice.currency ?? "EUR").toLowerCase();

    // Build line_items: 1 Stripe price per row (created inline).
    const params: Record<string, string> = {};
    lines.forEach((ln, i) => {
      const net = Math.max(
        0,
        Number(ln.amount_eur ?? 0) - Number(ln.discount_eur ?? 0),
      );
      const cents = Math.round(net * 100);
      params[`line_items[${i}][quantity]`] = "1";
      params[`line_items[${i}][price_data][currency]`] = currency;
      params[`line_items[${i}][price_data][unit_amount]`] = String(cents);
      params[`line_items[${i}][price_data][product_data][name]`] =
        ln.description?.slice(0, 250) || "Artwork";
    });
    params["metadata[invoice_id]"] = invoice_id;
    params["metadata[gallery_id]"] = invoice.gallery_id;

    const link = (await stripeFetch("/payment_links", params, STRIPE_KEY)) as {
      id: string;
      url: string;
    };

    const { error: patchErr } = await admin
      .from("invoices")
      .update({ stripe_payment_link: link.url })
      .eq("id", invoice_id);
    if (patchErr) throw patchErr;

    return new Response(JSON.stringify({ url: link.url, id: link.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-payment-link error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
