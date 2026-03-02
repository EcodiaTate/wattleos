"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { ActionResponse, ErrorCodes, success, failure } from "@/types/api";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import type {
  RecurringBillingSetup,
  RecurringBillingSchedule,
  BillingPaymentAttempt,
  BillingFailure,
  RecurringBillingSetupWithFamily,
  BillingPaymentAttemptWithSetup,
  RecurringBillingDashboardData,
} from "@/types/domain";
import type {
  CreateRecurringBillingSetupInput,
  UpdateRecurringBillingSetupInput,
  CreateRecurringBillingScheduleInput,
  UpdateRecurringBillingScheduleInput,
  CreateBillingPaymentAttemptInput,
  UpdateBillingPaymentAttemptInput,
  CreateBillingFailureInput,
  ListRecurringBillingFilter,
  ListPaymentAttemptsFilter,
  ListBillingFailuresFilter,
} from "@/lib/validations/recurring-billing";

// ============================================================
// Internal Stripe helper - lazy-loaded to avoid bundling in
// server actions that don't need it.
// ============================================================
async function getStripe() {
  const { createStripeClient } =
    await import("@/lib/integrations/stripe/client");
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("[recurring-billing:getStripe]", {
      error: "STRIPE_SECRET_KEY is not configured",
    });
    return null;
  }
  return createStripeClient(secretKey);
}

// ============================================================
// RECURRING BILLING SETUPS
// ============================================================

export async function getRecurringBillingSetup(
  id: string,
): Promise<ActionResponse<RecurringBillingSetupWithFamily>> {
  try {
    const context = await requirePermission(Permissions.VIEW_RECURRING_BILLING);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("recurring_billing_setups")
      .select("*, family:family_id(id, display_name)")
      .eq("tenant_id", context.tenant.id)
      .eq("id", id)
      .single();

    if (error || !data) {
      return failure("Setup not found", ErrorCodes.NOT_FOUND);
    }

    return success(data as RecurringBillingSetupWithFamily);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

export async function listRecurringBillingSetups(
  filter: ListRecurringBillingFilter,
): Promise<ActionResponse<RecurringBillingSetupWithFamily[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_RECURRING_BILLING);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("recurring_billing_setups")
      .select("*, family:family_id(id, display_name)")
      .eq("tenant_id", context.tenant.id);

    if (filter.family_id) {
      query = query.eq("family_id", filter.family_id);
    }
    if (filter.status) {
      query = query.eq("status", filter.status);
    }
    if (filter.collection_method) {
      query = query.eq("collection_method", filter.collection_method);
    }
    if (filter.is_ccs_gap_fee_setup !== undefined) {
      query = query.eq("is_ccs_gap_fee_setup", filter.is_ccs_gap_fee_setup);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data || []) as RecurringBillingSetupWithFamily[]);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

export async function createRecurringBillingSetup(
  input: CreateRecurringBillingSetupInput,
): Promise<ActionResponse<RecurringBillingSetup>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_RECURRING_BILLING,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("recurring_billing_setups")
      .insert([
        {
          tenant_id: context.tenant.id,
          family_id: input.family_id,
          collection_method: input.collection_method,
          account_holder_name: input.account_holder_name,
          account_holder_email: input.account_holder_email,
          account_holder_phone: input.account_holder_phone || null,
          is_ccs_gap_fee_setup: input.is_ccs_gap_fee_setup,
          ccs_program_name: input.ccs_program_name || null,
          auto_retry_enabled: input.auto_retry_enabled,
          max_retry_attempts: input.max_retry_attempts,
          retry_interval_days: input.retry_interval_days,
          created_by_user_id: context.user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.RECURRING_BILLING_SETUP_CREATED,
      entityType: "recurring_billing_setup",
      entityId: data.id,
      metadata: {
        family_id: input.family_id,
        collection_method: input.collection_method,
      },
    });

    return success(data);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

export async function updateRecurringBillingSetup(
  input: UpdateRecurringBillingSetupInput,
): Promise<ActionResponse<RecurringBillingSetup>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_RECURRING_BILLING,
    );
    const supabase = await createSupabaseServerClient();

    const { id, ...updates } = input;

    const { data, error } = await supabase
      .from("recurring_billing_setups")
      .update(updates)
      .eq("tenant_id", context.tenant.id)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.RECURRING_BILLING_SETUP_UPDATED,
      entityType: "recurring_billing_setup",
      entityId: id,
      metadata: updates,
    });

    return success(data);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

