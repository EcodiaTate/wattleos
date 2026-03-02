"use server";

// src/lib/actions/policies.ts
//
// ============================================================
// WattleOS V2 - Policy & Complaint Server Actions (Reg 168/170)
// ============================================================
// Manages the full lifecycle of:
//   - Service policies (draft → active → archived, versioned)
//   - Staff policy acknowledgements
//   - Complaints register with escalation tracking
//
// KEY REGULATIONS:
//   Reg 168: Policies and procedures required
//   Reg 170: Complaints handling
//
// AUDIT: All mutations are logged for regulatory compliance.
// ============================================================

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  Policy,
  PolicyVersion,
  PolicyAcknowledgement,
  Complaint,
  ComplaintResponse,
} from "@/types/domain";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import {
  createPolicySchema,
  updatePolicySchema,
  publishPolicySchema,
  createComplaintSchema,
  updateComplaintSchema,
  complaintResponseSchema,
  resolveComplaintSchema,
  escalateComplaintSchema,
  type CreatePolicyInput,
  type UpdatePolicyInput,
  type PublishPolicyInput,
  type CreateComplaintInput,
  type UpdateComplaintInput,
  type ComplaintResponseInput,
  type ResolveComplaintInput,
  type EscalateComplaintInput,
} from "@/lib/validations/policies";

// ============================================================
// COMPOSITE TYPES
// ============================================================

export interface PolicyWithVersions extends Policy {
  versions: PolicyVersion[];
  acknowledgement_count: number;
}

export interface ComplaintWithResponses extends Complaint {
  responses: ComplaintResponse[];
}

// ============================================================
// CREATE POLICY
// ============================================================

export async function createPolicy(
  input: CreatePolicyInput,
): Promise<ActionResponse<Policy>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_POLICIES);
    const supabase = await createSupabaseServerClient();

    const parsed = createPolicySchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("policies")
      .insert({
        tenant_id: context.tenant.id,
        title: v.title,
        category: v.category,
        regulation_reference: v.regulation_reference ?? null,
        content: v.content ?? null,
        document_url: v.document_url || null,
        effective_date: v.effective_date ?? null,
        review_date: v.review_date ?? null,
        requires_parent_notice: v.requires_parent_notice,
        version: 1,
        status: "draft",
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to create policy",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.POLICY_CREATED,
      entityType: "policy",
      entityId: data.id,
      metadata: { title: v.title, category: v.category },
    });

    return success(data as Policy);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// UPDATE POLICY
// ============================================================

export async function updatePolicy(
  id: string,
  input: UpdatePolicyInput,
): Promise<ActionResponse<Policy>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_POLICIES);
    const supabase = await createSupabaseServerClient();

    const parsed = updatePolicySchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const updateData: Record<string, unknown> = {};
    const v = parsed.data;
    if (v.title !== undefined) updateData.title = v.title;
    if (v.category !== undefined) updateData.category = v.category;
    if (v.regulation_reference !== undefined) updateData.regulation_reference = v.regulation_reference ?? null;
    if (v.content !== undefined) updateData.content = v.content ?? null;
    if (v.document_url !== undefined) updateData.document_url = v.document_url || null;
    if (v.effective_date !== undefined) updateData.effective_date = v.effective_date ?? null;
    if (v.review_date !== undefined) updateData.review_date = v.review_date ?? null;
    if (v.requires_parent_notice !== undefined) updateData.requires_parent_notice = v.requires_parent_notice;

    const { data, error } = await supabase
      .from("policies")
      .update(updateData)
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to update policy",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.POLICY_UPDATED,
      entityType: "policy",
      entityId: id,
      metadata: { updated_fields: Object.keys(updateData) },
    });

    return success(data as Policy);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// PUBLISH POLICY (snapshot version, mark active)
// ============================================================

