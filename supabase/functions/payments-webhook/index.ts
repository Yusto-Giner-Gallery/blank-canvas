// Stripe webhook receiver. Listens for `checkout.session.completed` and
// flips the matching invoices.status to 'paid' (matched via metadata.invoice_id
// propagated through Payment Link → Checkout Session).
//
// The Lovable Payments integration registered this endpoint at
//   /functions/v1/payments-webhook?env=sandbox
// and provided PAYMENTS_SANDBOX_WEBHOOK_SECRET for signature verification.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Minimal HMAC-SHA256 verification for Stripe `Stripe-Signature` header.
async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  toleranceSec = 300,
): Promise<boolean> {
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  );
  const t = Number(parts["t"]);
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${t}.${payload}`),
  );
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === v1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const url = new URL(req.url);
    const env = url.searchParams.get("env") ?? "sandbox";
    const secretName =
      env === "live"
        ? "PAYMENTS_LIVE_WEBHOOK_SECRET"
        : "PAYMENTS_SANDBOX_WEBHOOK_SECRET";
    const secret = Deno.env.get(secretName);
    const sigHeader = req.headers.get("stripe-signature");
    const payload = await req.text();

    if (!secret || !sigHeader) {
      console.error("Missing webhook secret or signature header");
      return new Response("Missing signature", { status: 400 });
    }
    const ok = await verifyStripeSignature(payload, sigHeader, secret);
    if (!ok) {
      console.error("Invalid webhook signature");
      return new Response("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(payload);

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object ?? {};
      const paid =
        session.payment_status === "paid" || session.status === "complete";
      const invoice_id =
        session.metadata?.invoice_id ??
        session.payment_link_metadata?.invoice_id;

      if (paid && invoice_id) {
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const { error } = await admin
          .from("invoices")
          .update({ status: "paid" })
          .eq("id", invoice_id);
        if (error) {
          console.error("Invoice update failed:", error);
          return new Response("DB update failed", { status: 500 });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("payments-webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