export async function cancelRecurringBillingSetup(
  id: string,
  reason: string,
): Promise<ActionResponse<RecurringBillingSetup>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_RECURRING_BILLING,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("recurring_billing_setups")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by_user_id: context.user.id,
        cancellation_reason: reason,
      })
      .eq("tenant_id", context.tenant.id)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.RECURRING_BILLING_SETUP_CANCELLED,
      entityType: "recurring_billing_setup",
      entityId: id,
      metadata: { cancellation_reason: reason },
    });

    return success(data);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

// ============================================================
// RECURRING BILLING SCHEDULES
// ============================================================

export async function listRecurringBillingSchedules(
  setupId: string,
): Promise<ActionResponse<RecurringBillingSchedule[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_RECURRING_BILLING);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("recurring_billing_schedules")
      .select()
      .eq("tenant_id", context.tenant.id)
      .eq("recurring_billing_setup_id", setupId)
      .order("invoice_type", { ascending: true });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data || []) as RecurringBillingSchedule[]);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

export async function createRecurringBillingSchedule(
  input: CreateRecurringBillingScheduleInput,
): Promise<ActionResponse<RecurringBillingSchedule>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_RECURRING_BILLING,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("recurring_billing_schedules")
      .insert([
        {
          tenant_id: context.tenant.id,
          recurring_billing_setup_id: input.recurring_billing_setup_id,
          invoice_type: input.invoice_type,
          collection_day_of_month: input.collection_day_of_month,
          fixed_amount_cents: input.fixed_amount_cents || null,
          description: input.description,
          is_active: input.is_active,
        },
      ])
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.RECURRING_BILLING_SCHEDULE_CREATED,
      entityType: "recurring_billing_schedule",
      entityId: data.id,
      metadata: {
        setup_id: input.recurring_billing_setup_id,
        invoice_type: input.invoice_type,
      },
    });

    return success(data);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

export async function updateRecurringBillingSchedule(
  input: UpdateRecurringBillingScheduleInput,
): Promise<ActionResponse<RecurringBillingSchedule>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_RECURRING_BILLING,
    );
    const supabase = await createSupabaseServerClient();

    const { id, ...updates } = input;

    const { data, error } = await supabase
      .from("recurring_billing_schedules")
      .update(updates)
      .eq("tenant_id", context.tenant.id)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.RECURRING_BILLING_SCHEDULE_UPDATED,
      entityType: "recurring_billing_schedule",
      entityId: id,
      metadata: updates,
    });

    return success(data);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

export async function deleteRecurringBillingSchedule(
  id: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_RECURRING_BILLING,
    );
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("recurring_billing_schedules")
      .delete()
      .eq("tenant_id", context.tenant.id)
      .eq("id", id);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.RECURRING_BILLING_SCHEDULE_DELETED,
      entityType: "recurring_billing_schedule",
      entityId: id,
    });

    return success(undefined as void);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

// ============================================================
// PAYMENT ATTEMPTS
// ============================================================

export async function listBillingPaymentAttempts(
  filter: ListPaymentAttemptsFilter,
): Promise<ActionResponse<BillingPaymentAttemptWithSetup[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_RECURRING_BILLING);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("billing_payment_attempts")
      .select("*, setup:recurring_billing_setup_id(*)")
      .eq("tenant_id", context.tenant.id);

    if (filter.recurring_billing_setup_id) {
      query = query.eq(
        "recurring_billing_setup_id",
        filter.recurring_billing_setup_id,
      );
    }
    if (filter.status) {
      query = query.eq("status", filter.status);
    }
    if (filter.from_date) {
      query = query.gte("created_at", filter.from_date);
    }
    if (filter.to_date) {
      query = query.lte("created_at", filter.to_date);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data || []) as BillingPaymentAttemptWithSetup[]);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

