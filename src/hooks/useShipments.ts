import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./useProfile";
import type { Database } from "@/integrations/supabase/types";
import type {
  Contact,
  Location,
  Shipment,
  ShipmentAddress,
  ShipmentStatus,
} from "@/integrations/supabase/domain";

type ShipmentUpdate = Database["public"]["Tables"]["shipments"]["Update"];

export type ShipmentWithJoins = Shipment & {
  to_contact: Pick<Contact, "id" | "full_name" | "email"> | null;
  from_location: Pick<Location, "id" | "name"> | null;
};

// "Active" = anything not yet delivered/returned (covers prep + in_transit).
// The dialog uses this to render an "End shipment" entry instead of a
// fresh "Create shipment" one.
export function useActiveShipment(artwork_id: string | undefined) {
  return useQuery<ShipmentWithJoins | null>({
    queryKey: ["shipment-active", artwork_id ?? null],
    enabled: !!artwork_id,
    queryFn: async () => {
      if (!artwork_id) return null;
      const { data, error } = await supabase
        .from("shipments")
        .select(
          `
          *,
          to_contact:contacts ( id, full_name, email ),
          from_location:locations ( id, name )
          `,
        )
        .eq("artwork_id", artwork_id)
        .in("status", ["prep", "in_transit"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<ShipmentWithJoins>();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateShipment() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<
    Shipment,
    Error,
    {
      artwork_id: string;
      from_location_id: string | null;
      to_contact_id: string | null;
      to_address: ShipmentAddress | null;
      carrier: string | null;
      tracking_no: string | null;
      notes: string | null;
    }
  >({
    mutationFn: async (input) => {
      if (!profile) throw new Error("No profile");
      const { data, error } = await supabase
        .from("shipments")
        .insert({
          id: crypto.randomUUID(),
          gallery_id: profile.gallery_id,
          artwork_id: input.artwork_id,
          from_location_id: input.from_location_id,
          to_contact_id: input.to_contact_id,
          to_address: input.to_address,
          carrier: input.carrier,
          tracking_no: input.tracking_no,
          notes: input.notes,
          status: "prep",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["shipment-active", vars.artwork_id] });
      qc.invalidateQueries({ queryKey: ["artworks"] });
    },
  });
}

export function useUpdateShipmentStatus() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    {
      shipment_id: string;
      artwork_id: string;
      next_status: ShipmentStatus;
    }
  >({
    mutationFn: async ({ shipment_id, next_status }) => {
      const patch: ShipmentUpdate = { status: next_status };
      if (next_status === "in_transit") {
        patch.shipped_at = new Date().toISOString();
      }
      if (next_status === "delivered") {
        patch.delivered_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("shipments")
        .update(patch)
        .eq("id", shipment_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["shipment-active", vars.artwork_id] });
      qc.invalidateQueries({ queryKey: ["artworks"] });
    },
  });
}