export async function publishPolicy(
  input: PublishPolicyInput,
): Promise<ActionResponse<Policy>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_POLICIES);
    const supabase = await createSupabaseServerClient();

    const parsed = publishPolicySchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Get current policy
    const { data: policy } = await supabase
      .from("policies")
      .select("*")
      .eq("id", v.policy_id)
      .is("deleted_at", null)
      .single();

    if (!policy) {
      return failure("Policy not found", ErrorCodes.NOT_FOUND);
    }

    const p = policy as Policy;
    const newVersion = p.version + 1;

    // Create version snapshot
    await supabase.from("policy_versions").insert({
      tenant_id: context.tenant.id,
      policy_id: p.id,
      version: newVersion,
      content: p.content,
      document_url: p.document_url,
      change_summary: v.change_summary,
      created_by: context.user.id,
    });

    // Update policy to active
    const { data, error } = await supabase
      .from("policies")
      .update({
        status: "active",
        version: newVersion,
        published_at: new Date().toISOString(),
        published_by: context.user.id,
      })
      .eq("id", p.id)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to publish policy",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.POLICY_PUBLISHED,
      entityType: "policy",
      entityId: p.id,
      metadata: {
        version: newVersion,
        change_summary: v.change_summary,
      },
    });

    return success(data as Policy);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ARCHIVE POLICY
// ============================================================

export async function archivePolicy(
  id: string,
): Promise<ActionResponse<Policy>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_POLICIES);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("policies")
      .update({ status: "archived" })
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Policy not found",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.POLICY_ARCHIVED,
      entityType: "policy",
      entityId: id,
    });

    return success(data as Policy);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// LIST POLICIES
// ============================================================

