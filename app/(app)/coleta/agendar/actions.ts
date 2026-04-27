"use server";

import { getServerClient } from "@/lib/supabase/server";

export type AddressInput = {
  state: string;   // UF (2 letras)
  city: string;
  street: string;
  complement?: string;
  reference?: string;
  zip?: string;
};

export type CreateBookingInput = {
  scheduledAtISO: string;
  location: "home" | "lab";
  address?: AddressInput;
};

export type CreateBookingResult =
  | { ok: true; id: string; demo?: boolean }
  | { ok: false; error: string };

export async function createBooking(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const { scheduledAtISO, location, address } = input;

  // Validação: coleta domiciliar exige campos de endereço
  if (location === "home") {
    if (!address) {
      return { ok: false, error: "Endereço obrigatório para coleta domiciliar." };
    }
    if (!address.state.trim()) {
      return { ok: false, error: "Estado (UF) é obrigatório." };
    }
    if (!address.city.trim()) {
      return { ok: false, error: "Cidade é obrigatória." };
    }
    if (!address.street.trim()) {
      return { ok: false, error: "Rua e número são obrigatórios." };
    }
  }

  const supabase = await getServerClient();

  // Modo demo: Supabase não configurado
  if (!supabase) {
    return { ok: true, demo: true, id: `demo-${Date.now()}` };
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return { ok: false, error: "unauthorized" };
  }

  const row: Record<string, string | null> = {
    patient_id: auth.user.id,
    scheduled_at: scheduledAtISO,
    location,
    address_state: address?.state ?? null,
    address_city: address?.city ?? null,
    address_street: address?.street ?? null,
    address_complement: address?.complement ?? null,
    address_reference: address?.reference ?? null,
    address_zip: address?.zip ?? null,
  };

  const { data, error } = await supabase
    .from("collection_bookings")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, id: (data as { id: string }).id };
}
