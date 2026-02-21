// src/lib/actions/billing.ts
//
// ============================================================
// WattleOS V2 - Billing Server Actions
// ============================================================
// Manages fee schedules, invoices, and Stripe synchronization.
//
// FLOW:
// 1. Admin creates fee schedule (pricing rules)
// 2. Admin creates invoice for a student+guardian
// 3. "Sync to Stripe" pushes the invoice to Stripe
// 4. "Send Invoice" emails the parent via Stripe
// 5. Parent pays via Stripe hosted page
// 6. Webhook updates invoice status + creates payment record
//
// AUDIT: All mutations are logged via logAudit() for compliance.
// ============================================================

"use server";

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  FeeSchedule,
  Invoice,
  InvoiceLineItem,
  InvoiceWithDetails,
  Payment,
} from "@/types/domain";
import { logAudit, AuditActions } from "@/lib/utils/audit";

// ============================================================
// FEE SCHEDULE ACTIONS
// ============================================================

export interface CreateFeeScheduleInput {
  name: string;
  class_id?: string | null;
  amount_cents: number;
  currency?: string;
  frequency: string;
  description?: string;
  effective_from?: string;
  effective_until?: string | null;
}

export async function createFeeSchedule(
  input: CreateFeeScheduleInput,
): Promise<ActionResponse<FeeSchedule>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    if (!input.name?.trim())
      return failure("Name is required", ErrorCodes.VALIDATION_ERROR);
    if (input.amount_cents < 0)
      return failure("Amount must be positive", ErrorCodes.VALIDATION_ERROR);

    const { data, error } = await supabase
      .from("fee_schedules")
      .insert({
        tenant_id: context.tenant.id,
        name: input.name.trim(),
        class_id: input.class_id || null,
        amount_cents: input.amount_cents,
        currency: input.currency ?? context.tenant.currency.toLowerCase(),
        frequency: input.frequency,
        description: input.description?.trim() || null,
        effective_from:
          input.effective_from ?? new Date().toISOString().split("T")[0],
        effective_until: input.effective_until || null,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    // WHY: Fee schedule changes affect billing for all students -
    // audit trail needed for financial compliance.
    await logAudit({
      context,
      action: AuditActions.SETTINGS_UPDATED,
      entityType: "fee_schedule",
      entityId: (data as FeeSchedule).id,
      metadata: {
        name: input.name,
        amount_cents: input.amount_cents,
        frequency: input.frequency,
        class_id: input.class_id || null,
      },
    });

    return success(data as FeeSchedule);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listFeeSchedules(): Promise<
  ActionResponse<FeeSchedule[]>
> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("fee_schedules")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as FeeSchedule[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateFeeSchedule(
  id: string,
  input: Partial<CreateFeeScheduleInput> & { is_active?: boolean },
): Promise<ActionResponse<FeeSchedule>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.amount_cents !== undefined)
      updateData.amount_cents = input.amount_cents;
    if (input.frequency !== undefined) updateData.frequency = input.frequency;
    if (input.description !== undefined)
      updateData.description = input.description?.trim() || null;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;
    if (input.effective_until !== undefined)
      updateData.effective_until = input.effective_until;

    const { data, error } = await supabase
      .from("fee_schedules")
      .update(updateData)
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.SETTINGS_UPDATED,
      entityType: "fee_schedule",
      entityId: id,
      metadata: { updated_fields: Object.keys(updateData) },
    });

    return success(data as FeeSchedule);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// INVOICE ACTIONS
// ============================================================

