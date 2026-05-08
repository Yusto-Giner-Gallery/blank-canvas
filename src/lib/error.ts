// Centralised error-message extraction. Supabase error objects aren't
// instances of Error, so `String(err)` returns "[object Object]" — every
// toast/log call in the app should route through this helper.

type MaybeSupabaseError = {
  message?: string;
  error_description?: string;
  details?: string;
  hint?: string;
};

export function errorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const e = err as MaybeSupabaseError;
    return (
      e.message ||
      e.error_description ||
      e.details ||
      e.hint ||
      JSON.stringify(err)
    );
  }
  return String(err);
}
