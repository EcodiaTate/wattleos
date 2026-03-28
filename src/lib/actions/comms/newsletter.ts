"use server";

// src/lib/actions/comms/newsletter.ts
//
// ============================================================
// WattleOS V2 - Newsletter Server Actions
// ============================================================
// Rich-text newsletter editions with templates, audience
// targeting, scheduled send, and read-receipt tracking.
// Distinct from announcements (short-form, single-body).
//
// Status workflow: draft → scheduled → sending → sent
// (side exit: cancelled from draft or scheduled)
// ============================================================

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sanitizeHtml } from "@/lib/utils/sanitize-html";
import {
  ActionResponse,
  ErrorCodes,
  failure,
  paginated,
  paginatedFailure,
  PaginatedResponse,
  success,
} from "@/types/api";
import type {
  Class,
  Newsletter,
  NewsletterDashboardData,
  NewsletterRecipientWithUser,
  NewsletterSection,
  NewsletterTemplate,
  NewsletterWithDetails,
  User,
} from "@/types/domain";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import type {
  CreateNewsletterInput,
  CreateNewsletterTemplateInput,
  ListNewslettersInput,
  ListRecipientsInput,
  UpdateNewsletterInput,
  UpdateNewsletterTemplateInput,
  UpsertNewsletterSectionInput,
} from "@/lib/validations/newsletter";

// ============================================================
// TEMPLATES - CRUD
// ============================================================

export async function createNewsletterTemplate(
  input: CreateNewsletterTemplateInput,
): Promise<ActionResponse<NewsletterTemplate>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NEWSLETTER);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("newsletter_templates")
      .insert({
        tenant_id: context.tenant.id,
        name: input.name.trim(),
        description: input.description ?? null,
        body_json: JSON.stringify(input.body_json ?? []),
        header_image_url: input.header_image_url ?? null,
        footer_html: input.footer_html ? sanitizeHtml(input.footer_html) : null,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.NEWSLETTER_TEMPLATE_CREATED,
      entityType: "newsletter_template",
      entityId: (data as { id: string }).id,
      metadata: { name: input.name },
    });

    return success(data as NewsletterTemplate);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to create template";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