export async function createBillingPaymentAttempt(
  input: CreateBillingPaymentAttemptInput,
): Promise<ActionResponse<BillingPaymentAttempt>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_RECURRING_BILLING,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("billing_payment_attempts")
      .insert([
        {
          tenant_id: context.tenant.id,
          recurring_billing_setup_id: input.recurring_billing_setup_id,
          recurring_billing_schedule_id:
            input.recurring_billing_schedule_id || null,
          invoice_id: input.invoice_id || null,
          amount_cents: input.amount_cents,
          attempt_number: input.attempt_number,
          stripe_payment_intent_id: input.stripe_payment_intent_id || null,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.BILLING_PAYMENT_ATTEMPT_CREATED,
      entityType: "billing_payment_attempt",
      entityId: data.id,
      metadata: {
        setup_id: input.recurring_billing_setup_id,
        amount_cents: input.amount_cents,
      },
    });

    return success(data);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

export async function updateBillingPaymentAttempt(
  input: UpdateBillingPaymentAttemptInput,
): Promise<ActionResponse<BillingPaymentAttempt>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_RECURRING_BILLING,
    );
    const supabase = await createSupabaseServerClient();

    const { id, ...updates } = input;

    const { data, error } = await supabase
      .from("billing_payment_attempts")
      .update(updates)
      .eq("tenant_id", context.tenant.id)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.BILLING_PAYMENT_ATTEMPT_UPDATED,
      entityType: "billing_payment_attempt",
      entityId: id,
      metadata: { status: updates.status },
    });

    return success(data);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

// ============================================================
// BILLING FAILURES
// ============================================================

export async function listBillingFailures(
  filter: ListBillingFailuresFilter,
): Promise<ActionResponse<BillingFailure[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_RECURRING_BILLING);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("billing_failures")
      .select()
      .eq("tenant_id", context.tenant.id);

    if (filter.family_id) {
      query = query.eq("family_id", filter.family_id);
    }
    if (filter.failure_reason) {
      query = query.eq("failure_reason", filter.failure_reason);
    }
    if (filter.resolved !== undefined) {
      if (filter.resolved) {
        query = query.not("resolved_at", "is", null);
      } else {
        query = query.is("resolved_at", null);
      }
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data || []) as BillingFailure[]);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

export async function createBillingFailure(
  input: CreateBillingFailureInput,
): Promise<ActionResponse<BillingFailure>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_RECURRING_BILLING,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("billing_failures")
      .insert([
        {
          tenant_id: context.tenant.id,
          family_id: input.family_id,
          recurring_billing_setup_id: input.recurring_billing_setup_id,
          amount_cents: input.amount_cents,
          failure_reason: input.failure_reason,
          notification_method: input.notification_method || null,
        },
      ])
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.BILLING_FAILURE_CREATED,
      entityType: "billing_failure",
      entityId: data.id,
      metadata: {
        family_id: input.family_id,
        failure_reason: input.failure_reason,
      },
    });

    return success(data);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

export async function resolveBillingFailure(
  id: string,
  notes: string,
): Promise<ActionResponse<BillingFailure>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_RECURRING_BILLING,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("billing_failures")
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by_user_id: context.user.id,
        resolution_notes: notes,
      })
      .eq("tenant_id", context.tenant.id)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.BILLING_FAILURE_RESOLVED,
      entityType: "billing_failure",
      entityId: id,
      metadata: { resolution_notes: notes },
    });

    return success(data);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

// ============================================================
// DASHBOARD
// ============================================================

export async function getRecurringBillingDashboard(): Promise<
  ActionResponse<RecurringBillingDashboardData>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_RECURRING_BILLING);
    const supabase = await createSupabaseServerClient();

    // Get setups
    const { data: setups, error: setupsError } = await supabase
      .from("recurring_billing_setups")
      .select()
      .eq("tenant_id", context.tenant.id);

    if (setupsError) {
      return failure(setupsError.message, ErrorCodes.DATABASE_ERROR);
    }

    // Get payment attempts
    const { data: attempts, error: attemptsError } = await supabase
      .from("billing_payment_attempts")
      .select("*, setup:recurring_billing_setup_id(*)")
      .eq("tenant_id", context.tenant.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (attemptsError) {
      return failure(attemptsError.message, ErrorCodes.DATABASE_ERROR);
    }

    // Get failures
    const { data: failures, error: failuresError } = await supabase
      .from("billing_failures")
      .select()
      .eq("tenant_id", context.tenant.id)
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      );

    if (failuresError) {
      return failure(failuresError.message, ErrorCodes.DATABASE_ERROR);
    }

    const setupsArray = setups || [];
    const failuresArray = failures || [];

    const dashboard: RecurringBillingDashboardData = {
      total_setups: setupsArray.length,
      active_setups: setupsArray.filter((s) => s.status === "active").length,
      paused_setups: setupsArray.filter((s) => s.status === "paused").length,
      failed_setups: setupsArray.filter((s) => s.status === "failed").length,
      upcoming_collections: [],
      failed_payments_last_30d: failuresArray.length,
      total_failed_amount_cents: failuresArray.reduce(
        (sum, f) => sum + (f.amount_cents || 0),
        0,
      ),
      setups_by_method: [
        {
          method: "stripe_becs",
          count: setupsArray.filter(
            (s) => s.collection_method === "stripe_becs",
          ).length,
        },
        {
          method: "stripe_card",
          count: setupsArray.filter(
            (s) => s.collection_method === "stripe_card",
          ).length,
        },
        {
          method: "manual_bank_transfer",
          count: setupsArray.filter(
            (s) => s.collection_method === "manual_bank_transfer",
          ).length,
        },
      ],
      recent_payment_attempts: (attempts ||
        []) as BillingPaymentAttemptWithSetup[],
    };

    return success(dashboard);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

