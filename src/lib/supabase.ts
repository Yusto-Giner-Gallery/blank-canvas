import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.warn(
    "[ygmanager] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing. Auth will not work until they are set in .env.local.",
  );
}

export const supabase = createClient<Database>(url ?? "", anon ?? "", {
  auth: { persistSession: true, autoRefreshToken: true },
});