export async function updateNewsletterTemplate(
  input: UpdateNewsletterTemplateInput,
): Promise<ActionResponse<NewsletterTemplate>> {
  try {
    await requirePermission(Permissions.MANAGE_NEWSLETTER);
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.body_json !== undefined)
      updateData.body_json = JSON.stringify(input.body_json);
    if (input.header_image_url !== undefined)
      updateData.header_image_url = input.header_image_url;
    if (input.footer_html !== undefined)
      updateData.footer_html = input.footer_html ? sanitizeHtml(input.footer_html) : null;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("newsletter_templates")
      .update(updateData)
      .eq("id", input.template_id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    return success(data as NewsletterTemplate);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to update template";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

export async function deleteNewsletterTemplate(
  templateId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NEWSLETTER);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("newsletter_templates")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", templateId)
      .is("deleted_at", null);

    if (error) return failure(error.message, ErrorCodes.DELETE_FAILED);

    await logAudit({
      context,
      action: AuditActions.NEWSLETTER_TEMPLATE_DELETED,
      entityType: "newsletter_template",
      entityId: templateId,
    });

    return success({ deleted: true });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to delete template";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

export async function listNewsletterTemplates(): Promise<
  ActionResponse<NewsletterTemplate[]>
> {
  try {
    await requirePermission(Permissions.VIEW_NEWSLETTER);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("newsletter_templates")
      .select("*")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success((data ?? []) as NewsletterTemplate[]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to list templates";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// NEWSLETTERS (EDITIONS) - CRUD
// ============================================================

export async function createNewsletter(
  input: CreateNewsletterInput,
): Promise<ActionResponse<Newsletter>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NEWSLETTER);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("newsletters")
      .insert({
        tenant_id: context.tenant.id,
        template_id: input.template_id ?? null,
        title: input.title.trim(),
        subject_line: input.subject_line.trim(),
        preheader: input.preheader ?? null,
        body_html: sanitizeHtml(input.body_html ?? ""),
        body_json: JSON.stringify(input.body_json ?? []),
        header_image_url: input.header_image_url ?? null,
        footer_html: input.footer_html ? sanitizeHtml(input.footer_html) : null,
        audience: input.audience,
        target_class_id:
          input.audience === "class" ? input.target_class_id : null,
        target_program_id:
          input.audience === "program" ? input.target_program_id : null,
        author_id: context.user.id,
        scheduled_for: input.scheduled_for ?? null,
        status: input.scheduled_for ? "scheduled" : "draft",
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.NEWSLETTER_CREATED,
      entityType: "newsletter",
      entityId: (data as { id: string }).id,
      metadata: { title: input.title, audience: input.audience },
    });

    return success(data as Newsletter);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to create newsletter";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

export async function updateNewsletter(
  input: UpdateNewsletterInput,
): Promise<ActionResponse<Newsletter>> {
  try {
    await requirePermission(Permissions.MANAGE_NEWSLETTER);
    const supabase = await createSupabaseServerClient();

    // Only drafts/scheduled can be edited
    const { data: existing, error: fetchErr } = await supabase
      .from("newsletters")
      .select("id, status")
      .eq("id", input.newsletter_id)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !existing) {
      return failure("Newsletter not found", ErrorCodes.NOT_FOUND);
    }

    const status = (existing as { status: string }).status;
    if (status !== "draft" && status !== "scheduled") {
      return failure(
        "Only draft or scheduled newsletters can be edited",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.subject_line !== undefined)
      updateData.subject_line = input.subject_line.trim();
    if (input.preheader !== undefined) updateData.preheader = input.preheader;
    if (input.body_html !== undefined) updateData.body_html = sanitizeHtml(input.body_html);
    if (input.body_json !== undefined)
      updateData.body_json = JSON.stringify(input.body_json);
    if (input.header_image_url !== undefined)
      updateData.header_image_url = input.header_image_url;
    if (input.footer_html !== undefined)
      updateData.footer_html = input.footer_html ? sanitizeHtml(input.footer_html) : null;
    if (input.audience !== undefined) updateData.audience = input.audience;
    if (input.target_class_id !== undefined)
      updateData.target_class_id = input.target_class_id;
    if (input.target_program_id !== undefined)
      updateData.target_program_id = input.target_program_id;
    if (input.scheduled_for !== undefined)
      updateData.scheduled_for = input.scheduled_for;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("newsletters")
      .update(updateData)
      .eq("id", input.newsletter_id)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    return success(data as Newsletter);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to update newsletter";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

export async function getNewsletter(
  newsletterId: string,
): Promise<ActionResponse<NewsletterWithDetails>> {
  try {
    await requirePermission(Permissions.VIEW_NEWSLETTER);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("newsletters")
      .select(
        `
        *,
        author:users!newsletters_author_id_fkey(id, first_name, last_name, avatar_url),
        target_class:classes!newsletters_target_class_id_fkey(id, name),
        newsletter_sections(*)
      `,
      )
      .eq("id", newsletterId)
      .is("deleted_at", null)
      .single();

    if (error) return failure("Newsletter not found", ErrorCodes.NOT_FOUND);

    const row = data as Record<string, unknown>;
    const recipientCount = (row.recipient_count as number) ?? 0;
    const readCount = (row.read_count as number) ?? 0;

    const sections = (
      Array.isArray(row.newsletter_sections) ? row.newsletter_sections : []
    ) as NewsletterSection[];
    sections.sort((a, b) => a.sort_order - b.sort_order);

    const newsletter: NewsletterWithDetails = {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      template_id: row.template_id as string | null,
      title: row.title as string,
      subject_line: row.subject_line as string,
      preheader: row.preheader as string | null,
      body_html: row.body_html as string,
      body_json: (row.body_json ?? []) as Record<string, unknown>[],
      header_image_url: row.header_image_url as string | null,
      footer_html: row.footer_html as string | null,
      status: row.status as Newsletter["status"],
      audience: row.audience as Newsletter["audience"],
      target_class_id: row.target_class_id as string | null,
      target_program_id: row.target_program_id as string | null,
      author_id: row.author_id as string,
      scheduled_for: row.scheduled_for as string | null,
      sent_at: row.sent_at as string | null,
      cancelled_at: row.cancelled_at as string | null,
      recipient_count: recipientCount,
      read_count: readCount,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      deleted_at: row.deleted_at as string | null,
      author: row.author as Pick<
        User,
        "id" | "first_name" | "last_name" | "avatar_url"
      >,
      target_class: row.target_class as Pick<Class, "id" | "name"> | null,
      sections,
      open_rate: recipientCount > 0 ? readCount / recipientCount : 0,
    };

    return success(newsletter);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get newsletter";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

export async function listNewsletters(
  params: ListNewslettersInput = {},
): Promise<PaginatedResponse<NewsletterWithDetails>> {
  try {
    await requirePermission(Permissions.VIEW_NEWSLETTER);
    const supabase = await createSupabaseServerClient();

    const page = params.page ?? 1;
    const perPage = params.per_page ?? 20;
    const offset = (page - 1) * perPage;

    // Count query
    let countQuery = supabase
      .from("newsletters")
      .select("id", { count: "exact", head: true });

    if (!params.include_deleted) {
      countQuery = countQuery.is("deleted_at", null);
    }
    if (params.status) {
      countQuery = countQuery.eq("status", params.status);
    }
    if (params.audience) {
      countQuery = countQuery.eq("audience", params.audience);
    }

    const { count, error: countError } = await countQuery;
    if (countError)
      return paginatedFailure(countError.message, ErrorCodes.DATABASE_ERROR);

    const total = count ?? 0;
    if (total === 0) return paginated([], 0, page, perPage);

    // Data query
    let query = supabase
      .from("newsletters")
      .select(
        `
        *,
        author:users!newsletters_author_id_fkey(id, first_name, last_name, avatar_url),
        target_class:classes!newsletters_target_class_id_fkey(id, name)
      `,
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (!params.include_deleted) {
      query = query.is("deleted_at", null);
    }
    if (params.status) {
      query = query.eq("status", params.status);
    }
    if (params.audience) {
      query = query.eq("audience", params.audience);
    }

    const { data, error } = await query;
    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    const newsletters: NewsletterWithDetails[] = (
      (data ?? []) as Array<Record<string, unknown>>
    ).map((row) => {
      const recipientCount = (row.recipient_count as number) ?? 0;
      const readCount = (row.read_count as number) ?? 0;

      return {
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        template_id: row.template_id as string | null,
        title: row.title as string,
        subject_line: row.subject_line as string,
        preheader: row.preheader as string | null,
        body_html: row.body_html as string,
        body_json: (row.body_json ?? []) as Record<string, unknown>[],
        header_image_url: row.header_image_url as string | null,
        footer_html: row.footer_html as string | null,
        status: row.status as Newsletter["status"],
        audience: row.audience as Newsletter["audience"],
        target_class_id: row.target_class_id as string | null,
        target_program_id: row.target_program_id as string | null,
        author_id: row.author_id as string,
        scheduled_for: row.scheduled_for as string | null,
        sent_at: row.sent_at as string | null,
        cancelled_at: row.cancelled_at as string | null,
        recipient_count: recipientCount,
        read_count: readCount,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        deleted_at: row.deleted_at as string | null,
        author: row.author as Pick<
          User,
          "id" | "first_name" | "last_name" | "avatar_url"
        >,
        target_class: row.target_class as Pick<Class, "id" | "name"> | null,
        sections: [],
        open_rate: recipientCount > 0 ? readCount / recipientCount : 0,
      };
    });

    return paginated(newsletters, total, page, perPage);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to list newsletters";
    return paginatedFailure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

export async function deleteNewsletter(
  newsletterId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NEWSLETTER);
    const supabase = await createSupabaseServerClient();

    // Only drafts can be deleted
    const { data: existing, error: fetchErr } = await supabase
      .from("newsletters")
      .select("id, status")
      .eq("id", newsletterId)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !existing) {
      return failure("Newsletter not found", ErrorCodes.NOT_FOUND);
    }

    const { error } = await supabase
      .from("newsletters")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", newsletterId);

    if (error) return failure(error.message, ErrorCodes.DELETE_FAILED);

    await logAudit({
      context,
      action: AuditActions.NEWSLETTER_DELETED,
      entityType: "newsletter",
      entityId: newsletterId,
    });

    return success({ deleted: true });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to delete newsletter";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// SECTIONS - UPSERT / DELETE / REORDER
// ============================================================

export async function upsertNewsletterSection(
  input: UpsertNewsletterSectionInput,
): Promise<ActionResponse<NewsletterSection>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NEWSLETTER);
    const supabase = await createSupabaseServerClient();

    if (input.id) {
      // Update existing section
      const { data, error } = await supabase
        .from("newsletter_sections")
        .update({
          section_type: input.section_type,
          sort_order: input.sort_order,
          content_json: JSON.stringify(input.content_json),
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);
      return success(data as NewsletterSection);
    }

    // Create new section
    const { data, error } = await supabase
      .from("newsletter_sections")
      .insert({
        newsletter_id: input.newsletter_id,
        tenant_id: context.tenant.id,
        section_type: input.section_type,
        sort_order: input.sort_order,
        content_json: JSON.stringify(input.content_json),
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);
    return success(data as NewsletterSection);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save section";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

export async function deleteNewsletterSection(
  sectionId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    await requirePermission(Permissions.MANAGE_NEWSLETTER);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("newsletter_sections")
      .delete()
      .eq("id", sectionId);

    if (error) return failure(error.message, ErrorCodes.DELETE_FAILED);
    return success({ deleted: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete section";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// SEND / SCHEDULE / CANCEL
// ============================================================
// sendNewsletter populates recipient rows from the audience,
// marks status = "sending", then immediately transitions to
// "sent". In production, this would trigger an email delivery
// queue (e.g., SES/Postmark); for now we simulate delivery.

export async function sendNewsletter(
  newsletterId: string,
): Promise<ActionResponse<Newsletter>> {
  try {
    const context = await requirePermission(Permissions.SEND_NEWSLETTER);
    const supabase = await createSupabaseServerClient();

    // Verify it's in a sendable state
    const { data: existing, error: fetchErr } = await supabase
      .from("newsletters")
      .select(
        "id, status, audience, target_class_id, target_program_id, tenant_id",
      )
      .eq("id", newsletterId)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !existing) {
      return failure("Newsletter not found", ErrorCodes.NOT_FOUND);
    }

    const nl = existing as Record<string, unknown>;
    const status = nl.status as string;

    if (status !== "draft" && status !== "scheduled") {
      return failure(
        "Newsletter must be draft or scheduled to send",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Mark as sending
    await supabase
      .from("newsletters")
      .update({ status: "sending" })
      .eq("id", newsletterId);

    // Resolve audience → user list
    const audience = nl.audience as string;
    let recipientUsers: Array<{ id: string; email: string }> = [];

    if (audience === "all_parents" || audience === "all_users") {
      // Get all parent-role users in the tenant via guardians
      const { data: parents } = await supabase
        .from("guardians")
        .select("user:users!guardians_user_id_fkey(id, email)")
        .is("deleted_at", null);

      if (parents) {
        const parentSet = new Map<string, string>();
        for (const row of parents as Array<Record<string, unknown>>) {
          const u = row.user as { id: string; email: string } | null;
          if (u && !parentSet.has(u.id)) {
            parentSet.set(u.id, u.email);
          }
        }
        recipientUsers.push(
          ...Array.from(parentSet.entries()).map(([id, email]) => ({
            id,
            email,
          })),
        );
      }
    }

    if (audience === "all_staff" || audience === "all_users") {
      // Get all staff via tenant_members
      const { data: staff } = await supabase
        .from("tenant_members")
        .select("user:users!tenant_members_user_id_fkey(id, email)")
        .eq("status", "active");

      if (staff) {
        const existingIds = new Set(recipientUsers.map((r) => r.id));
        for (const row of staff as Array<Record<string, unknown>>) {
          const u = row.user as { id: string; email: string } | null;
          if (u && !existingIds.has(u.id)) {
            recipientUsers.push({ id: u.id, email: u.email });
          }
        }
      }
    }

    if (audience === "class" && nl.target_class_id) {
      // Get parents of students in the target class
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", nl.target_class_id as string)
        .eq("status", "active")
        .is("deleted_at", null);

      const studentIds = (enrollments ?? []).map(
        (e) => (e as { student_id: string }).student_id,
      );

      if (studentIds.length > 0) {
        const { data: guardians } = await supabase
          .from("guardians")
          .select("user:users!guardians_user_id_fkey(id, email)")
          .in("student_id", studentIds)
          .is("deleted_at", null);

        if (guardians) {
          const parentSet = new Map<string, string>();
          for (const row of guardians as Array<Record<string, unknown>>) {
            const u = row.user as { id: string; email: string } | null;
            if (u && !parentSet.has(u.id)) {
              parentSet.set(u.id, u.email);
            }
          }
          recipientUsers.push(
            ...Array.from(parentSet.entries()).map(([id, email]) => ({
              id,
              email,
            })),
          );
        }
      }
    }

    if (audience === "program" && nl.target_program_id) {
      // Get parents of students booked into the program
      const { data: bookings } = await supabase
        .from("bookings")
        .select("student_id")
        .eq("program_id", nl.target_program_id as string)
        .eq("status", "confirmed")
        .is("deleted_at", null);

      const studentIds = (bookings ?? []).map(
        (b) => (b as { student_id: string }).student_id,
      );

      if (studentIds.length > 0) {
        const { data: guardians } = await supabase
          .from("guardians")
          .select("user:users!guardians_user_id_fkey(id, email)")
          .in("student_id", studentIds)
          .is("deleted_at", null);

        if (guardians) {
          const parentSet = new Map<string, string>();
          for (const row of guardians as Array<Record<string, unknown>>) {
            const u = row.user as { id: string; email: string } | null;
            if (u && !parentSet.has(u.id)) {
              parentSet.set(u.id, u.email);
            }
          }
          recipientUsers.push(
            ...Array.from(parentSet.entries()).map(([id, email]) => ({
              id,
              email,
            })),
          );
        }
      }
    }

    // Deduplicate
    const uniqueRecipients = Array.from(
      new Map(recipientUsers.map((r) => [r.id, r])).values(),
    );

    // Insert recipient rows
    if (uniqueRecipients.length > 0) {
      const recipientRows = uniqueRecipients.map((r) => ({
        newsletter_id: newsletterId,
        tenant_id: nl.tenant_id as string,
        user_id: r.id,
        email: r.email,
        delivered_at: new Date().toISOString(),
      }));

      await supabase.from("newsletter_recipients").insert(recipientRows);
    }

    // Finalize: mark as sent
    const { data: updated, error: updateErr } = await supabase
      .from("newsletters")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        recipient_count: uniqueRecipients.length,
      })
      .eq("id", newsletterId)
      .select()
      .single();

    if (updateErr) return failure(updateErr.message, ErrorCodes.UPDATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.NEWSLETTER_SENT,
      entityType: "newsletter",
      entityId: newsletterId,
      metadata: { recipient_count: uniqueRecipients.length },
    });

    return success(updated as Newsletter);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to send newsletter";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

export async function scheduleNewsletter(
  newsletterId: string,
  scheduledFor: string,
): Promise<ActionResponse<Newsletter>> {
  try {
    const context = await requirePermission(Permissions.SEND_NEWSLETTER);
    const supabase = await createSupabaseServerClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("newsletters")
      .select("id, status")
      .eq("id", newsletterId)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !existing) {
      return failure("Newsletter not found", ErrorCodes.NOT_FOUND);
    }

    const status = (existing as { status: string }).status;
    if (status !== "draft" && status !== "scheduled") {
      return failure(
        "Only draft or scheduled newsletters can be rescheduled",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("newsletters")
      .update({
        status: "scheduled",
        scheduled_for: scheduledFor,
      })
      .eq("id", newsletterId)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.NEWSLETTER_SCHEDULED,
      entityType: "newsletter",
      entityId: newsletterId,
      metadata: { scheduled_for: scheduledFor },
    });

    return success(data as Newsletter);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to schedule newsletter";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

export async function cancelNewsletter(
  newsletterId: string,
): Promise<ActionResponse<Newsletter>> {
  try {
    const context = await requirePermission(Permissions.SEND_NEWSLETTER);
    const supabase = await createSupabaseServerClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("newsletters")
      .select("id, status")
      .eq("id", newsletterId)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !existing) {
      return failure("Newsletter not found", ErrorCodes.NOT_FOUND);
    }

    const status = (existing as { status: string }).status;
    if (status !== "draft" && status !== "scheduled") {
      return failure(
        "Only draft or scheduled newsletters can be cancelled",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("newsletters")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", newsletterId)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.NEWSLETTER_CANCELLED,
      entityType: "newsletter",
      entityId: newsletterId,
    });

    return success(data as Newsletter);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to cancel newsletter";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// READ RECEIPTS
// ============================================================
// Called when a parent opens a newsletter. Idempotent - only
// sets opened_at on first open. Updates the newsletter's
// read_count aggregate.

export async function recordReadReceipt(
  newsletterId: string,
): Promise<ActionResponse<{ recorded: boolean }>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Check if a recipient row exists for this user
    const { data: existing } = await supabase
      .from("newsletter_recipients")
      .select("id, opened_at")
      .eq("newsletter_id", newsletterId)
      .eq("user_id", context.user.id)
      .limit(1)
      .single();

    if (!existing) {
      // Not a recipient - silently succeed
      return success({ recorded: false });
    }

    const row = existing as { id: string; opened_at: string | null };
    if (row.opened_at) {
      // Already recorded
      return success({ recorded: true });
    }

    // Mark as opened
    await supabase
      .from("newsletter_recipients")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", row.id);

    // Increment read_count on the newsletter
    const { data: nl } = await supabase
      .from("newsletters")
      .select("read_count")
      .eq("id", newsletterId)
      .single();

    if (nl) {
      await supabase
        .from("newsletters")
        .update({
          read_count: ((nl as { read_count: number }).read_count ?? 0) + 1,
        })
        .eq("id", newsletterId);
    }

    return success({ recorded: true });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to record read receipt";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// RECIPIENT LIST (for analytics)
// ============================================================

export async function listNewsletterRecipients(
  params: ListRecipientsInput,
): Promise<PaginatedResponse<NewsletterRecipientWithUser>> {
  try {
    await requirePermission(Permissions.VIEW_NEWSLETTER);
    const supabase = await createSupabaseServerClient();

    const page = params.page ?? 1;
    const perPage = params.per_page ?? 50;
    const offset = (page - 1) * perPage;

    let countQuery = supabase
      .from("newsletter_recipients")
      .select("id", { count: "exact", head: true })
      .eq("newsletter_id", params.newsletter_id);

    if (params.opened_only) {
      countQuery = countQuery.not("opened_at", "is", null);
    }

    const { count, error: countError } = await countQuery;
    if (countError)
      return paginatedFailure(countError.message, ErrorCodes.DATABASE_ERROR);

    const total = count ?? 0;
    if (total === 0) return paginated([], 0, page, perPage);

    let query = supabase
      .from("newsletter_recipients")
      .select(
        `
        *,
        user:users!newsletter_recipients_user_id_fkey(id, first_name, last_name, avatar_url)
      `,
      )
      .eq("newsletter_id", params.newsletter_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (params.opened_only) {
      query = query.not("opened_at", "is", null);
    }

    const { data, error } = await query;
    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    return paginated(
      (data ?? []) as NewsletterRecipientWithUser[],
      total,
      page,
      perPage,
    );
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to list recipients";
    return paginatedFailure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// NEWSLETTERS FOR PARENT
// ============================================================
// Returns sent newsletters visible to the current parent based
// on their children's class/program enrollments + school-wide.

export async function getNewslettersForParent(
  params: { page?: number; per_page?: number } = {},
): Promise<PaginatedResponse<NewsletterWithDetails>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const page = params.page ?? 1;
    const perPage = params.per_page ?? 20;
    const offset = (page - 1) * perPage;

    // Resolve parent's class IDs
    const { data: guardianships } = await supabase
      .from("guardians")
      .select("student_id")
      .eq("user_id", context.user.id)
      .is("deleted_at", null);

    const studentIds = (guardianships ?? []).map(
      (g) => (g as { student_id: string }).student_id,
    );

    let classIds: string[] = [];
    if (studentIds.length > 0) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("class_id")
        .in("student_id", studentIds)
        .eq("status", "active")
        .is("deleted_at", null);

      classIds = [
        ...new Set(
          (enrollments ?? []).map((e) => (e as { class_id: string }).class_id),
        ),
      ];
    }

    // Build OR filter: school-wide audiences OR class-targeted
    const audienceFilters: string[] = [
      "audience.eq.all_parents",
      "audience.eq.all_users",
    ];
    if (classIds.length > 0) {
      audienceFilters.push(`target_class_id.in.(${classIds.join(",")})`);
    }
    const scopeFilter = audienceFilters.join(",");

    // Count
    const { count, error: countError } = await supabase
      .from("newsletters")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "sent")
      .or(scopeFilter);

    if (countError)
      return paginatedFailure(countError.message, ErrorCodes.DATABASE_ERROR);

    const total = count ?? 0;
    if (total === 0) return paginated([], 0, page, perPage);

    // Data
    const { data, error } = await supabase
      .from("newsletters")
      .select(
        `
        *,
        author:users!newsletters_author_id_fkey(id, first_name, last_name, avatar_url),
        target_class:classes!newsletters_target_class_id_fkey(id, name)
      `,
      )
      .is("deleted_at", null)
      .eq("status", "sent")
      .or(scopeFilter)
      .order("sent_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    const newsletters: NewsletterWithDetails[] = (
      (data ?? []) as Array<Record<string, unknown>>
    ).map((row) => {
      const recipientCount = (row.recipient_count as number) ?? 0;
      const readCount = (row.read_count as number) ?? 0;

      return {
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        template_id: row.template_id as string | null,
        title: row.title as string,
        subject_line: row.subject_line as string,
        preheader: row.preheader as string | null,
        body_html: row.body_html as string,
        body_json: (row.body_json ?? []) as Record<string, unknown>[],
        header_image_url: row.header_image_url as string | null,
        footer_html: row.footer_html as string | null,
        status: row.status as Newsletter["status"],
        audience: row.audience as Newsletter["audience"],
        target_class_id: row.target_class_id as string | null,
        target_program_id: row.target_program_id as string | null,
        author_id: row.author_id as string,
        scheduled_for: row.scheduled_for as string | null,
        sent_at: row.sent_at as string | null,
        cancelled_at: row.cancelled_at as string | null,
        recipient_count: recipientCount,
        read_count: readCount,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        deleted_at: row.deleted_at as string | null,
        author: row.author as Pick<
          User,
          "id" | "first_name" | "last_name" | "avatar_url"
        >,
        target_class: row.target_class as Pick<Class, "id" | "name"> | null,
        sections: [],
        open_rate: recipientCount > 0 ? readCount / recipientCount : 0,
      };
    });

    return paginated(newsletters, total, page, perPage);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to get newsletters";
    return paginatedFailure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// DASHBOARD
// ============================================================

export async function getNewsletterDashboard(): Promise<
  ActionResponse<NewsletterDashboardData>
> {
  try {
    await requirePermission(Permissions.VIEW_NEWSLETTER);
    const supabase = await createSupabaseServerClient();

    // Recent newsletters (last 10)
    const { data: recent } = await supabase
      .from("newsletters")
      .select(
        `
        *,
        author:users!newsletters_author_id_fkey(id, first_name, last_name, avatar_url),
        target_class:classes!newsletters_target_class_id_fkey(id, name)
      `,
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(10);

    const recentNewsletters: NewsletterWithDetails[] = (
      (recent ?? []) as Array<Record<string, unknown>>
    ).map((row) => {
      const recipientCount = (row.recipient_count as number) ?? 0;
      const readCount = (row.read_count as number) ?? 0;

      return {
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        template_id: row.template_id as string | null,
        title: row.title as string,
        subject_line: row.subject_line as string,
        preheader: row.preheader as string | null,
        body_html: row.body_html as string,
        body_json: (row.body_json ?? []) as Record<string, unknown>[],
        header_image_url: row.header_image_url as string | null,
        footer_html: row.footer_html as string | null,
        status: row.status as Newsletter["status"],
        audience: row.audience as Newsletter["audience"],
        target_class_id: row.target_class_id as string | null,
        target_program_id: row.target_program_id as string | null,
        author_id: row.author_id as string,
        scheduled_for: row.scheduled_for as string | null,
        sent_at: row.sent_at as string | null,
        cancelled_at: row.cancelled_at as string | null,
        recipient_count: recipientCount,
        read_count: readCount,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        deleted_at: row.deleted_at as string | null,
        author: row.author as Pick<
          User,
          "id" | "first_name" | "last_name" | "avatar_url"
        >,
        target_class: row.target_class as Pick<Class, "id" | "name"> | null,
        sections: [],
        open_rate: recipientCount > 0 ? readCount / recipientCount : 0,
      };
    });

    // Templates
    const { data: templateData } = await supabase
      .from("newsletter_templates")
      .select("*")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    // Aggregate stats
    const sentNewsletters = recentNewsletters.filter(
      (n) => n.status === "sent",
    );
    const totalRecipients = sentNewsletters.reduce(
      (sum, n) => sum + n.recipient_count,
      0,
    );
    const totalReads = sentNewsletters.reduce(
      (sum, n) => sum + n.read_count,
      0,
    );

    // Broader stats via count queries
    const [draftCount, scheduledCount, sentCount] = await Promise.all([
      supabase
        .from("newsletters")
        .select("id", { count: "exact", head: true })
        .eq("status", "draft")
        .is("deleted_at", null),
      supabase
        .from("newsletters")
        .select("id", { count: "exact", head: true })
        .eq("status", "scheduled")
        .is("deleted_at", null),
      supabase
        .from("newsletters")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .is("deleted_at", null),
    ]);

    return success({
      recent_newsletters: recentNewsletters,
      templates: (templateData ?? []) as NewsletterTemplate[],
      stats: {
        total_sent: sentCount.count ?? 0,
        total_drafts: draftCount.count ?? 0,
        total_scheduled: scheduledCount.count ?? 0,
        avg_open_rate: totalRecipients > 0 ? totalReads / totalRecipients : 0,
        total_recipients_all_time: totalRecipients,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get dashboard";
    return failure(msg, ErrorCodes.INTERNAL_ERROR);
  }
}
