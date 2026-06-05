import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { ArtworkStatus } from "@/integrations/supabase/domain";

export type Filters = {
  q: string;
  status: ArtworkStatus | "";
  location_id: string;
  artist_id: string;
  tag_id: string;
  price_min: number | null;
  price_max: number | null;
  year_min: number | null;
  year_max: number | null;
  nationality: string;
  attention: boolean;
};

const DEFAULTS: Filters = {
  q: "",
  status: "",
  location_id: "",
  artist_id: "",
  tag_id: "",
  price_min: null,
  price_max: null,
  year_min: null,
  year_max: null,
  nationality: "",
  attention: false,
};

const STATUS_VALUES: readonly ArtworkStatus[] = [
  "available",
  "on_hold",
  "sold",
  "archived",
];

function num(v: string | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function status(v: string | null): ArtworkStatus | "" {
  return STATUS_VALUES.includes(v as ArtworkStatus) ? (v as ArtworkStatus) : "";
}

export function useFilters() {
  const [params, setParams] = useSearchParams();

  const filters: Filters = useMemo(
    () => ({
      q: params.get("q") ?? "",
      status: status(params.get("status")),
      location_id: params.get("location") ?? "",
      artist_id: params.get("artist") ?? "",
      tag_id: params.get("tag") ?? "",
      price_min: num(params.get("price_min")),
      price_max: num(params.get("price_max")),
      year_min: num(params.get("year_min")),
      year_max: num(params.get("year_max")),
      nationality: params.get("nat") ?? "",
      attention: params.get("attention") === "1",
    }),
    [params],
  );

  const setFilters = useCallback(
    (patch: Partial<Filters>) => {
      const next = { ...filters, ...patch };
      const out = new URLSearchParams();
      if (next.q) out.set("q", next.q);
      if (next.status) out.set("status", next.status);
      if (next.location_id) out.set("location", next.location_id);
      if (next.artist_id) out.set("artist", next.artist_id);
      if (next.tag_id) out.set("tag", next.tag_id);
      if (next.price_min != null) out.set("price_min", String(next.price_min));
      if (next.price_max != null) out.set("price_max", String(next.price_max));
      if (next.year_min != null) out.set("year_min", String(next.year_min));
      if (next.year_max != null) out.set("year_max", String(next.year_max));
      if (next.nationality) out.set("nat", next.nationality);
      if (next.attention) out.set("attention", "1");
      setParams(out, { replace: true });
    },
    [filters, setParams],
  );

  const clear = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true });
  }, [setParams]);

  const activeCount = useMemo(
    () =>
      Object.entries(filters).reduce((acc, [, v]) => {
        if (v === "" || v === null || v === false) return acc;
        return acc + 1;
      }, 0),
    [filters],
  );

  return { filters, setFilters, clear, activeCount, defaults: DEFAULTS };
}
