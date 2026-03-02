import { z } from "zod";

export const createRecurringBillingSetupSchema = z.object({
  tenant_id: z.string().uuid(),
  family_id: z.string().uuid(),
  collection_method: z.enum(['stripe_becs', 'stripe_card', 'manual_bank_transfer']),
  account_holder_name: z.string().min(1),
  account_holder_email: z.string().email(),
  account_holder_phone: z.string().optional().nullable(),
  is_ccs_gap_fee_setup: z.boolean().default(false),
  ccs_program_name: z.string().optional().nullable(),
  auto_retry_enabled: z.boolean().default(true),
  max_retry_attempts: z.number().int().min(1).max(5).default(3),
  retry_interval_days: z.number().int().min(1).max(30).default(5),
});

export const updateRecurringBillingSetupSchema = createRecurringBillingSetupSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(['active', 'paused', 'cancelled', 'failed']).optional(),
  cancellation_reason: z.string().optional().nullable(),
  mandate_id: z.string().optional().nullable(),
  mandate_accepted_at: z.string().optional().nullable(),
  stripe_setup_intent_id: z.string().optional().nullable(),
  stripe_payment_method_id: z.string().optional().nullable(),
});

export const createRecurringBillingScheduleSchema = z.object({
  tenant_id: z.string().uuid(),
  recurring_billing_setup_id: z.string().uuid(),
  invoice_type: z.string().min(1),
  collection_day_of_month: z.number().int().min(1).max(28).default(1),
  fixed_amount_cents: z.number().int().positive().optional().nullable(),
  description: z.string().min(1),
  is_active: z.boolean().default(true),
});

export const updateRecurringBillingScheduleSchema = createRecurringBillingScheduleSchema.partial().extend({
  id: z.string().uuid(),
});

export const createBillingPaymentAttemptSchema = z.object({
  tenant_id: z.string().uuid(),
  recurring_billing_setup_id: z.string().uuid(),
  recurring_billing_schedule_id: z.string().uuid().optional().nullable(),
  invoice_id: z.string().uuid().optional().nullable(),
  amount_cents: z.number().int().positive(),
  attempt_number: z.number().int().min(1).default(1),
  stripe_payment_intent_id: z.string().optional().nullable(),
});

export const updateBillingPaymentAttemptSchema = createBillingPaymentAttemptSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(['pending', 'succeeded', 'failed', 'retry_scheduled']).optional(),
  succeeded_at: z.string().optional().nullable(),
  failed_at: z.string().optional().nullable(),
  failure_reason: z.enum(['insufficient_funds', 'card_declined', 'expired_card', 'invalid_account', 'bank_error', 'other']).optional().nullable(),
  failure_message: z.string().optional().nullable(),
  next_retry_at: z.string().optional().nullable(),
  retries_exhausted_at: z.string().optional().nullable(),
});

export const createBillingFailureSchema = z.object({
  tenant_id: z.string().uuid(),
  family_id: z.string().uuid(),
  recurring_billing_setup_id: z.string().uuid(),
  amount_cents: z.number().int().positive(),
  failure_reason: z.enum(['insufficient_funds', 'card_declined', 'expired_card', 'invalid_account', 'bank_error', 'other']),
  notification_method: z.enum(['sms', 'email', 'in_app']).optional().nullable(),
});

export const updateBillingFailureSchema = createBillingFailureSchema.partial().extend({
  id: z.string().uuid(),
  resolved_at: z.string().optional().nullable(),
  resolution_notes: z.string().optional().nullable(),
});

export const listRecurringBillingFilterSchema = z.object({
  tenant_id: z.string().uuid(),
  family_id: z.string().uuid().optional(),
  status: z.enum(['active', 'paused', 'cancelled', 'failed']).optional(),
  collection_method: z.enum(['stripe_becs', 'stripe_card', 'manual_bank_transfer']).optional(),
  is_ccs_gap_fee_setup: z.boolean().optional(),
}).partial();

export const listPaymentAttemptsFilterSchema = z.object({
  tenant_id: z.string().uuid(),
  recurring_billing_setup_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'succeeded', 'failed', 'retry_scheduled']).optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
}).partial();

export const listBillingFailuresFilterSchema = z.object({
  tenant_id: z.string().uuid(),
  family_id: z.string().uuid().optional(),
  failure_reason: z.enum(['insufficient_funds', 'card_declined', 'expired_card', 'invalid_account', 'bank_error', 'other']).optional(),
  resolved: z.boolean().optional(),
}).partial();

// Types
export type CreateRecurringBillingSetupInput = z.infer<typeof createRecurringBillingSetupSchema>;
export type UpdateRecurringBillingSetupInput = z.infer<typeof updateRecurringBillingSetupSchema>;
export type CreateRecurringBillingScheduleInput = z.infer<typeof createRecurringBillingScheduleSchema>;
export type UpdateRecurringBillingScheduleInput = z.infer<typeof updateRecurringBillingScheduleSchema>;
export type CreateBillingPaymentAttemptInput = z.infer<typeof createBillingPaymentAttemptSchema>;
export type UpdateBillingPaymentAttemptInput = z.infer<typeof updateBillingPaymentAttemptSchema>;
export type CreateBillingFailureInput = z.infer<typeof createBillingFailureSchema>;
export type UpdateBillingFailureInput = z.infer<typeof updateBillingFailureSchema>;
export type ListRecurringBillingFilter = z.input<typeof listRecurringBillingFilterSchema>;
export type ListPaymentAttemptsFilter = z.input<typeof listPaymentAttemptsFilterSchema>;
export type ListBillingFailuresFilter = z.input<typeof listBillingFailuresFilterSchema>;