export async function listPolicies(filters?: {
  status?: "draft" | "active" | "archived";
  category?: string;
}): Promise<ActionResponse<Policy[]>> {
  try {
    await requirePermission(Permissions.MANAGE_POLICIES);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("policies")
      .select("*")
      .is("deleted_at", null)
      .order("title");

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.category) {
      query = query.eq("category", filters.category);
    }

    const { data, error } = await query;

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as Policy[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET POLICY (with versions + acknowledgement count)
// ============================================================

export async function getPolicy(
  id: string,
): Promise<ActionResponse<PolicyWithVersions>> {
  try {
    await requirePermission(Permissions.MANAGE_POLICIES);
    const supabase = await createSupabaseServerClient();

    const { data: policy, error } = await supabase
      .from("policies")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !policy) {
      return failure("Policy not found", ErrorCodes.NOT_FOUND);
    }

    const [versionsResult, ackResult] = await Promise.all([
      supabase
        .from("policy_versions")
        .select("*")
        .eq("policy_id", id)
        .order("version", { ascending: false }),
      supabase
        .from("policy_acknowledgements")
        .select("id")
        .eq("policy_id", id)
        .eq("version", (policy as Policy).version),
    ]);

    return success({
      ...(policy as Policy),
      versions: (versionsResult.data ?? []) as PolicyVersion[],
      acknowledgement_count: ackResult.data?.length ?? 0,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET POLICY ACKNOWLEDGEMENTS
// ============================================================

export async function getPolicyAcknowledgements(
  policyId: string,
  version?: number,
): Promise<ActionResponse<PolicyAcknowledgement[]>> {
  try {
    await requirePermission(Permissions.MANAGE_POLICIES);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("policy_acknowledgements")
      .select("*")
      .eq("policy_id", policyId)
      .order("acknowledged_at", { ascending: false });

    if (version !== undefined) {
      query = query.eq("version", version);
    }

    const { data, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as PolicyAcknowledgement[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ACKNOWLEDGE POLICY (staff read-receipt)
// ============================================================

export async function acknowledgePolicy(
  policyId: string,
): Promise<ActionResponse<PolicyAcknowledgement>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Get current policy version
    const { data: policy } = await supabase
      .from("policies")
      .select("version")
      .eq("id", policyId)
      .eq("status", "active")
      .single();

    if (!policy) {
      return failure("Policy not found or not active", ErrorCodes.NOT_FOUND);
    }

    const version = (policy as { version: number }).version;

    // Check for existing acknowledgement
    const { data: existing } = await supabase
      .from("policy_acknowledgements")
      .select("id")
      .eq("policy_id", policyId)
      .eq("user_id", context.user.id)
      .eq("version", version)
      .maybeSingle();

    if (existing) {
      return failure("Already acknowledged this version", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("policy_acknowledgements")
      .insert({
        tenant_id: context.tenant.id,
        policy_id: policyId,
        user_id: context.user.id,
        version,
        acknowledged_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to acknowledge",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.POLICY_ACKNOWLEDGED,
      entityType: "policy_acknowledgement",
      entityId: data.id,
      metadata: { policy_id: policyId, version },
    });

    return success(data as PolicyAcknowledgement);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// CREATE COMPLAINT
// ============================================================

export async function createComplaint(
  input: CreateComplaintInput,
): Promise<ActionResponse<Complaint>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_COMPLAINTS);
    const supabase = await createSupabaseServerClient();

    const parsed = createComplaintSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("complaints")
      .insert({
        tenant_id: context.tenant.id,
        received_at: v.received_at,
        complainant_type: v.complainant_type,
        complainant_name: v.complainant_name ?? null,
        complainant_contact: v.complainant_contact ?? null,
        subject: v.subject,
        description: v.description,
        assigned_to: v.assigned_to ?? null,
        target_resolution_date: v.target_resolution_date ?? null,
        status: "open",
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to create complaint",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.COMPLAINT_CREATED,
      entityType: "complaint",
      entityId: data.id,
      metadata: {
        subject: v.subject,
        complainant_type: v.complainant_type,
      },
    });

    return success(data as Complaint);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// UPDATE COMPLAINT
// ============================================================

export async function updateComplaint(
  id: string,
  input: UpdateComplaintInput,
): Promise<ActionResponse<Complaint>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_COMPLAINTS);
    const supabase = await createSupabaseServerClient();

    const parsed = updateComplaintSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const updateData: Record<string, unknown> = {};
    const v = parsed.data;
    if (v.received_at !== undefined) updateData.received_at = v.received_at;
    if (v.complainant_type !== undefined) updateData.complainant_type = v.complainant_type;
    if (v.complainant_name !== undefined) updateData.complainant_name = v.complainant_name ?? null;
    if (v.complainant_contact !== undefined) updateData.complainant_contact = v.complainant_contact ?? null;
    if (v.subject !== undefined) updateData.subject = v.subject;
    if (v.description !== undefined) updateData.description = v.description;
    if (v.assigned_to !== undefined) updateData.assigned_to = v.assigned_to ?? null;
    if (v.target_resolution_date !== undefined) updateData.target_resolution_date = v.target_resolution_date ?? null;

    const { data, error } = await supabase
      .from("complaints")
      .update(updateData)
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to update complaint",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.COMPLAINT_UPDATED,
      entityType: "complaint",
      entityId: id,
      metadata: { updated_fields: Object.keys(updateData) },
    });

    return success(data as Complaint);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ADD COMPLAINT RESPONSE
// ============================================================

export async function addComplaintResponse(
  input: ComplaintResponseInput,
): Promise<ActionResponse<ComplaintResponse>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_COMPLAINTS);
    const supabase = await createSupabaseServerClient();

    const parsed = complaintResponseSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Move complaint to in_progress if still open
    await supabase
      .from("complaints")
      .update({ status: "in_progress" })
      .eq("id", v.complaint_id)
      .eq("status", "open");

    const { data, error } = await supabase
      .from("complaint_responses")
      .insert({
        tenant_id: context.tenant.id,
        complaint_id: v.complaint_id,
        action_taken: v.action_taken,
        notes: v.notes ?? null,
        recorded_by: context.user.id,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to add response",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.COMPLAINT_RESPONSE_ADDED,
      entityType: "complaint_response",
      entityId: data.id,
      metadata: { complaint_id: v.complaint_id },
    });

    return success(data as ComplaintResponse);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// RESOLVE COMPLAINT
// ============================================================

export async function resolveComplaint(
  input: ResolveComplaintInput,
): Promise<ActionResponse<Complaint>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_COMPLAINTS);
    const supabase = await createSupabaseServerClient();

    const parsed = resolveComplaintSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("complaints")
      .update({
        status: "resolved",
        resolution_outcome: v.resolution_outcome,
        resolved_at: new Date().toISOString(),
        resolved_by: context.user.id,
      })
      .eq("id", v.complaint_id)
      .not("status", "eq", "resolved")
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Complaint not found or already resolved",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.COMPLAINT_RESOLVED,
      entityType: "complaint",
      entityId: v.complaint_id,
      metadata: { resolution_outcome: v.resolution_outcome },
    });

    return success(data as Complaint);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ESCALATE COMPLAINT
// ============================================================

export async function escalateComplaint(
  input: EscalateComplaintInput,
): Promise<ActionResponse<Complaint>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_COMPLAINTS);
    const supabase = await createSupabaseServerClient();

    const parsed = escalateComplaintSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("complaints")
      .update({
        status: "escalated",
        escalated_to: v.escalated_to,
        escalated_at: new Date().toISOString(),
      })
      .eq("id", v.complaint_id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Complaint not found",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.COMPLAINT_ESCALATED,
      entityType: "complaint",
      entityId: v.complaint_id,
      metadata: { escalated_to: v.escalated_to },
    });

    return success(data as Complaint);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// LIST COMPLAINTS
// ============================================================

export async function listComplaints(filters?: {
  status?: "open" | "in_progress" | "resolved" | "escalated";
}): Promise<ActionResponse<Complaint[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_COMPLAINTS);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("complaints")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("received_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as Complaint[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET COMPLAINT (with responses)
// ============================================================

export async function getComplaint(
  id: string,
): Promise<ActionResponse<ComplaintWithResponses>> {
  try {
    await requirePermission(Permissions.VIEW_COMPLAINTS);
    const supabase = await createSupabaseServerClient();

    const { data: complaint, error } = await supabase
      .from("complaints")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !complaint) {
      return failure("Complaint not found", ErrorCodes.NOT_FOUND);
    }

    const { data: responses } = await supabase
      .from("complaint_responses")
      .select("*")
      .eq("complaint_id", id)
      .order("created_at", { ascending: true });

    return success({
      ...(complaint as Complaint),
      responses: (responses ?? []) as ComplaintResponse[],
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// REG 168 COMPLIANCE CHECK
// ============================================================

export interface Reg168ComplianceItem {
  key: string;
  title: string;
  regulation: string;
  guidance: string;
  category: string;
  critical: boolean;
  status: "covered" | "missing" | "review_due";
  matched_policy: {
    id: string;
    title: string;
    status: string;
    review_date: string | null;
  } | null;
}

export interface Reg168ComplianceSummary {
  total: number;
  covered: number;
  missing: number;
  review_due: number;
  critical_missing: number;
  compliance_percent: number;
  items: Reg168ComplianceItem[];
}

export async function getReg168Compliance(): Promise<
  ActionResponse<Reg168ComplianceSummary>
> {
  try {
    await requirePermission(Permissions.MANAGE_POLICIES);
    const supabase = await createSupabaseServerClient();

    // Import inline to avoid circular dependency
    const { REG_168_REQUIREMENTS } = await import(
      "@/lib/constants/reg168-policies"
    );

    // Get all active/draft policies
    const { data: policies } = await supabase
      .from("policies")
      .select("id, title, category, regulation_reference, status, review_date")
      .in("status", ["active", "draft"])
      .is("deleted_at", null);

    const today = new Date().toISOString().split("T")[0];
    const policyList = (policies ?? []) as Array<{
      id: string;
      title: string;
      category: string;
      regulation_reference: string | null;
      status: string;
      review_date: string | null;
    }>;

    const items: Reg168ComplianceItem[] = REG_168_REQUIREMENTS.map((req) => {
      // Try to match by: regulation reference, title keyword, or category
      const matched = policyList.find((p) => {
        // Match by regulation reference
        if (
          p.regulation_reference &&
          req.regulation
            .toLowerCase()
            .includes(p.regulation_reference.toLowerCase())
        )
          return true;

        // Match by title keywords (fuzzy)
        const titleLower = p.title.toLowerCase();
        const reqTitleLower = req.title.toLowerCase();
        const reqWords = reqTitleLower
          .split(/\s+/)
          .filter((w) => w.length > 3);
        const matchedWords = reqWords.filter((w) => titleLower.includes(w));
        if (matchedWords.length >= 2) return true;

        // Match by key words in the requirement key
        const keyWords = req.key.split("_").filter((w) => w.length > 3);
        if (keyWords.some((w) => titleLower.includes(w))) return true;

        return false;
      });

      let status: "covered" | "missing" | "review_due" = "missing";
      if (matched) {
        if (
          matched.status === "active" &&
          matched.review_date &&
          matched.review_date < today
        ) {
          status = "review_due";
        } else {
          status = "covered";
        }
      }

      return {
        key: req.key,
        title: req.title,
        regulation: req.regulation,
        guidance: req.guidance,
        category: req.category,
        critical: req.critical,
        status,
        matched_policy: matched
          ? {
              id: matched.id,
              title: matched.title,
              status: matched.status,
              review_date: matched.review_date,
            }
          : null,
      };
    });

    const covered = items.filter((i) => i.status === "covered").length;
    const missing = items.filter((i) => i.status === "missing").length;
    const reviewDue = items.filter((i) => i.status === "review_due").length;
    const criticalMissing = items.filter(
      (i) => i.status === "missing" && i.critical,
    ).length;

    return success({
      total: items.length,
      covered,
      missing,
      review_due: reviewDue,
      critical_missing: criticalMissing,
      compliance_percent:
        items.length > 0 ? Math.round((covered / items.length) * 100) : 0,
      items,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// EXPORT COMPLAINT REGISTER (CSV data)
// ============================================================

export interface ComplaintExportRow {
  id: string;
  subject: string;
  complainant_type: string;
  status: string;
  received_date: string;
  target_resolution_date: string | null;
  resolved_at: string | null;
  outcome: string | null;
  response_count: number;
}

export async function exportComplaintRegister(): Promise<
  ActionResponse<ComplaintExportRow[]>
> {
  try {
    await requirePermission(Permissions.MANAGE_COMPLAINTS);
    const supabase = await createSupabaseServerClient();

    const { data: complaints, error } = await supabase
      .from("complaints")
      .select("id, subject, complainant_type, status, created_at, target_resolution_date, resolved_at, outcome")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const rows: ComplaintExportRow[] = [];
    for (const c of complaints ?? []) {
      const rec = c as Record<string, unknown>;
      const { count } = await supabase
        .from("complaint_responses")
        .select("id", { count: "exact", head: true })
        .eq("complaint_id", rec.id as string);

      rows.push({
        id: rec.id as string,
        subject: rec.subject as string,
        complainant_type: rec.complainant_type as string,
        status: rec.status as string,
        received_date: (rec.created_at as string).split("T")[0],
        target_resolution_date: (rec.target_resolution_date as string) ?? null,
        resolved_at: (rec.resolved_at as string) ?? null,
        outcome: (rec.outcome as string) ?? null,
        response_count: count ?? 0,
      });
    }

    return success(rows);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
