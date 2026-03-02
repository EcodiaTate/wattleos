"use server";

// src/lib/actions/transport-bookings.ts
//
// ============================================================
// WattleOS - Excursion Transport Booking Notes
// ============================================================
// Manages structured transport logistics attached to excursions:
// bus company, vehicle details, driver contact, pickup/drop-off
// times, and payment tracking.
//
// Design: 1:1 with excursion (upsert semantics). Gated on
// MANAGE_TRANSPORT_BOOKINGS (write) and VIEW_EXCURSIONS (read).
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type { ExcursionTransportBooking } from "@/types/domain";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import {
  upsertTransportBookingSchema,
  type UpsertTransportBookingInput,
} from "@/lib/validations/transport-bookings";

// ============================================================
// GET TRANSPORT BOOKING (for a specific excursion)
// ============================================================

export async function getTransportBooking(
  excursionId: string,
): Promise<ActionResponse<ExcursionTransportBooking | null>> {
  try {
    await requirePermission(Permissions.VIEW_EXCURSIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("excursion_transport_bookings")
      .select("*")
      .eq("excursion_id", excursionId)
      .maybeSingle();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(data as ExcursionTransportBooking | null);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unauthorized",
      ErrorCodes.UNAUTHORIZED,
    );
  }
}

// ============================================================
// UPSERT TRANSPORT BOOKING
// ============================================================

export async function upsertTransportBooking(
  input: UpsertTransportBookingInput,
): Promise<ActionResponse<ExcursionTransportBooking>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_TRANSPORT_BOOKINGS,
    );

    const parsed = upsertTransportBookingSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const supabase = await createSupabaseServerClient();

    // Check if a booking already exists for this excursion
    const { data: existing } = await supabase
      .from("excursion_transport_bookings")
      .select("id")
      .eq("excursion_id", parsed.data.excursion_id)
      .maybeSingle();

    const isUpdate = !!existing;

    const payload = {
      tenant_id: context.tenant.id,
      created_by: context.user.id,
      ...parsed.data,
    };

    const { data, error } = await supabase
      .from("excursion_transport_bookings")
      .upsert(isUpdate ? { ...payload, id: existing!.id } : payload, {
        onConflict: "excursion_id",
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to save transport booking",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: isUpdate
        ? AuditActions.TRANSPORT_BOOKING_UPDATED
        : AuditActions.TRANSPORT_BOOKING_CREATED,
      entityType: "excursion_transport_booking",
      entityId: data.id,
      metadata: {
        excursion_id: parsed.data.excursion_id,
        company_name: parsed.data.company_name,
        payment_status: parsed.data.payment_status,
      },
    });

    return success(data as ExcursionTransportBooking);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.UNAUTHORIZED,
    );
  }
}

// ============================================================
// DELETE TRANSPORT BOOKING
// ============================================================

export async function deleteTransportBooking(
  bookingId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_TRANSPORT_BOOKINGS,
    );
    const supabase = await createSupabaseServerClient();

    const { data: existing, error: fetchError } = await supabase
      .from("excursion_transport_bookings")
      .select("id, excursion_id, company_name")
      .eq("id", bookingId)
      .single();

    if (fetchError || !existing) {
      return failure("Transport booking not found", ErrorCodes.NOT_FOUND);
    }

    const { error } = await supabase
      .from("excursion_transport_bookings")
      .delete()
      .eq("id", bookingId);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.TRANSPORT_BOOKING_DELETED,
      entityType: "excursion_transport_booking",
      entityId: bookingId,
      metadata: {
        excursion_id: existing.excursion_id,
        company_name: existing.company_name,
      },
    });

    return success(undefined);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.UNAUTHORIZED,
    );
  }
}