// ============================================================
// BECS DIRECT DEBIT SETUP - INITIATE MANDATE
// ============================================================
// Creates a Stripe SetupIntent for BECS and returns the
// client_secret so the frontend can collect bank details
// via Stripe Elements or redirect to a Checkout Session.
// ============================================================

export async function initiateBecsSetup(
  setupId: string,
  returnUrl: string,
): Promise<ActionResponse<{ checkout_url: string }>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_RECURRING_BILLING,
    );
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    // Fetch the setup
    const { data: setup, error: fetchError } = await supabase
      .from("recurring_billing_setups")
      .select("*, family:family_id(id, display_name)")
      .eq("tenant_id", tenantId)
      .eq("id", setupId)
      .single();

    if (fetchError || !setup) {
      return failure("Setup not found", ErrorCodes.NOT_FOUND);
    }

    if (setup.collection_method !== "stripe_becs") {
      return failure(
        "Setup is not configured for BECS",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Ensure Stripe customer exists for this guardian
    const stripe = await getStripe();
    if (!stripe) {
      console.error("[recurring-billing:initiateBecsSetup]", {
        tenantId,
        setupId,
        error: "Stripe not configured",
      });
      await logAudit({
        context,
        action: AuditActions.RECURRING_BILLING_SETUP_UPDATED,
        entityType: "recurring_billing_setup",
        entityId: setupId,
        metadata: {
          action: "becs_setup_initiation_failed",
          failed: true,
          error: "STRIPE_SECRET_KEY is not configured",
        },
      });
      return failure(
        "Payment provider is not configured",
        ErrorCodes.INTERNAL_ERROR,
      );
    }
    const { createCustomer: createStripeCustomer } =
      await import("@/lib/integrations/stripe/client");

    // Check if a Stripe customer already exists for this family
    const { data: existingCustomer } = await supabase
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("tenant_id", tenantId)
      .eq("guardian_id", setup.family_id)
      .maybeSingle();

    let stripeCustomerId: string;

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
    } else {
      const customer = await createStripeCustomer(stripe, {
        email: setup.account_holder_email,
        name: setup.account_holder_name,
        metadata: {
          wattleos_tenant_id: tenantId,
          wattleos_family_id: setup.family_id,
        },
      });
      stripeCustomerId = customer.id;

      await supabase.from("stripe_customers").insert({
        tenant_id: tenantId,
        guardian_id: setup.family_id,
        stripe_customer_id: customer.id,
        email: setup.account_holder_email,
      });
    }

    // Create a Checkout Session in setup mode for BECS
    const { createSetupCheckout } =
      await import("@/lib/integrations/stripe/client");

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? returnUrl;
    const session = await createSetupCheckout(stripe, {
      customer_id: stripeCustomerId,
      mode: "setup",
      payment_method_types: ["au_becs_debit"],
      success_url: `${baseUrl}/admin/recurring-billing/${setupId}?mandate=success`,
      cancel_url: `${baseUrl}/admin/recurring-billing/${setupId}?mandate=cancelled`,
    });

    // Store the setup intent reference so webhook can match
    await supabase
      .from("recurring_billing_setups")
      .update({
        stripe_setup_intent_id: session.setup_intent
          ? typeof session.setup_intent === "string"
            ? session.setup_intent
            : session.setup_intent.id
          : null,
      })
      .eq("id", setupId)
      .eq("tenant_id", tenantId);

    await logAudit({
      context,
      action: AuditActions.RECURRING_BILLING_SETUP_UPDATED,
      entityType: "recurring_billing_setup",
      entityId: setupId,
      metadata: { action: "becs_mandate_initiated" },
    });

    return success({ checkout_url: session.url! });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to initiate BECS setup";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// COLLECT PAYMENT - Execute a single recurring collection
// ============================================================
// Called by the cron job for each active setup+schedule due.
// Creates a Stripe PaymentIntent using the saved BECS method.
// ============================================================

export async function executeRecurringCollection(
  setupId: string,
  scheduleId: string,
  invoiceId: string | null,
  amountCents: number,
): Promise<ActionResponse<BillingPaymentAttempt>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_RECURRING_BILLING,
    );
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    // Fetch setup with payment method and mandate
    const { data: setup, error: setupError } = await supabase
      .from("recurring_billing_setups")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", setupId)
      .single();

    if (setupError || !setup) {
      return failure("Setup not found", ErrorCodes.NOT_FOUND);
    }

    if (setup.status !== "active") {
      return failure("Setup is not active", ErrorCodes.VALIDATION_ERROR);
    }

    if (!setup.stripe_payment_method_id || !setup.mandate_id) {
      return failure(
        "No payment method or mandate on file",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Count existing attempts for this schedule this month to determine attempt number
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("billing_payment_attempts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("recurring_billing_setup_id", setupId)
      .eq("recurring_billing_schedule_id", scheduleId)
      .gte("created_at", monthStart.toISOString());

    const attemptNumber = (count ?? 0) + 1;

    // Idempotency key: tenant + setup + schedule + month
    const idempotencyKey = `${tenantId}_${setupId}_${scheduleId}_${monthStart.toISOString().slice(0, 7)}_${attemptNumber}`;

    // Get Stripe customer ID
    const { data: stripeCustomer } = await supabase
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("tenant_id", tenantId)
      .eq("guardian_id", setup.family_id)
      .maybeSingle();

    if (!stripeCustomer?.stripe_customer_id) {
      return failure(
        "No Stripe customer found for this family",
        ErrorCodes.NOT_FOUND,
      );
    }

    // Create the attempt record first (pending)
    const { data: attempt, error: attemptError } = await supabase
      .from("billing_payment_attempts")
      .insert({
        tenant_id: tenantId,
        recurring_billing_setup_id: setupId,
        recurring_billing_schedule_id: scheduleId,
        invoice_id: invoiceId,
        amount_cents: amountCents,
        attempt_number: attemptNumber,
        status: "pending",
      })
      .select()
      .single();

    if (attemptError || !attempt) {
      return failure("Failed to create attempt", ErrorCodes.DATABASE_ERROR);
    }

    // Create Stripe PaymentIntent
    try {
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error("STRIPE_SECRET_KEY is not configured");
      }
      const { createBecsPayment } =
        await import("@/lib/integrations/stripe/client");

      const paymentIntent = await createBecsPayment(stripe, {
        customer_id: stripeCustomer.stripe_customer_id,
        payment_method_id: setup.stripe_payment_method_id,
        amount_cents: amountCents,
        mandate_id: setup.mandate_id,
        metadata: {
          wattleos_tenant_id: tenantId,
          wattleos_billing_attempt_id: attempt.id,
          wattleos_invoice_id: invoiceId ?? "",
          wattleos_setup_id: setupId,
        },
        idempotency_key: idempotencyKey,
      });

      // Update attempt with Stripe PI ID - webhook will handle final status
      await supabase
        .from("billing_payment_attempts")
        .update({ stripe_payment_intent_id: paymentIntent.id })
        .eq("id", attempt.id);

      return success({
        ...attempt,
        stripe_payment_intent_id: paymentIntent.id,
      });
    } catch (stripeErr) {
      // Stripe API call itself failed (network, auth, etc.)
      const message =
        stripeErr instanceof Error ? stripeErr.message : "Stripe error";

      await supabase
        .from("billing_payment_attempts")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          failure_reason: "other",
          failure_message: message,
        })
        .eq("id", attempt.id);

      return failure(message, ErrorCodes.INTERNAL_ERROR);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Collection failed";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// RETRY FAILED PAYMENTS - Process scheduled retries
// ============================================================
// Called by the cron job. Finds all retry_scheduled attempts
// where next_retry_at <= now, and re-attempts them.
// Returns the count of retries processed.
// ============================================================

export async function processScheduledRetries(): Promise<
  ActionResponse<{ processed: number; succeeded: number; failed: number }>
> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_RECURRING_BILLING,
    );
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    // Find attempts ready for retry
    const { data: retryAttempts, error: queryError } = await supabase
      .from("billing_payment_attempts")
      .select(
        "*, setup:recurring_billing_setup_id(*, family:family_id(id, display_name))",
      )
      .eq("tenant_id", tenantId)
      .eq("status", "retry_scheduled")
      .lte("next_retry_at", new Date().toISOString())
      .order("next_retry_at", { ascending: true })
      .limit(50);

    if (queryError) {
      return failure(queryError.message, ErrorCodes.DATABASE_ERROR);
    }

    if (!retryAttempts || retryAttempts.length === 0) {
      return success({ processed: 0, succeeded: 0, failed: 0 });
    }

    let succeeded = 0;
    let failed = 0;

    for (const attempt of retryAttempts) {
      const setup = Array.isArray(attempt.setup)
        ? attempt.setup[0]
        : attempt.setup;
      if (!setup || setup.status !== "active") {
        // Setup cancelled/paused - skip and mark failed
        await supabase
          .from("billing_payment_attempts")
          .update({
            status: "failed",
            failed_at: new Date().toISOString(),
            failure_message: "Setup no longer active",
            retries_exhausted_at: new Date().toISOString(),
          })
          .eq("id", attempt.id);
        failed++;
        continue;
      }

      if (!setup.stripe_payment_method_id || !setup.mandate_id) {
        failed++;
        continue;
      }

      // Get Stripe customer
      const { data: stripeCustomer } = await supabase
        .from("stripe_customers")
        .select("stripe_customer_id")
        .eq("tenant_id", tenantId)
        .eq("guardian_id", setup.family_id)
        .maybeSingle();

      if (!stripeCustomer?.stripe_customer_id) {
        failed++;
        continue;
      }

      const newAttemptNumber = attempt.attempt_number + 1;
      const idempotencyKey = `retry_${attempt.id}_${newAttemptNumber}`;

      try {
        const stripe = await getStripe();
        if (!stripe) {
          throw new Error("STRIPE_SECRET_KEY is not configured");
        }
        const { createBecsPayment } =
          await import("@/lib/integrations/stripe/client");

        const paymentIntent = await createBecsPayment(stripe, {
          customer_id: stripeCustomer.stripe_customer_id,
          payment_method_id: setup.stripe_payment_method_id,
          amount_cents: attempt.amount_cents,
          mandate_id: setup.mandate_id,
          metadata: {
            wattleos_tenant_id: tenantId,
            wattleos_billing_attempt_id: attempt.id,
            wattleos_invoice_id: attempt.invoice_id ?? "",
            wattleos_setup_id: setup.id,
            retry_attempt: String(newAttemptNumber),
          },
          idempotency_key: idempotencyKey,
        });

        // Update attempt - webhook will finalize
        await supabase
          .from("billing_payment_attempts")
          .update({
            status: "pending",
            attempt_number: newAttemptNumber,
            stripe_payment_intent_id: paymentIntent.id,
            next_retry_at: null,
          })
          .eq("id", attempt.id);

        succeeded++;
      } catch {
        // Mark this retry as failed; webhook handler will schedule next retry if applicable
        const canRetryAgain =
          newAttemptNumber < (setup.max_retry_attempts ?? 3);
        const nextRetry = canRetryAgain
          ? new Date(
              Date.now() +
                (setup.retry_interval_days ?? 5) * 24 * 60 * 60 * 1000,
            ).toISOString()
          : null;

        await supabase
          .from("billing_payment_attempts")
          .update({
            status: canRetryAgain ? "retry_scheduled" : "failed",
            attempt_number: newAttemptNumber,
            failed_at: new Date().toISOString(),
            failure_reason: "other",
            failure_message: "Stripe API error during retry",
            next_retry_at: nextRetry,
            retries_exhausted_at: canRetryAgain
              ? null
              : new Date().toISOString(),
          })
          .eq("id", attempt.id);

        // If exhausted, create failure record
        if (!canRetryAgain) {
          await supabase.from("billing_failures").insert({
            tenant_id: tenantId,
            family_id: setup.family_id,
            recurring_billing_setup_id: setup.id,
            amount_cents: attempt.amount_cents,
            failure_reason: "other",
            notification_method: "email",
          });

          await supabase
            .from("recurring_billing_setups")
            .update({ status: "failed" })
            .eq("id", setup.id)
            .eq("tenant_id", tenantId);
        }

        failed++;
      }
    }

    return success({ processed: retryAttempts.length, succeeded, failed });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Retry processing failed";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET DUE COLLECTIONS - Find setups+schedules due today
