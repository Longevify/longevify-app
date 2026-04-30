"use server";

import { revalidatePath } from "next/cache";
import { cancelBooking as dbCancelBooking } from "@/lib/scheduling/bookings";

export async function cancelBookingAction(
  bookingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await dbCancelBooking(bookingId);
  if (res.ok) {
    revalidatePath("/coleta");
    revalidatePath("/home");
  }
  return res;
}