export interface CreateInvoiceInput {
  student_id: string;
  guardian_id: string;
  due_date: string;
  period_start?: string;
  period_end?: string;
  notes?: string;
  line_items: Array<{
    fee_schedule_id?: string;
    description: string;
    quantity: number;
    unit_amount_cents: number;
  }>;
}

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<ActionResponse<Invoice>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    if (!input.student_id)
      return failure("Student is required", ErrorCodes.VALIDATION_ERROR);
    if (!input.guardian_id)
      return failure("Guardian is required", ErrorCodes.VALIDATION_ERROR);
    if (!input.due_date)
      return failure("Due date is required", ErrorCodes.VALIDATION_ERROR);
    if (!input.line_items.length)
      return failure(
        "At least one line item is required",
        ErrorCodes.VALIDATION_ERROR,
      );

    // Generate invoice number
    const { data: numResult } = await supabase.rpc("next_invoice_number", {
      p_tenant_id: context.tenant.id,
    });

    const invoiceNumber = numResult ?? `INV-${new Date().getFullYear()}-0001`;

    // Calculate totals
    const subtotal = input.line_items.reduce(
      (sum, li) => sum + li.quantity * li.unit_amount_cents,
      0,
    );

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        tenant_id: context.tenant.id,
        student_id: input.student_id,
        guardian_id: input.guardian_id,
        invoice_number: invoiceNumber,
        status: "draft",
        subtotal_cents: subtotal,
        total_cents: subtotal, // No tax/discount for now
        currency: context.tenant.currency.toLowerCase(),
        due_date: input.due_date,
        period_start: input.period_start || null,
        period_end: input.period_end || null,
        notes: input.notes?.trim() || null,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (invoiceError || !invoice) {
      return failure(
        invoiceError?.message ?? "Failed to create invoice",
        ErrorCodes.CREATE_FAILED,
      );
    }

    // Create line items
    const lineItems = input.line_items.map((li) => ({
      tenant_id: context.tenant.id,
      invoice_id: invoice.id,
      fee_schedule_id: li.fee_schedule_id || null,
      description: li.description,
      quantity: li.quantity,
      unit_amount_cents: li.unit_amount_cents,
      total_cents: li.quantity * li.unit_amount_cents,
    }));

    const { error: lineError } = await supabase
      .from("invoice_line_items")
      .insert(lineItems);

    if (lineError) {
      // Cleanup: delete the invoice if line items fail
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return failure(lineError.message, ErrorCodes.CREATE_FAILED);
    }

    // WHY: Invoice creation is a financial event that must be
    // traceable for school accounting and parent dispute resolution.
    await logAudit({
      context,
      action: AuditActions.INVOICE_CREATED,
      entityType: "invoice",
      entityId: invoice.id,
      metadata: {
        invoice_number: invoiceNumber,
        student_id: input.student_id,
        guardian_id: input.guardian_id,
        total_cents: subtotal,
        line_item_count: input.line_items.length,
      },
    });

    return success(invoice as Invoice);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listInvoices(params?: {
  status?: string;
  student_id?: string;
  limit?: number;
}): Promise<ActionResponse<InvoiceWithDetails[]>> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("invoices")
      .select(
        `
        *,
        student:students(id, first_name, last_name, photo_url),
        guardian:guardians(id, user_id, relationship, user:users(id, first_name, last_name, email)),
        line_items:invoice_line_items(*)
      `,
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(params?.limit ?? 50);

    if (params?.status) query = query.eq("status", params.status);
    if (params?.student_id) query = query.eq("student_id", params.student_id);

    const { data, error } = await query;

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as InvoiceWithDetails[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getParentInvoices(): Promise<
  ActionResponse<InvoiceWithDetails[]>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Get guardian records for this user
    const { data: guardians } = await supabase
      .from("guardians")
      .select("id")
      .eq("user_id", context.user.id)
      .is("deleted_at", null);

    const guardianIds = (guardians ?? []).map((g) => g.id);
    if (guardianIds.length === 0) return success([]);

    const { data, error } = await supabase
      .from("invoices")
      .select(
        `
        *,
        student:students(id, first_name, last_name, photo_url),
        guardian:guardians(id, user_id, relationship),
        line_items:invoice_line_items(*)
      `,
      )
      .in("guardian_id", guardianIds)
      .is("deleted_at", null)
      .not("status", "eq", "draft") // Parents don't see drafts
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as InvoiceWithDetails[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// STRIPE SYNC ACTIONS
// ============================================================

export async function syncInvoiceToStripe(
  invoiceId: string,
): Promise<ActionResponse<Invoice>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    // 1. Get invoice with guardian details
    const { data: invoice } = await supabase
      .from("invoices")
      .select(
        `
        *,
        guardian:guardians(id, user_id, user:users(id, email, first_name, last_name)),
        line_items:invoice_line_items(*)
      `,
      )
      .eq("id", invoiceId)
      .single();

    if (!invoice) return failure("Invoice not found", ErrorCodes.NOT_FOUND);

    // 2. Get Stripe config
    const { data: config } = await supabase
      .from("integration_configs")
      .select("credentials")
      .eq("provider", "stripe")
      .eq("is_enabled", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (!config) {
      return failure("Stripe is not configured", ErrorCodes.INTEGRATION_ERROR);
    }

    const creds = config.credentials as { secret_key: string };
    if (!creds.secret_key) {
      return failure("Stripe secret key missing", ErrorCodes.INTEGRATION_ERROR);
    }

    // 3. Dynamic import
    const {
      createStripeClient,
      createCustomer,
      createInvoice: createStripeInvoice,
      finalizeInvoice: finalizeStripeInvoice,
    } = await import("@/lib/integrations/stripe/client");

    const stripe = createStripeClient(creds.secret_key);

    // 4. Ensure Stripe Customer exists for guardian
    let stripeCustomer: { stripe_customer_id: string } | null = null;

    const { data: existingCustomer } = await supabase
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("guardian_id", invoice.guardian_id)
      .maybeSingle();

    if (existingCustomer) {
      stripeCustomer = existingCustomer;
    } else {
      // Create new Stripe customer
      const guardianUser = (
        invoice as unknown as {
          guardian: {
            user: { email: string; first_name: string; last_name: string };
          };
        }
      ).guardian.user;

      const customer = await createCustomer(stripe, {
        email: guardianUser.email,
        name: `${guardianUser.first_name} ${guardianUser.last_name}`.trim(),
        metadata: {
          wattleos_guardian_id: invoice.guardian_id,
          wattleos_tenant_id: context.tenant.id,
        },
      });

      await supabase.from("stripe_customers").insert({
        tenant_id: context.tenant.id,
        guardian_id: invoice.guardian_id,
        stripe_customer_id: customer.id,
        email: guardianUser.email,
      });

      stripeCustomer = { stripe_customer_id: customer.id };
    }

    // 5. Create Stripe Invoice
    const lineItems = (invoice.line_items as InvoiceLineItem[]) ?? [];
    const dueDate = Math.floor(new Date(invoice.due_date).getTime() / 1000);

    const stripeInvoice = await createStripeInvoice(stripe, {
      customer_id: stripeCustomer.stripe_customer_id,
      currency: invoice.currency,
      due_date: dueDate,
      auto_advance: false,
      line_items: lineItems.map((li) => ({
        description: li.description,
        amount_cents: li.total_cents,
        quantity: 1, // Already calculated
      })),
      metadata: {
        wattleos_invoice_id: invoice.id,
        wattleos_tenant_id: context.tenant.id,
        wattleos_invoice_number: invoice.invoice_number,
      },
    });

    // 6. Finalize the invoice
    const finalized = await finalizeStripeInvoice(stripe, stripeInvoice.id);

    // 7. Update WattleOS invoice with Stripe IDs
    const { data: updated, error: updateError } = await supabase
      .from("invoices")
      .update({
        stripe_invoice_id: finalized.id,
        stripe_hosted_url: finalized.hosted_invoice_url,
        status: "pending",
      })
      .eq("id", invoiceId)
      .select()
      .single();

    if (updateError)
      return failure(updateError.message, ErrorCodes.UPDATE_FAILED);

    // WHY: Stripe sync is a critical financial integration event -
    // tracks exactly when money-related data left WattleOS.
    await logAudit({
      context,
      action: AuditActions.INTEGRATION_SYNCED,
      entityType: "invoice",
      entityId: invoiceId,
      metadata: {
        provider: "stripe",
        stripe_invoice_id: finalized.id,
        invoice_number: invoice.invoice_number,
      },
    });

    return success(updated as Invoice);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Stripe sync failed",
      ErrorCodes.INTEGRATION_ERROR,
    );
  }
}

export async function sendStripeInvoice(
  invoiceId: string,
): Promise<ActionResponse<Invoice>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const { data: invoice } = await supabase
      .from("invoices")
      .select("stripe_invoice_id, invoice_number")
      .eq("id", invoiceId)
      .single();

    if (!invoice?.stripe_invoice_id) {
      return failure(
        "Invoice not synced to Stripe yet",
        ErrorCodes.INTEGRATION_ERROR,
      );
    }

    const { data: config } = await supabase
      .from("integration_configs")
      .select("credentials")
      .eq("provider", "stripe")
      .eq("is_enabled", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (!config)
      return failure("Stripe not configured", ErrorCodes.INTEGRATION_ERROR);

    const creds = config.credentials as { secret_key: string };
    const { createStripeClient, sendInvoice: stripeSend } =
      await import("@/lib/integrations/stripe/client");

    const stripe = createStripeClient(creds.secret_key);
    await stripeSend(stripe, invoice.stripe_invoice_id);

    const { data: updated } = await supabase
      .from("invoices")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", invoiceId)
      .select()
      .single();

    // WHY: Sending an invoice triggers a payment request to a parent -
    // must be traceable for dispute resolution.
    await logAudit({
      context,
      action: AuditActions.INVOICE_SENT,
      entityType: "invoice",
      entityId: invoiceId,
      metadata: {
        invoice_number: invoice.invoice_number,
        stripe_invoice_id: invoice.stripe_invoice_id,
      },
    });

    return success(updated as Invoice);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Send failed",
      ErrorCodes.INTEGRATION_ERROR,
    );
  }
}

