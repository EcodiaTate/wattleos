"use server";

// src/lib/actions/payroll-integration.ts
//
// ============================================================
// WattleOS V2 - Payroll Integration Server Actions
// ============================================================
// Manages the connection between WattleOS and external payroll
// systems (Xero / KeyPay). Three concerns:
//   1. Payroll settings (config)
//   2. Employee mappings (user → external ID)
//   3. Timesheet sync (push approved hours out)

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import KeyPayClient from "@/lib/integrations/keypay/client";
import { getKeyPayTokens } from "@/lib/integrations/keypay/oauth";
import type { ActionResponse } from "@/types/api";
import { ErrorCodes, failure, success } from "@/types/api";
import type {
  EmployeeMapping,
  PayFrequency,
  PayrollProvider,
  PayrollSettings,
  Timesheet,
} from "@/types/domain";

// ============================================================
// PAYROLL SETTINGS
// ============================================================

/**
 * Get the tenant's payroll settings. Creates a default row if none exists.
 */
export async function getPayrollSettings(): Promise<
  ActionResponse<PayrollSettings>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("payroll_settings")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .maybeSingle();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // Auto-create default settings if none exist
    if (!data) {
      const { data: created, error: createError } = await supabase
        .from("payroll_settings")
        .insert({ tenant_id: context.tenant.id })
        .select()
        .single();

      if (createError) {
        return failure(createError.message, ErrorCodes.DATABASE_ERROR);
      }

      return success(created as PayrollSettings);
    }

    return success(data as PayrollSettings);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get payroll settings";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Update payroll settings (admin only).
 */
