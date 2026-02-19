// src/lib/actions/admissions/email-templates.ts
//
// ============================================================
// WattleOS V2 - Module 13: Email Template Server Actions
// ============================================================
// Manages reusable email templates for admissions pipeline
// communication. Templates support merge tags that are
// resolved at send time from waitlist entry data.
//
// Templates can be set to auto-trigger when an entry moves
// to a specific stage (e.g., send "Tour Invitation" when
// entry moves to 'tour_scheduled'). The actual email sending
// is handled by an Edge Function or integration pipe —
// these actions manage the templates and render content.
//
// WHY templates not freeform: Schools send the same emails
// hundreds of times. Templates ensure consistent branding,
// reduce admin effort, and make the pipeline automated.
// ============================================================

"use server";

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type { WaitlistEntry, WaitlistStage } from "./waitlist-pipeline";

// ============================================================
// Types
// ============================================================

export interface EmailTemplate {
  id: string;
  tenant_id: string;
  name: string;
  trigger_stage: WaitlistStage | null;
  subject: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RenderedEmail {
  subject: string;
  body: string;
}

/**
 * Supported merge tags for email templates.
 * These are resolved from the waitlist entry at send time.
 */
export const MERGE_TAGS = {
  "{{child_first_name}}": "Child first name",
  "{{child_last_name}}": "Child full last name",
  "{{child_full_name}}": "Child first + last name",
  "{{child_dob}}": "Child date of birth",
  "{{parent_first_name}}": "Parent first name",
  "{{parent_last_name}}": "Parent last name",
  "{{parent_full_name}}": "Parent first + last name",
  "{{parent_email}}": "Parent email",
  "{{requested_program}}": "Requested program",
  "{{requested_start}}": "Requested start term",
  "{{offered_program}}": "Offered program",
  "{{offered_start_date}}": "Offered start date",
  "{{offer_expires_at}}": "Offer expiry date",
  "{{tour_date}}": "Scheduled tour date",
  "{{school_name}}": "School name",
  "{{inquiry_date}}": "Date of initial inquiry",
  "{{stage}}": "Current pipeline stage",
} as const;

// ============================================================
// Input Types
// ============================================================

export interface CreateEmailTemplateInput {
  name: string;
  trigger_stage?: WaitlistStage | null;
  subject: string;
  body: string;
}

export interface UpdateEmailTemplateInput {
  name?: string;
  trigger_stage?: WaitlistStage | null;
  subject?: string;
  body?: string;
  is_active?: boolean;
}

// ============================================================
// CREATE TEMPLATE
// ============================================================
// Permission: MANAGE_EMAIL_TEMPLATES
// ============================================================

export async function createEmailTemplate(
  input: CreateEmailTemplateInput,
): Promise<ActionResponse<EmailTemplate>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_EMAIL_TEMPLATES);
    const supabase = await createSupabaseServerClient();

    if (!input.name?.trim()) {
      return failure("Template name is required", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.subject?.trim()) {
      return failure("Subject is required", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.body?.trim()) {
      return failure("Body is required", ErrorCodes.VALIDATION_ERROR);
    }

    // If trigger_stage is set, ensure no other active template
    // already triggers on the same stage (one per stage max)
    if (input.trigger_stage) {
      const { data: existing } = await supabase
        .from("email_templates")
        .select("id, name")
        .eq("trigger_stage", input.trigger_stage)
        .eq("is_active", true)
        .is("deleted_at", null)
        .limit(1);

      if (existing && existing.length > 0) {
        const other = existing[0] as { id: string; name: string };
        return failure(
          `Template "${other.name}" already triggers on stage '${input.trigger_stage}'. Deactivate it first or remove the trigger.`,
          ErrorCodes.ALREADY_EXISTS,
        );
      }
    }

    const { data, error } = await supabase
      .from("email_templates")
      .insert({
        tenant_id: context.tenant.id,
        name: input.name.trim(),
        trigger_stage: input.trigger_stage ?? null,
        subject: input.subject.trim(),
        body: input.body.trim(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success(data as EmailTemplate);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create template";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE TEMPLATE
// ============================================================

export async function updateEmailTemplate(
  templateId: string,
  input: UpdateEmailTemplateInput,
): Promise<ActionResponse<EmailTemplate>> {
  try {
    await requirePermission(Permissions.MANAGE_EMAIL_TEMPLATES);
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.trigger_stage !== undefined)
      updateData.trigger_stage = input.trigger_stage;
    if (input.subject !== undefined) updateData.subject = input.subject.trim();
    if (input.body !== undefined) updateData.body = input.body.trim();
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    // If activating a trigger_stage, check for conflicts
    if (input.trigger_stage && input.is_active !== false) {
      const { data: existing } = await supabase
        .from("email_templates")
        .select("id")
        .eq("trigger_stage", input.trigger_stage)
        .eq("is_active", true)
        .neq("id", templateId)
        .is("deleted_at", null)
        .limit(1);

      if (existing && existing.length > 0) {
        return failure(
          `Another active template already triggers on stage '${input.trigger_stage}'`,
          ErrorCodes.ALREADY_EXISTS,
        );
      }
    }

    const { data, error } = await supabase
      .from("email_templates")
      .update(updateData)
      .eq("id", templateId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as EmailTemplate);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update template";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// DELETE TEMPLATE (soft delete)
// ============================================================

export async function deleteEmailTemplate(
  templateId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    await requirePermission(Permissions.MANAGE_EMAIL_TEMPLATES);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("email_templates")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", templateId)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    return success({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete template";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// LIST TEMPLATES
// ============================================================
// Permission: MANAGE_EMAIL_TEMPLATES
// Returns all templates sorted by name. No pagination needed
// - schools typically have 5–15 templates max.
// ============================================================

export async function listEmailTemplates(): Promise<
  ActionResponse<EmailTemplate[]>
> {
  try {
    await requirePermission(Permissions.MANAGE_EMAIL_TEMPLATES);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as EmailTemplate[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list templates";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET SINGLE TEMPLATE
// ============================================================

export async function getEmailTemplate(
  templateId: string,
): Promise<ActionResponse<EmailTemplate>> {
  try {
    await requirePermission(Permissions.MANAGE_EMAIL_TEMPLATES);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", templateId)
      .is("deleted_at", null)
      .single();

    if (error) {
      return failure("Template not found", ErrorCodes.NOT_FOUND);
    }

    return success(data as EmailTemplate);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get template";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// RENDER TEMPLATE (resolve merge tags)
// ============================================================
// Takes a template and a waitlist entry, returns the rendered
// subject and body with all merge tags replaced. This is a
// pure function used before sending.
//
// WHY server-side rendering: Merge tags contain PII (names,
// emails). Rendering on the server ensures no raw template
// with PII leaks to the client before it's intentionally sent.
// ============================================================

export async function renderTemplate(
  templateId: string,
  entryId: string,
): Promise<ActionResponse<RenderedEmail>> {
  try {
    await requirePermission(Permissions.MANAGE_EMAIL_TEMPLATES);
    const supabase = await createSupabaseServerClient();

    // Get template
    const { data: template, error: tplError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", templateId)
      .is("deleted_at", null)
      .single();

    if (tplError || !template) {
      return failure("Template not found", ErrorCodes.NOT_FOUND);
    }

    // Get waitlist entry
    const { data: entry, error: entryError } = await supabase
      .from("waitlist_entries")
      .select("*")
      .eq("id", entryId)
      .is("deleted_at", null)
      .single();

    if (entryError || !entry) {
      return failure("Waitlist entry not found", ErrorCodes.NOT_FOUND);
    }

    const tpl = template as EmailTemplate;
    const wl = entry as WaitlistEntry;

    // Get school name from tenant
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", wl.tenant_id)
      .single();

    const schoolName = tenant
      ? (tenant as { name: string }).name
      : "Our School";

    // Build merge tag values
    const tagValues: Record<string, string> = {
      "{{child_first_name}}": wl.child_first_name,
      "{{child_last_name}}": wl.child_last_name,
      "{{child_full_name}}": `${wl.child_first_name} ${wl.child_last_name}`,
      "{{child_dob}}": wl.child_date_of_birth,
      "{{parent_first_name}}": wl.parent_first_name,
      "{{parent_last_name}}": wl.parent_last_name,
      "{{parent_full_name}}": `${wl.parent_first_name} ${wl.parent_last_name}`,
      "{{parent_email}}": wl.parent_email,
      "{{requested_program}}": wl.requested_program ?? "",
      "{{requested_start}}": wl.requested_start ?? "",
      "{{offered_program}}": wl.offered_program ?? "",
      "{{offered_start_date}}": wl.offered_start_date ?? "",
      "{{offer_expires_at}}": wl.offer_expires_at
        ? new Date(wl.offer_expires_at).toLocaleDateString("en-AU")
        : "",
      "{{tour_date}}": wl.tour_date
        ? new Date(wl.tour_date).toLocaleDateString("en-AU", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : "",
      "{{school_name}}": schoolName,
      "{{inquiry_date}}": wl.inquiry_date,
      "{{stage}}": wl.stage,
    };

    // Replace all tags
    let renderedSubject = tpl.subject;
    let renderedBody = tpl.body;

    for (const [tag, value] of Object.entries(tagValues)) {
      renderedSubject = renderedSubject.replaceAll(tag, value);
      renderedBody = renderedBody.replaceAll(tag, value);
    }

    return success({
      subject: renderedSubject,
      body: renderedBody,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to render template";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET TRIGGERED TEMPLATE FOR STAGE
// ============================================================
// Internal helper: finds the active template configured to
// auto-trigger when an entry moves to a specific stage.
// Returns null if no template is configured.
//
// Called by transitionStage() in waitlist-pipeline.ts to
// determine if an email should be queued when stage changes.
// ============================================================

export async function getTriggeredTemplate(
  stage: WaitlistStage,
): Promise<ActionResponse<EmailTemplate | null>> {
  try {
    await requirePermission(Permissions.MANAGE_WAITLIST);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("trigger_stage", stage)
      .eq("is_active", true)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data as EmailTemplate) ?? null);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get triggered template";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET AVAILABLE MERGE TAGS
// ============================================================
// Returns the list of supported merge tags with descriptions.
// Used by the template editor UI to show an insertion palette.
// ============================================================

export async function getAvailableMergeTags(): Promise<
  ActionResponse<Array<{ tag: string; description: string }>>
> {
  const tags = Object.entries(MERGE_TAGS).map(([tag, description]) => ({
    tag,
    description,
  }));

  return success(tags);
}

// ============================================================
// PREVIEW TEMPLATE (with sample data)
// ============================================================
// Renders a template with realistic sample data so admins
// can see what the email will look like before saving.
// No database lookup needed - uses hardcoded sample values.
// ============================================================

export async function previewTemplate(
  subject: string,
  body: string,
): Promise<ActionResponse<RenderedEmail>> {
  const sampleValues: Record<string, string> = {
    "{{child_first_name}}": "Sophia",
    "{{child_last_name}}": "Chen",
    "{{child_full_name}}": "Sophia Chen",
    "{{child_dob}}": "2020-03-15",
    "{{parent_first_name}}": "Michelle",
    "{{parent_last_name}}": "Chen",
    "{{parent_full_name}}": "Michelle Chen",
    "{{parent_email}}": "michelle@example.com",
    "{{requested_program}}": "Primary 3-6",
    "{{requested_start}}": "Term 1 2027",
    "{{offered_program}}": "Primary 3-6",
    "{{offered_start_date}}": "2027-01-28",
    "{{offer_expires_at}}": "15 December 2026",
    "{{tour_date}}": "Wednesday, 20 November 2026, 10:00 AM",
    "{{school_name}}": "Riverside Montessori",
    "{{inquiry_date}}": "2026-06-15",
    "{{stage}}": "waitlisted",
  };

  let renderedSubject = subject;
  let renderedBody = body;

  for (const [tag, value] of Object.entries(sampleValues)) {
    renderedSubject = renderedSubject.replaceAll(tag, value);
    renderedBody = renderedBody.replaceAll(tag, value);
  }

  return success({
    subject: renderedSubject,
    body: renderedBody,
  });
}