export async function voidInvoice(
  invoiceId: string,
): Promise<ActionResponse<Invoice>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const { data: invoice } = await supabase
      .from("invoices")
      .select("stripe_invoice_id, status, invoice_number")
      .eq("id", invoiceId)
      .single();

    if (!invoice) return failure("Invoice not found", ErrorCodes.NOT_FOUND);
    if (invoice.status === "paid")
      return failure("Cannot void a paid invoice", ErrorCodes.VALIDATION_ERROR);

    // Void in Stripe if synced
    if (invoice.stripe_invoice_id) {
      const { data: config } = await supabase
        .from("integration_configs")
        .select("credentials")
        .eq("provider", "stripe")
        .eq("is_enabled", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (config) {
        const creds = config.credentials as { secret_key: string };
        const { createStripeClient, voidInvoice: stripeVoid } =
          await import("@/lib/integrations/stripe/client");
        const stripe = createStripeClient(creds.secret_key);
        await stripeVoid(stripe, invoice.stripe_invoice_id);
      }
    }

    const { data: updated } = await supabase
      .from("invoices")
      .update({ status: "void", voided_at: new Date().toISOString() })
      .eq("id", invoiceId)
      .select()
      .single();

    // WHY: Voiding an invoice is a financial reversal - critical
    // for accounting reconciliation and parent communication trail.
    await logAudit({
      context,
      action: AuditActions.REFUND_ISSUED,
      entityType: "invoice",
      entityId: invoiceId,
      metadata: {
        invoice_number: invoice.invoice_number,
        previous_status: invoice.status,
        action: "void",
        had_stripe_sync: !!invoice.stripe_invoice_id,
      },
    });

    return success(updated as Invoice);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Void failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// PAYMENT QUERIES
// ============================================================

export async function listPaymentsForInvoice(
  invoiceId: string,
): Promise<ActionResponse<Payment[]>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as Payment[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}