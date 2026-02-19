// src/lib/actions/enrollment-documents.ts
//
// ============================================================
// WattleOS V2 - Enrollment Document Server Actions (Module 10)
// ============================================================
// Handles document uploads attached to enrollment applications.
// Documents are stored in Supabase Storage; this module manages
// the metadata records and admin verification workflow.
//
// WHY separate from enrollment-applications.ts: Documents have
// their own CRUD lifecycle (upload, verify, replace) independent
// of application status transitions. Keeping them separate
// avoids bloating the application actions file.
//
// All actions return ActionResponse<T> - never throw.
// RLS enforces tenant isolation at the database level.
// ============================================================

"use server";

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type { EnrollmentDocument } from "@/types/domain";

// ============================================================
// Input Types
// ============================================================

export interface CreateDocumentInput {
  application_id: string;
  document_type: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  uploaded_by_email: string;
}

// ============================================================
// LIST DOCUMENTS FOR AN APPLICATION
// ============================================================

export async function listApplicationDocuments(
  applicationId: string,
): Promise<ActionResponse<EnrollmentDocument[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("enrollment_documents")
      .select("*")
      .eq("application_id", applicationId)
      .is("deleted_at", null)
      .order("document_type", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as EnrollmentDocument[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list documents";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// CREATE DOCUMENT RECORD
// ============================================================
// Called after the file has been uploaded to Supabase Storage.
// The frontend uploads the file first, gets the storage_path,
// then calls this to create the metadata record.

export async function createEnrollmentDocument(
  tenantId: string,
  input: CreateDocumentInput,
): Promise<ActionResponse<EnrollmentDocument>> {
  try {
    const supabase = await createSupabaseServerClient();

    // Validate required fields
    if (!input.application_id) {
      return failure("Application ID is required", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.document_type?.trim()) {
      return failure("Document type is required", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.file_name?.trim()) {
      return failure("File name is required", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.storage_path?.trim()) {
      return failure("Storage path is required", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("enrollment_documents")
      .insert({
        tenant_id: tenantId,
        application_id: input.application_id,
        document_type: input.document_type.trim(),
        file_name: input.file_name.trim(),
        storage_path: input.storage_path.trim(),
        mime_type: input.mime_type,
        file_size_bytes: input.file_size_bytes,
        uploaded_by_email: input.uploaded_by_email.toLowerCase(),
      })
      .select("*")
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success(data as EnrollmentDocument);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create document record";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// VERIFY DOCUMENT (Admin)
// ============================================================
// Admin marks a document as verified after reviewing it.
// This is a compliance requirement - schools must verify
// immunization records and court orders are authentic.

export async function verifyDocument(
  documentId: string,
): Promise<ActionResponse<EnrollmentDocument>> {
  try {
    await requirePermission(Permissions.REVIEW_APPLICATIONS);
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("enrollment_documents")
      .update({
        verified: true,
        verified_by: context.user.id,
        verified_at: new Date().toISOString(),
      })
      .eq("id", documentId)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as EnrollmentDocument);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to verify document";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UNVERIFY DOCUMENT (Admin)
// ============================================================
// Reverses verification if admin made an error or document
// needs to be replaced.

export async function unverifyDocument(
  documentId: string,
): Promise<ActionResponse<EnrollmentDocument>> {
  try {
    await requirePermission(Permissions.REVIEW_APPLICATIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("enrollment_documents")
      .update({
        verified: false,
        verified_by: null,
        verified_at: null,
      })
      .eq("id", documentId)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as EnrollmentDocument);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to unverify document";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// ADD NOTE TO DOCUMENT (Admin)
// ============================================================
// Admin can add notes to a document (e.g., "Expiry date:
// 2027-03-15" or "Missing page 2").

export async function updateDocumentNotes(
  documentId: string,
  notes: string | null,
): Promise<ActionResponse<EnrollmentDocument>> {
  try {
    await requirePermission(Permissions.REVIEW_APPLICATIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("enrollment_documents")
      .update({ notes: notes?.trim() ?? null })
      .eq("id", documentId)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as EnrollmentDocument);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update document notes";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// SOFT DELETE DOCUMENT
// ============================================================
// Removes the metadata record. The actual file in Supabase
// Storage should be cleaned up by a separate garbage collection
// process (or left in place for audit trail).

export async function deleteEnrollmentDocument(
  documentId: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("enrollment_documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", documentId)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    return success({ id: documentId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete document";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
