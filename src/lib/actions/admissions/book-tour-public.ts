"use server";

// src/lib/actions/admissions/book-tour-public.ts
//
// ============================================================
// WattleOS V2 - Public Self-Service Tour Booking
// ============================================================
// Called from the public /tours page. No authentication.
// Creates or reuses a waitlist entry and links it to a tour
// slot in a single action.
//
// Flow:
//   1. Validate + rate limit
//   2. Check slot capacity (race-condition safe re-read)
//   3. Find existing waitlist entry by email (reuse if found)
//   4. Create entry at 'inquiry' stage if none exists
//   5. Update entry to 'tour_scheduled' + set tour_date
//   6. Log stage transition
// ============================================================

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimitOrFail } from "@/lib/utils/rate-limit";
import {
  bookTourSchema,
  type BookTourInput,
} from "@/lib/validations/admissions";
import { validate } from "@/lib/validations";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";

export interface BookTourPublicResult {
  entry_id: string;
  tour_date: string;
}

export async function bookTourPublic(
  input: unknown,
): Promise<ActionResponse<BookTourPublicResult>> {
  try {
    // Rate limit: prevent slot-flooding abuse (3 per 15 min per IP)
    const blocked = await rateLimitOrFail<BookTourPublicResult>("public_write");
    if (blocked) return blocked;

    const parsed = validate(bookTourSchema, input);
    if (parsed.error) return parsed.error;
    const v = parsed.data as BookTourInput;

    const supabase = await createSupabaseServerClient();

    // ── 1. Fetch and validate the slot ──────────────────
    const { data: slot, error: slotError } = await supabase
      .from("tour_slots")
      .select("id, date, start_time, max_families, tenant_id")
      .eq("id", v.tour_slot_id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .single();

    if (slotError || !slot) {
      return failure(
        "Tour slot not found or no longer available.",
        ErrorCodes.NOT_FOUND,
      );
    }

    const tourDatetime = `${slot.date}T${slot.start_time}`;

    // ── 2. Check capacity ────────────────────────────────
    const { count: bookedCount } = await supabase
      .from("waitlist_entries")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", slot.tenant_id)
      .eq("tour_date", tourDatetime)
      .in("stage", [
        "tour_scheduled",
        "tour_completed",
        "offered",
        "accepted",
        "enrolled",
      ])
      .is("deleted_at", null);

    if ((bookedCount ?? 0) >= slot.max_families) {
      return failure(
        "This tour is fully booked. Please choose another time.",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // ── 3. Find or create waitlist entry ─────────────────
    let entryId: string;

    // Re-use existing entry if this family already enquired
    const { data: existing } = await supabase
      .from("waitlist_entries")
      .select("id, stage")
      .eq("tenant_id", slot.tenant_id)
      .eq("parent_email", v.parent_email.toLowerCase())
      .is("deleted_at", null)
      .not("stage", "in", '("declined","withdrawn")')
      .limit(1)
      .maybeSingle();

    if (existing) {
      entryId = existing.id as string;
    } else {
      // Split child_name into first/last (best-effort)
      const nameParts = (v.child_name ?? "").trim().split(/\s+/);
      const childFirst = nameParts[0] ?? "Unknown";
      const childLast = nameParts.slice(1).join(" ") || childFirst;

      const { data: newEntry, error: insertError } = await supabase
        .from("waitlist_entries")
        .insert({
          tenant_id: slot.tenant_id,
          stage: "inquiry",
          priority: 0,
          parent_first_name: v.parent_first_name,
          parent_last_name: v.parent_last_name,
          parent_email: v.parent_email.toLowerCase(),
          parent_phone: v.parent_phone ?? null,
          child_first_name: childFirst,
          child_last_name: childLast,
          child_date_of_birth: null,
          notes: v.notes ?? null,
          inquiry_date: new Date().toISOString().split("T")[0],
        })
        .select("id")
        .single();

      if (insertError || !newEntry) {
        return failure(
          "Failed to create your booking. Please try again.",
          ErrorCodes.CREATE_FAILED,
        );
      }

      entryId = (newEntry as { id: string }).id;
    }

    // ── 4. Book the tour ─────────────────────────────────
    const { error: updateError } = await supabase
      .from("waitlist_entries")
      .update({
        stage: "tour_scheduled",
        tour_date: tourDatetime,
        tour_guide: null,
      })
      .eq("id", entryId);

    if (updateError) {
      console.error("[bookTourPublic] update error:", updateError.message);
      return failure(
        "Failed to confirm your booking. Please try again.",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    // ── 5. Log stage transition ──────────────────────────
    await supabase.from("waitlist_stage_history").insert({
      tenant_id: slot.tenant_id,
      waitlist_entry_id: entryId,
      from_stage: existing ? (existing.stage as string) : "inquiry",
      to_stage: "tour_scheduled",
      changed_by: null, // public action - no authenticated user
      notes: `Self-service tour booked for ${slot.date} at ${slot.start_time}`,
    });

    return success({ entry_id: entryId, tour_date: tourDatetime });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to book tour";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
