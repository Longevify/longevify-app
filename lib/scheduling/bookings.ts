import "server-only";
import { getServerClient } from "@/lib/supabase/server";

export type BookingStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type BookingLocation = "home" | "lab";

export interface CollectionBooking {
  id: string;
  scheduledAtISO: string;
  location: BookingLocation;
  status: BookingStatus;
  address: {
    state?: string | null;
    city?: string | null;
    street?: string | null;
    complement?: string | null;
    reference?: string | null;
    zip?: string | null;
  };
  notes?: string | null;
  createdAtISO: string;
}

export interface BookingsBuckets {
  upcoming: CollectionBooking[];
  past: CollectionBooking[];
}

interface DbRow {
  id: string;
  scheduled_at: string;
  location: BookingLocation;
  status: BookingStatus;
  address_state: string | null;
  address_city: string | null;
  address_street: string | null;
  address_complement: string | null;
  address_reference: string | null;
  address_zip: string | null;
  notes: string | null;
  created_at: string;
}

function mapRow(row: DbRow): CollectionBooking {
  return {
    id: row.id,
    scheduledAtISO: row.scheduled_at,
    location: row.location,
    status: row.status,
    address: {
      state: row.address_state,
      city: row.address_city,
      street: row.address_street,
      complement: row.address_complement,
      reference: row.address_reference,
      zip: row.address_zip,
    },
    notes: row.notes,
    createdAtISO: row.created_at,
  };
}

/**
 * Pega as coletas do paciente logado, separadas em "futuras" (scheduled
 * com data >= agora) e "passadas" (qualquer outra coisa).
 *
 * Em modo demo (sem Supabase configurado), retorna ambas vazias.
 */
export async function getUserBookings(): Promise<BookingsBuckets> {
  const supabase = await getServerClient();
  if (!supabase) return { upcoming: [], past: [] };

  const { data: sessionData } = await supabase.auth.getSession();
  const auth = { user: sessionData?.session?.user ?? null };
  if (!auth.user) return { upcoming: [], past: [] };

  const { data, error } = await supabase
    .from("collection_bookings")
    .select(
      "id, scheduled_at, location, status, address_state, address_city, address_street, address_complement, address_reference, address_zip, notes, created_at",
    )
    .eq("patient_id", auth.user.id)
    .order("scheduled_at", { ascending: false });

  if (error || !data) {
    return { upcoming: [], past: [] };
  }

  const now = new Date();
  const upcoming: CollectionBooking[] = [];
  const past: CollectionBooking[] = [];
  for (const row of data as DbRow[]) {
    const b = mapRow(row);
    const when = new Date(b.scheduledAtISO);
    if (b.status === "scheduled" && when.getTime() >= now.getTime()) {
      upcoming.push(b);
    } else {
      past.push(b);
    }
  }

  // upcoming asc (mais próxima primeiro)
  upcoming.sort(
    (a, b) =>
      new Date(a.scheduledAtISO).getTime() -
      new Date(b.scheduledAtISO).getTime(),
  );
  return { upcoming, past };
}

/**
 * Cancela uma coleta (status: scheduled → cancelled). RLS já garante que
 * o user só pode cancelar as próprias.
 */
export async function cancelBooking(
  bookingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: true }; // demo

  const { data: sessionData } = await supabase.auth.getSession();
  const auth = { user: sessionData?.session?.user ?? null };
  if (!auth.user) return { ok: false, error: "unauthorized" };

  const { error } = await supabase
    .from("collection_bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("patient_id", auth.user.id)
    .eq("status", "scheduled");

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
