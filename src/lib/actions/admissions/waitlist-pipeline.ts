// src/lib/actions/admissions/waitlist-pipeline.ts
//
// ============================================================
// WattleOS V2 - Module 13: Waitlist & Admissions Pipeline
// ============================================================
// Manages the complete admissions journey from first inquiry
// to enrolled student. The pipeline stages are:
//
//   inquiry → waitlisted → tour_scheduled → tour_completed
//   → offered → accepted → enrolled
//   (with declined/withdrawn as terminal states)
//
// Every stage transition is logged in waitlist_stage_history
// for audit and analytics. The "accepted → enrolled" step
// bridges to Module 10 by converting the waitlist entry into
// a pre-filled enrollment application.
//
// WHY a pipeline not a flat list: Montessori schools often
// have multi-year waitlists. Visibility into where each
// family sits - and how long they've been there - is what
// lets admins manage capacity and parent expectations.
// ============================================================

"use server";

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  submitInquirySchema,
  validate,
} from "@/lib/validations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ActionResponse,
  ErrorCodes,
  failure,
  paginated,
  paginatedFailure,
  PaginatedResponse,
  success,
} from "@/types/api";

// ============================================================
// Types
// ============================================================

export type WaitlistStage =
  | "inquiry"
  | "waitlisted"
  | "tour_scheduled"
  | "tour_completed"
  | "offered"
  | "accepted"
  | "enrolled"
  | "declined"
  | "withdrawn";

export type OfferResponse = "accepted" | "declined";

