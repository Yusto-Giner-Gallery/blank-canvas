import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Best-effort human-readable string from any thrown value.
 * Supabase / PostgREST errors are plain objects (not Error instances) with
 * shape `{ message, details, hint, code }`, so `String(err)` returns
 * "[object Object]". This helper digs those out.
 */
export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err == null) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    const parts = [e.message, e.error_description, e.error, e.details, e.hint]
      .filter((v): v is string => typeof v === "string" && v.length > 0);
    if (parts.length) return parts[0];
    try {
      return JSON.stringify(err);
    } catch {
      return fallback;
    }
  }
  return String(err) || fallback;
}