// ============================================================
// Used by the cron job to find what needs to be collected.
// Returns setups with their schedules that are due on the
// current day of month, with active status and a mandate.
// ============================================================

export async function getDueCollections(): Promise<
  ActionResponse<
    Array<{
      setup: RecurringBillingSetup;
      schedule: RecurringBillingSchedule;
      outstanding_invoice_id: string | null;
      amount_cents: number;
    }>
  >
> {
  try {
    const context = await requirePermission(Permissions.VIEW_RECURRING_BILLING);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const today = new Date();
    const dayOfMonth = today.getDate();

    // Find active schedules due today
    const { data: schedules, error: schedError } = await supabase
      .from("recurring_billing_schedules")
      .select("*, setup:recurring_billing_setup_id(*)")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .eq("collection_day_of_month", dayOfMonth);

    if (schedError) {
      return failure(schedError.message, ErrorCodes.DATABASE_ERROR);
    }

    if (!schedules || schedules.length === 0) {
      return success([]);
    }

    const dueCollections: Array<{
      setup: RecurringBillingSetup;
      schedule: RecurringBillingSchedule;
      outstanding_invoice_id: string | null;
      amount_cents: number;
    }> = [];

    for (const sched of schedules) {
      const setup = Array.isArray(sched.setup) ? sched.setup[0] : sched.setup;
      if (!setup || setup.status !== "active" || !setup.mandate_id) continue;

      // Check if already collected this month
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const { count: existingAttempts } = await supabase
        .from("billing_payment_attempts")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("recurring_billing_setup_id", setup.id)
        .eq("recurring_billing_schedule_id", sched.id)
        .gte("created_at", monthStart.toISOString())
        .in("status", ["pending", "succeeded"]);

      if ((existingAttempts ?? 0) > 0) continue; // Already collected/pending this month

      // Determine amount
      let amountCents = sched.fixed_amount_cents;
      let outstandingInvoiceId: string | null = null;

      // If no fixed amount, look for outstanding invoices for this family
      if (!amountCents) {
        const { data: invoices } = await supabase
          .from("invoices")
          .select("id, total_cents, amount_paid_cents")
          .eq("tenant_id", tenantId)
          .eq("guardian_id", setup.family_id)
          .in("status", ["pending", "sent", "overdue"])
          .order("due_date", { ascending: true })
          .limit(1);

        if (invoices && invoices.length > 0) {
          const inv = invoices[0];
          amountCents = inv.total_cents - (inv.amount_paid_cents ?? 0);
          outstandingInvoiceId = inv.id;
        }
      }

      if (amountCents && amountCents > 0) {
        dueCollections.push({
          setup: setup as RecurringBillingSetup,
          schedule: {
            id: sched.id,
            tenant_id: sched.tenant_id,
            recurring_billing_setup_id: sched.recurring_billing_setup_id,
            invoice_type: sched.invoice_type,
            collection_day_of_month: sched.collection_day_of_month,
            fixed_amount_cents: sched.fixed_amount_cents,
            description: sched.description,
            is_active: sched.is_active,
            created_at: sched.created_at,
            updated_at: sched.updated_at,
          },
          outstanding_invoice_id: outstandingInvoiceId,
          amount_cents: amountCents,
        });
      }
    }

    return success(dueCollections);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to get due collections";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// PARENT-FACING: Get my recurring billing setups
// ============================================================
// Returns the logged-in parent's recurring billing setups.
// No admin permission needed - scoped to the parent's family.
// ============================================================

export async function getParentRecurringBillingSetups(): Promise<
  ActionResponse<RecurringBillingSetupWithFamily[]>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Find families this parent belongs to (via guardians)
    const { data: guardians } = await supabase
      .from("guardians")
      .select("id, family_id")
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", context.user.id);

    if (!guardians || guardians.length === 0) {
      return success([]);
    }

    const familyIds = guardians.map((g) => g.family_id).filter(Boolean);
    if (familyIds.length === 0) return success([]);

    const { data: setups, error } = await supabase
      .from("recurring_billing_setups")
      .select("*, family:family_id(id, display_name)")
      .eq("tenant_id", context.tenant.id)
      .in("family_id", familyIds)
      .order("created_at", { ascending: false });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((setups || []) as RecurringBillingSetupWithFamily[]);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

// ============================================================
// PARENT-FACING: Get payment history for a setup
// ============================================================

export async function getParentPaymentHistory(
  setupId: string,
): Promise<ActionResponse<BillingPaymentAttempt[]>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Verify this parent owns this setup
    const { data: guardians } = await supabase
      .from("guardians")
      .select("family_id")
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", context.user.id);

    const familyIds = (guardians || []).map((g) => g.family_id).filter(Boolean);

    const { data: setup } = await supabase
      .from("recurring_billing_setups")
      .select("id, family_id")
      .eq("id", setupId)
      .eq("tenant_id", context.tenant.id)
      .maybeSingle();

    if (!setup || !familyIds.includes(setup.family_id)) {
      return failure("Setup not found", ErrorCodes.NOT_FOUND);
    }

    const { data: attempts, error } = await supabase
      .from("billing_payment_attempts")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .eq("recurring_billing_setup_id", setupId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((attempts || []) as BillingPaymentAttempt[]);
  } catch (e) {
    return failure("Unauthorized", ErrorCodes.UNAUTHORIZED);
  }
}

// ============================================================
// PARENT-FACING: Initiate payment method update
// ============================================================
// Creates a new Checkout Session so the parent can update
// their BECS/card details. Webhook will swap the payment
// method on the setup.
// ============================================================

export async function initiatePaymentMethodUpdate(
  setupId: string,
  returnUrl: string,
): Promise<ActionResponse<{ checkout_url: string }>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    // Verify parent owns this setup
    const { data: guardians } = await supabase
      .from("guardians")
      .select("family_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", context.user.id);

    const familyIds = (guardians || []).map((g) => g.family_id).filter(Boolean);

    const { data: setup } = await supabase
      .from("recurring_billing_setups")
      .select("*")
      .eq("id", setupId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!setup || !familyIds.includes(setup.family_id)) {
      return failure("Setup not found", ErrorCodes.NOT_FOUND);
    }

    // Get Stripe customer
    const { data: stripeCustomer } = await supabase
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("tenant_id", tenantId)
      .eq("guardian_id", setup.family_id)
      .maybeSingle();

    if (!stripeCustomer?.stripe_customer_id) {
      return failure("No payment profile found", ErrorCodes.NOT_FOUND);
    }

    const stripe = await getStripe();
    if (!stripe) {
      console.error("[recurring-billing:initiatePaymentMethodUpdate]", {
        tenantId: context.tenant.id,
        setupId,
        error: "Stripe not configured",
      });
      await logAudit({
        context,
        action: AuditActions.RECURRING_BILLING_SETUP_UPDATED,
        entityType: "recurring_billing_setup",
        entityId: setupId,
        metadata: {
          action: "payment_method_update_failed",
          failed: true,
          error: "STRIPE_SECRET_KEY is not configured",
        },
      });
      return failure(
        "Payment provider is not configured",
        ErrorCodes.INTERNAL_ERROR,
      );
    }
    const { createSetupCheckout } =
      await import("@/lib/integrations/stripe/client");

    const methodTypes =
      setup.collection_method === "stripe_becs" ? ["au_becs_debit"] : ["card"];

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? returnUrl;
    const session = await createSetupCheckout(stripe, {
      customer_id: stripeCustomer.stripe_customer_id,
      mode: "setup",
      payment_method_types: methodTypes,
      success_url: `${baseUrl}/parent/recurring-billing?updated=true`,
      cancel_url: `${baseUrl}/parent/recurring-billing`,
    });

    // Store setup intent for webhook matching
    if (session.setup_intent) {
      const siId =
        typeof session.setup_intent === "string"
          ? session.setup_intent
          : session.setup_intent.id;

      await supabase
        .from("recurring_billing_setups")
        .update({ stripe_setup_intent_id: siId })
        .eq("id", setupId)
        .eq("tenant_id", tenantId);
    }

    await logAudit({
      context,
      action: AuditActions.RECURRING_BILLING_SETUP_UPDATED,
      entityType: "recurring_billing_setup",
      entityId: setupId,
      metadata: { action: "payment_method_update_initiated" },
    });

    return success({ checkout_url: session.url! });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to initiate update";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