export interface WaitlistEntry {
  id: string;
  tenant_id: string;
  stage: WaitlistStage;
  priority: number;
  child_first_name: string;
  child_last_name: string;
  child_date_of_birth: string;
  child_gender: string | null;
  child_current_school: string | null;
  requested_program: string | null;
  requested_start: string | null;
  requested_start_date: string | null;
  parent_first_name: string;
  parent_last_name: string;
  parent_email: string;
  parent_phone: string | null;
  parent_user_id: string | null;
  siblings_at_school: boolean;
  sibling_names: string | null;
  how_heard_about_us: string | null;
  notes: string | null;
  admin_notes: string | null;
  tour_date: string | null;
  tour_guide: string | null;
  tour_notes: string | null;
  tour_attended: boolean | null;
  offered_at: string | null;
  offered_program: string | null;
  offered_start_date: string | null;
  offer_expires_at: string | null;
  offer_response: OfferResponse | null;
  offer_response_at: string | null;
  converted_application_id: string | null;
  source_url: string | null;
  source_campaign: string | null;
  inquiry_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WaitlistEntryWithHistory extends WaitlistEntry {
  stage_history: StageHistoryRecord[];
  days_in_pipeline: number;
}

export interface StageHistoryRecord {
  id: string;
  from_stage: WaitlistStage | null;
  to_stage: WaitlistStage;
  changed_by: string | null;
  changed_by_name: string | null;
  notes: string | null;
  created_at: string;
}

// ============================================================
// Input Types
// ============================================================

export type { SubmitInquiryInput } from "@/lib/validations/admissions";

export interface UpdateWaitlistEntryInput {
  priority?: number;
  child_gender?: string | null;
  child_current_school?: string | null;
  requested_program?: string | null;
  requested_start?: string | null;
  requested_start_date?: string | null;
  parent_phone?: string | null;
  siblings_at_school?: boolean;
  sibling_names?: string | null;
  admin_notes?: string | null;
}

export interface TransitionStageInput {
  entry_id: string;
  to_stage: WaitlistStage;
  notes?: string | null;
}

export interface MakeOfferInput {
  entry_id: string;
  offered_program: string;
  offered_start_date: string;
  offer_expires_at?: string | null;
  notes?: string | null;
}

export interface ListWaitlistParams {
  stage?: WaitlistStage;
  requested_program?: string | null;
  search?: string;
  sort_by?: "priority" | "inquiry_date" | "child_last_name";
  sort_order?: "asc" | "desc";
  page?: number;
  per_page?: number;
}

// ============================================================
// SUBMIT INQUIRY (Public - no auth required)
// ============================================================
// Called from the public inquiry form at
// {school}.wattleos.au/inquiry. No authentication needed.
// Creates entry at 'inquiry' stage and logs the initial
// stage history record.
//
// WHY public insert: This is the school's digital front door.
// The RLS policy allows public inserts; the tenant_id is
// resolved from the subdomain at the page level.
// ============================================================

export async function submitInquiry(
  input: unknown,
): Promise<ActionResponse<WaitlistEntry>> {
  try {
    // Zod validates all required fields, trims strings, lowercases email, checks date format
    const parsed = validate(submitInquirySchema, input);
    if (parsed.error) return parsed.error;
    const v = parsed.data;

    const supabase = await createSupabaseServerClient();

    // Check for duplicate inquiry (same email + child name + tenant)
    const { data: existing } = await supabase
      .from("waitlist_entries")
      .select("id, stage")
      .eq("tenant_id", v.tenant_id)
      .eq("parent_email", v.parent_email)
      .eq("child_first_name", v.child_first_name)
      .eq("child_last_name", v.child_last_name)
      .is("deleted_at", null)
      .not("stage", "in", '("declined","withdrawn")')
      .limit(1);

    if (existing && existing.length > 0) {
      return failure(
        "An inquiry for this child already exists. Please contact the school for an update.",
        ErrorCodes.ALREADY_EXISTS,
      );
    }

    const { data, error } = await supabase
      .from("waitlist_entries")
      .insert({
        tenant_id: v.tenant_id,
        stage: "inquiry" as WaitlistStage,
        priority: 0,
        child_first_name: v.child_first_name,
        child_last_name: v.child_last_name,
        child_date_of_birth: v.child_date_of_birth,
        child_gender: v.child_gender,
        child_current_school: v.child_current_school,
        requested_program: v.requested_program,
        requested_start: v.requested_start,
        requested_start_date: v.requested_start_date,
        parent_first_name: v.parent_first_name,
        parent_last_name: v.parent_last_name,
        parent_email: v.parent_email,
        parent_phone: v.parent_phone,
        siblings_at_school: v.siblings_at_school,
        sibling_names: v.sibling_names,
        how_heard_about_us: v.how_heard_about_us,
        notes: v.notes,
        source_url: v.source_url,
        source_campaign: v.source_campaign,
        inquiry_date: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    const entry = data as WaitlistEntry;

    // Log initial stage history
    await supabase.from("waitlist_stage_history").insert({
      tenant_id: v.tenant_id,
      waitlist_entry_id: entry.id,
      from_stage: null,
      to_stage: "inquiry",
      changed_by: null,
      notes: "Inquiry submitted via public form",
    });

    return success(entry);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to submit inquiry";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// LIST WAITLIST ENTRIES (Admin pipeline view)
// ============================================================
// Permission: VIEW_WAITLIST or MANAGE_WAITLIST
// Supports filtering by stage (for kanban columns),
// program, and free-text search on names/email.
// ============================================================

export async function listWaitlistEntries(
  params: ListWaitlistParams = {},
): Promise<PaginatedResponse<WaitlistEntry>> {
  try {
    await requirePermission(Permissions.VIEW_WAITLIST);
    const supabase = await createSupabaseServerClient();

    const page = params.page ?? 1;
    const perPage = params.per_page ?? 50;
    const offset = (page - 1) * perPage;
    const sortBy = params.sort_by ?? "priority";
    const sortOrder = params.sort_order ?? "desc";

    // Count
    let countQuery = supabase
      .from("waitlist_entries")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    if (params.stage) countQuery = countQuery.eq("stage", params.stage);
    if (params.requested_program)
      countQuery = countQuery.eq("requested_program", params.requested_program);
    if (params.search) {
      countQuery = countQuery.or(
        `child_first_name.ilike.%${params.search}%,child_last_name.ilike.%${params.search}%,parent_first_name.ilike.%${params.search}%,parent_last_name.ilike.%${params.search}%,parent_email.ilike.%${params.search}%`,
      );
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      return paginatedFailure(countError.message, ErrorCodes.DATABASE_ERROR);
    }

    const total = count ?? 0;
    if (total === 0) {
      return paginated([], 0, page, perPage);
    }

    // Data
    let query = supabase
      .from("waitlist_entries")
      .select("*")
      .is("deleted_at", null)
      .range(offset, offset + perPage - 1);

    if (params.stage) query = query.eq("stage", params.stage);
    if (params.requested_program)
      query = query.eq("requested_program", params.requested_program);
    if (params.search) {
      query = query.or(
        `child_first_name.ilike.%${params.search}%,child_last_name.ilike.%${params.search}%,parent_first_name.ilike.%${params.search}%,parent_last_name.ilike.%${params.search}%,parent_email.ilike.%${params.search}%`,
      );
    }

    // Sort
    switch (sortBy) {
      case "priority":
        query = query
          .order("priority", { ascending: sortOrder === "asc" })
          .order("inquiry_date", { ascending: true });
        break;
      case "inquiry_date":
        query = query.order("inquiry_date", { ascending: sortOrder === "asc" });
        break;
      case "child_last_name":
        query = query.order("child_last_name", {
          ascending: sortOrder === "asc",
        });
        break;
    }

    const { data, error } = await query;

    if (error) {
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return paginated((data ?? []) as WaitlistEntry[], total, page, perPage);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list waitlist entries";
    return paginatedFailure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET SINGLE ENTRY (with stage history)
// ============================================================

export async function getWaitlistEntry(
  entryId: string,
): Promise<ActionResponse<WaitlistEntryWithHistory>> {
  try {
    await requirePermission(Permissions.VIEW_WAITLIST);
    const supabase = await createSupabaseServerClient();

    const { data: entry, error } = await supabase
      .from("waitlist_entries")
      .select("*")
      .eq("id", entryId)
      .is("deleted_at", null)
      .single();

    if (error) {
      return failure("Waitlist entry not found", ErrorCodes.NOT_FOUND);
    }

    // Get stage history with user names
    const { data: history } = await supabase
      .from("waitlist_stage_history")
      .select(
        `
        id, from_stage, to_stage, changed_by, notes, created_at,
        changed_by_user:users!waitlist_stage_history_changed_by_fkey(first_name, last_name)
      `,
      )
      .eq("waitlist_entry_id", entryId)
      .order("created_at", { ascending: false });

    const stageHistory: StageHistoryRecord[] = (
      (history ?? []) as Array<Record<string, unknown>>
    ).map((h) => {
      const user = h.changed_by_user as {
        first_name: string;
        last_name: string;
      } | null;
      return {
        id: h.id as string,
        from_stage: h.from_stage as WaitlistStage | null,
        to_stage: h.to_stage as WaitlistStage,
        changed_by: h.changed_by as string | null,
        changed_by_name: user ? `${user.first_name} ${user.last_name}` : null,
        notes: h.notes as string | null,
        created_at: h.created_at as string,
      };
    });

    const wl = entry as WaitlistEntry;
    const inquiryDate = new Date(wl.inquiry_date);
    const daysInPipeline = Math.floor(
      (Date.now() - inquiryDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return success({
      ...wl,
      stage_history: stageHistory,
      days_in_pipeline: daysInPipeline,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get waitlist entry";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE ENTRY (admin edits)
// ============================================================
// Permission: MANAGE_WAITLIST
// For editing priority, admin notes, child details, etc.
// Stage changes go through transitionStage() for audit.
// ============================================================

export async function updateWaitlistEntry(
  entryId: string,
  input: UpdateWaitlistEntryInput,
): Promise<ActionResponse<WaitlistEntry>> {
  try {
    await requirePermission(Permissions.MANAGE_WAITLIST);
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.child_gender !== undefined)
      updateData.child_gender = input.child_gender;
    if (input.child_current_school !== undefined)
      updateData.child_current_school = input.child_current_school;
    if (input.requested_program !== undefined)
      updateData.requested_program = input.requested_program;
    if (input.requested_start !== undefined)
      updateData.requested_start = input.requested_start;
    if (input.requested_start_date !== undefined)
      updateData.requested_start_date = input.requested_start_date;
    if (input.parent_phone !== undefined)
      updateData.parent_phone = input.parent_phone;
    if (input.siblings_at_school !== undefined)
      updateData.siblings_at_school = input.siblings_at_school;
    if (input.sibling_names !== undefined)
      updateData.sibling_names = input.sibling_names;
    if (input.admin_notes !== undefined)
      updateData.admin_notes = input.admin_notes;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("waitlist_entries")
      .update(updateData)
      .eq("id", entryId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as WaitlistEntry);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update entry";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// TRANSITION STAGE
// ============================================================
// Permission: MANAGE_WAITLIST
// Moves an entry to a new stage and logs the transition.
// Validates allowed transitions to prevent skipping steps.
// ============================================================

const ALLOWED_TRANSITIONS: Record<WaitlistStage, WaitlistStage[]> = {
  inquiry: ["waitlisted", "withdrawn"],
  waitlisted: ["tour_scheduled", "offered", "withdrawn"],
  tour_scheduled: ["tour_completed", "waitlisted", "withdrawn"],
  tour_completed: ["offered", "waitlisted", "withdrawn"],
  offered: ["accepted", "declined", "withdrawn"],
  accepted: ["enrolled", "withdrawn"],
  enrolled: [],
  declined: ["waitlisted"],
  withdrawn: ["inquiry"],
};

export async function transitionStage(
  input: TransitionStageInput,
): Promise<ActionResponse<WaitlistEntry>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_WAITLIST);
    const supabase = await createSupabaseServerClient();

    // Get current entry
    const { data: current, error: fetchError } = await supabase
      .from("waitlist_entries")
      .select("id, stage, tenant_id")
      .eq("id", input.entry_id)
      .is("deleted_at", null)
      .single();

    if (fetchError || !current) {
      return failure("Waitlist entry not found", ErrorCodes.NOT_FOUND);
    }

    const entry = current as {
      id: string;
      stage: WaitlistStage;
      tenant_id: string;
    };

    // Validate transition
    const allowed = ALLOWED_TRANSITIONS[entry.stage];
    if (!allowed.includes(input.to_stage)) {
      return failure(
        `Cannot transition from '${entry.stage}' to '${input.to_stage}'. Allowed: ${allowed.join(", ") || "none"}`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Update stage
    const { data, error } = await supabase
      .from("waitlist_entries")
      .update({ stage: input.to_stage })
      .eq("id", input.entry_id)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    // Log transition
    await supabase.from("waitlist_stage_history").insert({
      tenant_id: entry.tenant_id,
      waitlist_entry_id: input.entry_id,
      from_stage: entry.stage,
      to_stage: input.to_stage,
      changed_by: context.user.id,
      notes: input.notes?.trim() ?? null,
    });

    // TODO: Check email_templates for trigger_stage matching
    // input.to_stage and auto-send if configured

    return success(data as WaitlistEntry);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to transition stage";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// MAKE OFFER
// ============================================================
// Permission: MANAGE_WAITLIST
// Moves entry to 'offered' stage and records the offer
// details (program, start date, expiry).
// ============================================================

export async function makeOffer(
  input: MakeOfferInput,
): Promise<ActionResponse<WaitlistEntry>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_WAITLIST);
    const supabase = await createSupabaseServerClient();

    // Get current entry
    const { data: current, error: fetchError } = await supabase
      .from("waitlist_entries")
      .select("id, stage, tenant_id")
      .eq("id", input.entry_id)
      .is("deleted_at", null)
      .single();

    if (fetchError || !current) {
      return failure("Waitlist entry not found", ErrorCodes.NOT_FOUND);
    }

    const entry = current as {
      id: string;
      stage: WaitlistStage;
      tenant_id: string;
    };

    // Can offer from waitlisted or tour_completed
    if (!["waitlisted", "tour_completed"].includes(entry.stage)) {
      return failure(
        `Cannot make offer from '${entry.stage}'. Entry must be 'waitlisted' or 'tour_completed'.`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    if (!input.offered_program?.trim()) {
      return failure(
        "Offered program is required",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    if (!input.offered_start_date) {
      return failure(
        "Offered start date is required",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("waitlist_entries")
      .update({
        stage: "offered" as WaitlistStage,
        offered_at: new Date().toISOString(),
        offered_program: input.offered_program.trim(),
        offered_start_date: input.offered_start_date,
        offer_expires_at: input.offer_expires_at ?? null,
      })
      .eq("id", input.entry_id)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    // Log transition
    await supabase.from("waitlist_stage_history").insert({
      tenant_id: entry.tenant_id,
      waitlist_entry_id: input.entry_id,
      from_stage: entry.stage,
      to_stage: "offered",
      changed_by: context.user.id,
      notes:
        input.notes?.trim() ??
        `Offered ${input.offered_program} starting ${input.offered_start_date}`,
    });

    return success(data as WaitlistEntry);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to make offer";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// ACCEPT OFFER → CREATE ENROLLMENT APPLICATION
// ============================================================
// Permission: MANAGE_WAITLIST
// This is the bridge between Module 13 and Module 10.
// Creates a pre-filled enrollment application from the
// waitlist data, moves the entry to 'accepted', and links
// the two records via converted_application_id.
// ============================================================

export async function acceptOffer(
  entryId: string,
  enrollmentPeriodId: string,
): Promise<ActionResponse<{ entry: WaitlistEntry; application_id: string }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_WAITLIST);
    const supabase = await createSupabaseServerClient();

    // Get full entry
    const { data: current, error: fetchError } = await supabase
      .from("waitlist_entries")
      .select("*")
      .eq("id", entryId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !current) {
      return failure("Waitlist entry not found", ErrorCodes.NOT_FOUND);
    }

    const entry = current as WaitlistEntry;

    if (entry.stage !== "offered") {
      return failure(
        `Cannot accept offer - entry is at '${entry.stage}', must be 'offered'`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Check offer hasn't expired
    if (
      entry.offer_expires_at &&
      new Date(entry.offer_expires_at) < new Date()
    ) {
      return failure("This offer has expired", ErrorCodes.VALIDATION_ERROR);
    }

    // Create enrollment application (Module 10 bridge)
    const guardianData = [
      {
        first_name: entry.parent_first_name,
        last_name: entry.parent_last_name,
        email: entry.parent_email,
        phone: entry.parent_phone,
        relationship: "parent",
      },
    ];

    const { data: application, error: appError } = await supabase
      .from("enrollment_applications")
      .insert({
        tenant_id: entry.tenant_id,
        enrollment_period_id: enrollmentPeriodId,
        status: "submitted",
        submitted_by_email: entry.parent_email,
        submitted_by_user: entry.parent_user_id ?? null,
        submitted_at: new Date().toISOString(),
        child_first_name: entry.child_first_name,
        child_last_name: entry.child_last_name,
        child_date_of_birth: entry.child_date_of_birth,
        child_gender: entry.child_gender,
        child_previous_school: entry.child_current_school,
        requested_program: entry.offered_program ?? entry.requested_program,
        requested_start_date: entry.offered_start_date,
        guardians: guardianData,
      })
      .select("id")
      .single();

    if (appError) {
      return failure(
        `Failed to create enrollment application: ${appError.message}`,
        ErrorCodes.CREATE_FAILED,
      );
    }

    const applicationId = (application as { id: string }).id;

    // Update waitlist entry
    const { data: updated, error: updateError } = await supabase
      .from("waitlist_entries")
      .update({
        stage: "accepted" as WaitlistStage,
        offer_response: "accepted" as OfferResponse,
        offer_response_at: new Date().toISOString(),
        converted_application_id: applicationId,
      })
      .eq("id", entryId)
      .select()
      .single();

    if (updateError) {
      return failure(updateError.message, ErrorCodes.UPDATE_FAILED);
    }

    // Log transition
    await supabase.from("waitlist_stage_history").insert({
      tenant_id: entry.tenant_id,
      waitlist_entry_id: entryId,
      from_stage: "offered",
      to_stage: "accepted",
      changed_by: context.user.id,
      notes: `Offer accepted. Enrollment application ${applicationId} created.`,
    });

    return success({
      entry: updated as WaitlistEntry,
      application_id: applicationId,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to accept offer";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// DECLINE OFFER
// ============================================================

export async function declineOffer(
  entryId: string,
  reason?: string,
): Promise<ActionResponse<WaitlistEntry>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_WAITLIST);
    const supabase = await createSupabaseServerClient();

    const { data: current } = await supabase
      .from("waitlist_entries")
      .select("stage, tenant_id")
      .eq("id", entryId)
      .is("deleted_at", null)
      .single();

    if (!current) {
      return failure("Waitlist entry not found", ErrorCodes.NOT_FOUND);
    }

    const entry = current as { stage: WaitlistStage; tenant_id: string };

    if (entry.stage !== "offered") {
      return failure(
        "Entry must be at offered stage to decline",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("waitlist_entries")
      .update({
        stage: "declined" as WaitlistStage,
        offer_response: "declined" as OfferResponse,
        offer_response_at: new Date().toISOString(),
      })
      .eq("id", entryId)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    await supabase.from("waitlist_stage_history").insert({
      tenant_id: entry.tenant_id,
      waitlist_entry_id: entryId,
      from_stage: "offered",
      to_stage: "declined",
      changed_by: context.user.id,
      notes: reason?.trim() ?? "Offer declined",
    });

    return success(data as WaitlistEntry);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to decline offer";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// WITHDRAW ENTRY
// ============================================================

export async function withdrawEntry(
  entryId: string,
  reason?: string,
): Promise<ActionResponse<WaitlistEntry>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_WAITLIST);
    const supabase = await createSupabaseServerClient();

    const { data: current } = await supabase
      .from("waitlist_entries")
      .select("stage, tenant_id")
      .eq("id", entryId)
      .is("deleted_at", null)
      .single();

    if (!current) {
      return failure("Waitlist entry not found", ErrorCodes.NOT_FOUND);
    }

    const entry = current as { stage: WaitlistStage; tenant_id: string };

    if (["enrolled", "withdrawn"].includes(entry.stage)) {
      return failure(
        `Cannot withdraw - entry is already '${entry.stage}'`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("waitlist_entries")
      .update({ stage: "withdrawn" as WaitlistStage })
      .eq("id", entryId)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    await supabase.from("waitlist_stage_history").insert({
      tenant_id: entry.tenant_id,
      waitlist_entry_id: entryId,
      from_stage: entry.stage,
      to_stage: "withdrawn",
      changed_by: context.user.id,
      notes: reason?.trim() ?? "Entry withdrawn",
    });

    return success(data as WaitlistEntry);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to withdraw entry";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// DELETE ENTRY (soft delete)
// ============================================================

export async function deleteWaitlistEntry(
  entryId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    await requirePermission(Permissions.MANAGE_WAITLIST);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("waitlist_entries")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", entryId)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    return success({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete entry";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// CHECK INQUIRY STATUS (Public - by email + child name)
// ============================================================
// Returns a sanitized view of the entry for the parent.
// No admin notes, no internal fields.
// ============================================================

export async function checkInquiryStatus(
  tenantId: string,
  parentEmail: string,
  childFirstName: string,
  childLastName: string,
): Promise<
  ActionResponse<{
    stage: WaitlistStage;
    child_name: string;
    inquiry_date: string;
    days_waiting: number;
    tour_date: string | null;
    offered_program: string | null;
    offer_expires_at: string | null;
  } | null>
> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("waitlist_entries")
      .select(
        "stage, child_first_name, child_last_name, inquiry_date, tour_date, offered_program, offer_expires_at",
      )
      .eq("tenant_id", tenantId)
      .eq("parent_email", parentEmail.trim().toLowerCase())
      .eq("child_first_name", childFirstName.trim())
      .eq("child_last_name", childLastName.trim())
      .is("deleted_at", null)
      .limit(1)
      .single();

    if (error) {
      return success(null);
    }

    const entry = data as {
      stage: WaitlistStage;
      child_first_name: string;
      child_last_name: string;
      inquiry_date: string;
      tour_date: string | null;
      offered_program: string | null;
      offer_expires_at: string | null;
    };

    const daysWaiting = Math.floor(
      (Date.now() - new Date(entry.inquiry_date).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return success({
      stage: entry.stage,
      child_name: `${entry.child_first_name} ${entry.child_last_name}`,
      inquiry_date: entry.inquiry_date,
      days_waiting: daysWaiting,
      tour_date: entry.tour_date,
      offered_program: entry.offered_program,
      offer_expires_at: entry.offer_expires_at,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to check status";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// PIPELINE ANALYTICS
// ============================================================
// Permission: VIEW_ADMISSIONS_ANALYTICS
// Returns funnel metrics, demand by program, and average
// time per stage.
// ============================================================

export interface PipelineAnalytics {
  stage_counts: Record<WaitlistStage, number>;
  total_active: number;
  conversion_funnel: {
    inquiries: number;
    tours_completed: number;
    offers_made: number;
    offers_accepted: number;
    enrolled: number;
    conversion_rate_pct: number;
  };
  demand_by_program: Array<{
    program: string;
    count: number;
  }>;
  avg_days_per_stage: Record<string, number>;
  referral_sources: Array<{
    source: string;
    count: number;
  }>;
}

export async function getPipelineAnalytics(): Promise<
  ActionResponse<PipelineAnalytics>
> {
  try {
    await requirePermission(Permissions.VIEW_ADMISSIONS_ANALYTICS);
    const supabase = await createSupabaseServerClient();

    // Get all non-deleted entries
    const { data: entries, error } = await supabase
      .from("waitlist_entries")
      .select(
        "id, stage, requested_program, how_heard_about_us, inquiry_date, offered_at, offer_response_at",
      )
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const allEntries = (entries ?? []) as Array<{
      id: string;
      stage: WaitlistStage;
      requested_program: string | null;
      how_heard_about_us: string | null;
      inquiry_date: string;
      offered_at: string | null;
      offer_response_at: string | null;
    }>;

    // Stage counts
    const stageCounts: Record<WaitlistStage, number> = {
      inquiry: 0,
      waitlisted: 0,
      tour_scheduled: 0,
      tour_completed: 0,
      offered: 0,
      accepted: 0,
      enrolled: 0,
      declined: 0,
      withdrawn: 0,
    };

    for (const e of allEntries) {
      stageCounts[e.stage]++;
    }

    const activeStages: WaitlistStage[] = [
      "inquiry",
      "waitlisted",
      "tour_scheduled",
      "tour_completed",
      "offered",
      "accepted",
    ];
    const totalActive = activeStages.reduce(
      (sum, s) => sum + stageCounts[s],
      0,
    );

    // Conversion funnel
    const totalInquiries = allEntries.length;
    const toursCompleted = allEntries.filter((e) =>
      [
        "tour_completed",
        "offered",
        "accepted",
        "enrolled",
        "declined",
      ].includes(e.stage),
    ).length;
    const offersMade = allEntries.filter((e) =>
      ["offered", "accepted", "enrolled", "declined"].includes(e.stage),
    ).length;
    const offersAccepted = allEntries.filter((e) =>
      ["accepted", "enrolled"].includes(e.stage),
    ).length;
    const enrolled = stageCounts.enrolled;

    // Demand by program
    const programMap = new Map<string, number>();
    for (const e of allEntries) {
      const prog = e.requested_program ?? "Unspecified";
      programMap.set(prog, (programMap.get(prog) ?? 0) + 1);
    }
    const demandByProgram = Array.from(programMap.entries())
      .map(([program, count]) => ({ program, count }))
      .sort((a, b) => b.count - a.count);

    // Referral sources
    const sourceMap = new Map<string, number>();
    for (const e of allEntries) {
      const src = e.how_heard_about_us ?? "Unknown";
      sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1);
    }
    const referralSources = Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    // Average days per stage (from stage history)
    const { data: historyData } = await supabase
      .from("waitlist_stage_history")
      .select("waitlist_entry_id, from_stage, to_stage, created_at")
      .order("created_at", { ascending: true });

    const avgDaysPerStage: Record<string, number> = {};

    if (historyData && historyData.length > 0) {
      // Group transitions by entry
      const transitionsByEntry = new Map<
        string,
        Array<{
          from_stage: string | null;
          to_stage: string;
          created_at: string;
        }>
      >();

      for (const h of historyData as Array<{
        waitlist_entry_id: string;
        from_stage: string | null;
        to_stage: string;
        created_at: string;
      }>) {
        if (!transitionsByEntry.has(h.waitlist_entry_id)) {
          transitionsByEntry.set(h.waitlist_entry_id, []);
        }
        transitionsByEntry.get(h.waitlist_entry_id)!.push(h);
      }

      // Calculate time spent in each stage
      const stageDays = new Map<string, number[]>();

      for (const transitions of transitionsByEntry.values()) {
        for (let i = 0; i < transitions.length - 1; i++) {
          const stage = transitions[i].to_stage;
          const enterTime = new Date(transitions[i].created_at).getTime();
          const exitTime = new Date(transitions[i + 1].created_at).getTime();
          const days = (exitTime - enterTime) / (1000 * 60 * 60 * 24);

          if (!stageDays.has(stage)) stageDays.set(stage, []);
          stageDays.get(stage)!.push(days);
        }
      }

      for (const [stage, days] of stageDays.entries()) {
        avgDaysPerStage[stage] = Math.round(
          days.reduce((a, b) => a + b, 0) / days.length,
        );
      }
    }

    return success({
      stage_counts: stageCounts,
      total_active: totalActive,
      conversion_funnel: {
        inquiries: totalInquiries,
        tours_completed: toursCompleted,
        offers_made: offersMade,
        offers_accepted: offersAccepted,
        enrolled,
        conversion_rate_pct:
          totalInquiries > 0
            ? Math.round((enrolled / totalInquiries) * 100)
            : 0,
      },
      demand_by_program: demandByProgram,
      avg_days_per_stage: avgDaysPerStage,
      referral_sources: referralSources,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get analytics";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}