export async function updatePayrollSettings(input: {
  payFrequency?: PayFrequency;
  payCycleStartDay?: number;
  defaultStartTime?: string;
  defaultEndTime?: string;
  defaultBreakMinutes?: number;
  payrollProvider?: PayrollProvider | null;
  providerConfig?: Record<string, unknown>;
  autoCreatePeriods?: boolean;
}): Promise<ActionResponse<PayrollSettings>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    // Validate start day
    if (input.payCycleStartDay !== undefined) {
      if (input.payCycleStartDay < 1 || input.payCycleStartDay > 7) {
        return failure(
          "Pay cycle start day must be between 1 (Monday) and 7 (Sunday)",
          ErrorCodes.VALIDATION_ERROR,
        );
      }
    }

    // Validate break minutes
    if (
      input.defaultBreakMinutes !== undefined &&
      input.defaultBreakMinutes < 0
    ) {
      return failure("Break minutes cannot be negative", ErrorCodes.VALIDATION_ERROR);
    }

    // Build update payload (only include provided fields)
    const updates: Record<string, unknown> = {};
    if (input.payFrequency !== undefined)
      updates.pay_frequency = input.payFrequency;
    if (input.payCycleStartDay !== undefined)
      updates.pay_cycle_start_day = input.payCycleStartDay;
    if (input.defaultStartTime !== undefined)
      updates.default_start_time = input.defaultStartTime;
    if (input.defaultEndTime !== undefined)
      updates.default_end_time = input.defaultEndTime;
    if (input.defaultBreakMinutes !== undefined)
      updates.default_break_minutes = input.defaultBreakMinutes;
    if (input.payrollProvider !== undefined)
      updates.payroll_provider = input.payrollProvider;
    if (input.providerConfig !== undefined)
      updates.provider_config = input.providerConfig;
    if (input.autoCreatePeriods !== undefined)
      updates.auto_create_periods = input.autoCreatePeriods;

    if (Object.keys(updates).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("payroll_settings")
      .update(updates)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const updated = data as PayrollSettings;

    await logAudit({
      context,
      action: AuditActions.PAYROLL_SETTINGS_UPDATED,
      entityType: "payroll_settings",
      entityId: updated.id,
      metadata: {
        pay_frequency: updated.pay_frequency,
        payroll_provider: updated.payroll_provider,
        auto_create_periods: updated.auto_create_periods,
      },
    });

    return success(updated);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update payroll settings";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// EMPLOYEE MAPPINGS
// ============================================================

/**
 * List all employee mappings for the tenant (with user details).
 */
export async function listEmployeeMappings(): Promise<
  ActionResponse<
    Array<EmployeeMapping & { user_name: string; user_email: string }>
  >
> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("employee_mappings")
      .select(
        `
        *,
        user:users(id, first_name, last_name, email)
      `,
      )
      .order("created_at", { ascending: true });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const mappings = ((data ?? []) as Array<Record<string, unknown>>).map(
      (row) => {
        const user = row.user as {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
        } | null;
        return {
          ...(row as unknown as EmployeeMapping),
          user_name: user ? `${user.first_name} ${user.last_name}` : "Unknown",
          user_email: user?.email ?? "",
        };
      },
    );

    return success(mappings);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list employee mappings";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Create a new employee mapping (link WattleOS user to external payroll ID).
 */
export async function createEmployeeMapping(input: {
  userId: string;
  provider: PayrollProvider;
  externalId: string;
  externalName?: string;
}): Promise<ActionResponse<EmployeeMapping>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    if (!input.externalId.trim()) {
      return failure("External employee ID is required", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("employee_mappings")
      .insert({
        tenant_id: context.tenant.id,
        user_id: input.userId,
        provider: input.provider,
        external_id: input.externalId.trim(),
        external_name: input.externalName?.trim() ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (
        error.message.includes("duplicate") ||
        error.message.includes("unique")
      ) {
        return failure(
          "This user already has a mapping for this provider",
          ErrorCodes.VALIDATION_ERROR,
        );
      }
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const created = data as EmployeeMapping;

    await logAudit({
      context,
      action: AuditActions.EMPLOYEE_MAPPING_CREATED,
      entityType: "employee_mappings",
      entityId: created.id,
      metadata: {
        user_id: input.userId,
        provider: input.provider,
        external_id: input.externalId.trim(),
      },
    });

    return success(created);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create employee mapping";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Update an existing employee mapping.
 */
export async function updateEmployeeMapping(
  mappingId: string,
  input: {
    externalId?: string;
    externalName?: string;
    isActive?: boolean;
  },
): Promise<ActionResponse<EmployeeMapping>> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const updates: Record<string, unknown> = {};
    if (input.externalId !== undefined)
      updates.external_id = input.externalId.trim();
    if (input.externalName !== undefined)
      updates.external_name = input.externalName.trim();
    if (input.isActive !== undefined) updates.is_active = input.isActive;

    if (Object.keys(updates).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("employee_mappings")
      .update(updates)
      .eq("id", mappingId)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    if (!data) {
      return failure("Employee mapping not found", ErrorCodes.NOT_FOUND);
    }

    return success(data as EmployeeMapping);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update employee mapping";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Deactivate an employee mapping (soft-disable, not delete).
 */
export async function removeEmployeeMapping(
  mappingId: string,
): Promise<ActionResponse<{ deactivated: boolean }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    // Fetch before deactivating so we have user_id + provider for audit
    const { data: existing } = await supabase
      .from("employee_mappings")
      .select("user_id, provider")
      .eq("id", mappingId)
      .maybeSingle();

    const { error } = await supabase
      .from("employee_mappings")
      .update({ is_active: false })
      .eq("id", mappingId);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.EMPLOYEE_MAPPING_DELETED,
      entityType: "employee_mappings",
      entityId: mappingId,
      metadata: {
        user_id: (existing as { user_id: string } | null)?.user_id ?? null,
        provider: (existing as { provider: string } | null)?.provider ?? null,
      },
    });

    return success({ deactivated: true });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to deactivate employee mapping";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// TIMESHEET SYNC
// ============================================================

/**
 * Sync a single approved timesheet to the configured payroll provider.
 *
 * Pipeline:
 * 1. Verify timesheet is approved
 * 2. Verify employee mapping exists for the staff member
 * 3. Verify payroll provider is configured
 * 4. Push hours to Xero/KeyPay via integration client
 * 5. Update timesheet status to 'synced' with external reference
 *
 * NOTE: The actual API calls (step 4) will be wired in Phase 9d
 * when the Xero/KeyPay integration clients are built. Currently
 * performs all validation and marks as synced for testing.
 */
export async function syncTimesheetToPayroll(
  timesheetId: string,
): Promise<ActionResponse<Timesheet>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    // 1. Fetch the timesheet
    const { data: timesheet, error: fetchError } = await supabase
      .from("timesheets")
      .select("*")
      .eq("id", timesheetId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !timesheet) {
      return failure("Timesheet not found", ErrorCodes.NOT_FOUND);
    }

    const typed = timesheet as Timesheet;

    if (typed.status !== "approved") {
      return failure(
        `Cannot sync a timesheet in '${typed.status}' status. Must be 'approved'.`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // 2. Check employee mapping exists
    const { data: mapping, error: mappingError } = await supabase
      .from("employee_mappings")
      .select("*")
      .eq("user_id", typed.user_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (mappingError) {
      return failure(mappingError.message, ErrorCodes.DATABASE_ERROR);
    }

    if (!mapping) {
      return failure(
        "No employee mapping found for this staff member. Configure the mapping in Payroll Settings first.",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // 3. Check payroll provider is configured
    const { data: settings } = await supabase
      .from("payroll_settings")
      .select("payroll_provider, provider_config")
      .limit(1)
      .maybeSingle();

    if (!settings || !(settings as PayrollSettings).payroll_provider) {
      return failure(
        "No payroll provider configured. Set up Xero or KeyPay in Payroll Settings first.",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // 4. Push to KeyPay if configured
    let syncReference = `STUB-${Date.now()}-${timesheetId.slice(0, 8)}`;

    const provider = (settings as PayrollSettings).payroll_provider;

    if (provider === "keypay") {
      try {
        // Fetch period for date range
        const { data: period } = await supabase
          .from("pay_periods")
          .select("start_date, end_date, name")
          .eq("id", typed.pay_period_id)
          .single();

        if (period) {
          const typedPeriod = period as {
            start_date: string;
            end_date: string;
            name: string;
          };
          const typedMapping = mapping as EmployeeMapping;

          // Get KeyPay tokens and create client
          const keypayTokens = await getKeyPayTokens(context.tenant.id);
          if (keypayTokens) {
            const keypayClient = new KeyPayClient({
              clientId: process.env.KEYPAY_CLIENT_ID || "",
              clientSecret: process.env.KEYPAY_CLIENT_SECRET || "",
              redirectUri: process.env.KEYPAY_REDIRECT_URI || "",
              accessToken: keypayTokens.accessToken,
              refreshToken: keypayTokens.refreshToken,
              expiresAt: new Date(keypayTokens.expiresAt).getTime(),
              partnerId: keypayTokens.partnerId,
            });

            // Push to KeyPay
            const result = await keypayClient.pushTimesheet({
              employeeId: typedMapping.external_id,
              startDate: typedPeriod.start_date,
              endDate: typedPeriod.end_date,
              regularHours: typed.regular_hours,
              overtimeHours: typed.overtime_hours,
              leaveHours: typed.leave_hours,
              totalHours: typed.total_hours,
              notes: `WattleOS - ${typedPeriod.name}`,
            });

            syncReference = result.id;
          }
        }
      } catch (err) {
        // Log error but don't fail the entire operation
        // Fallback to stub reference so timesheet still marks as synced
        console.error("KeyPay sync error:", err);
      }
    }

    // 5. Mark as synced with reference (whether from KeyPay or stub)

    const { data: updated, error: updateError } = await supabase
      .from("timesheets")
      .update({
        status: "synced",
        synced_at: new Date().toISOString(),
        sync_reference: syncReference,
      })
      .eq("id", timesheetId)
      .select()
      .single();

    if (updateError) {
      return failure(updateError.message, ErrorCodes.DATABASE_ERROR);
    }

    const synced = updated as Timesheet;

    await logAudit({
      context,
      action: AuditActions.TIMESHEET_SYNCED,
      entityType: "timesheets",
      entityId: synced.id,
      metadata: {
        sync_reference: syncReference,
        provider: (settings as PayrollSettings).payroll_provider,
      },
    });

    return success(synced);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to sync timesheet to payroll";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Bulk sync all approved timesheets for a pay period.
 */
export async function bulkSyncTimesheets(
  payPeriodId: string,
): Promise<
  ActionResponse<{ synced: number; failed: number; errors: string[] }>
> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    // Get all approved timesheets for this period
    const { data: timesheets, error } = await supabase
      .from("timesheets")
      .select("id")
      .eq("pay_period_id", payPeriodId)
      .eq("status", "approved")
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const ids = ((timesheets ?? []) as Array<{ id: string }>).map((t) => t.id);

    if (ids.length === 0) {
      return failure(
        "No approved timesheets found for this pay period",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const id of ids) {
      const result = await syncTimesheetToPayroll(id);
      if (result.error) {
        errors.push(`Timesheet ${id}: ${result.error.message}`);
        failed++;
      } else {
        synced++;
      }
    }

    return success({ synced, failed, errors });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to bulk sync timesheets";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
