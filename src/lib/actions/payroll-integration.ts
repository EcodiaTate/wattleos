// src/lib/actions/payroll-integration.ts
//
// ============================================================
// WattleOS V2 — Payroll Integration Server Actions
// ============================================================
// Manages the connection between WattleOS and external payroll
// systems (Xero / KeyPay). Three concerns:
//   1. Payroll settings (config)
//   2. Employee mappings (user → external ID)
//   3. Timesheet sync (push approved hours out)
//
// Sync methods are complete action shells with proper validation.
// The actual API calls will be wired in Phase 9d when the
// integration clients are built.
// ============================================================

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requirePermission, getTenantContext } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import type { ActionResponse } from '@/types/api';
import { success, failure } from '@/types/api';
import type {
  PayrollSettings,
  EmployeeMapping,
  PayrollProvider,
  PayFrequency,
  Timesheet,
} from '@/types/domain';

// ============================================================
// PAYROLL SETTINGS
// ============================================================

/**
 * Get the tenant's payroll settings. Creates a default row if none exists.
 */
export async function getPayrollSettings(): Promise<ActionResponse<PayrollSettings>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('payroll_settings')
      .select('*')
      .eq('tenant_id', context.tenant.id)
      .maybeSingle();

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    // Auto-create default settings if none exist
    if (!data) {
      const { data: created, error: createError } = await supabase
        .from('payroll_settings')
        .insert({ tenant_id: context.tenant.id })
        .select()
        .single();

      if (createError) {
        return failure(createError.message, 'DB_ERROR');
      }

      return success(created as PayrollSettings);
    }

    return success(data as PayrollSettings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get payroll settings';
    return failure(message, 'UNEXPECTED_ERROR');
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
        return failure('Pay cycle start day must be between 1 (Monday) and 7 (Sunday)', 'VALIDATION_ERROR');
      }
    }

    // Validate break minutes
    if (input.defaultBreakMinutes !== undefined && input.defaultBreakMinutes < 0) {
      return failure('Break minutes cannot be negative', 'VALIDATION_ERROR');
    }

    // Build update payload (only include provided fields)
    const updates: Record<string, unknown> = {};
    if (input.payFrequency !== undefined) updates.pay_frequency = input.payFrequency;
    if (input.payCycleStartDay !== undefined) updates.pay_cycle_start_day = input.payCycleStartDay;
    if (input.defaultStartTime !== undefined) updates.default_start_time = input.defaultStartTime;
    if (input.defaultEndTime !== undefined) updates.default_end_time = input.defaultEndTime;
    if (input.defaultBreakMinutes !== undefined) updates.default_break_minutes = input.defaultBreakMinutes;
    if (input.payrollProvider !== undefined) updates.payroll_provider = input.payrollProvider;
    if (input.providerConfig !== undefined) updates.provider_config = input.providerConfig;
    if (input.autoCreatePeriods !== undefined) updates.auto_create_periods = input.autoCreatePeriods;

    if (Object.keys(updates).length === 0) {
      return failure('No fields to update', 'VALIDATION_ERROR');
    }

    const { data, error } = await supabase
      .from('payroll_settings')
      .update(updates)
      .eq('tenant_id', context.tenant.id)
      .select()
      .single();

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    return success(data as PayrollSettings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update payroll settings';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// EMPLOYEE MAPPINGS
// ============================================================

/**
 * List all employee mappings for the tenant (with user details).
 */
export async function listEmployeeMappings(): Promise<
  ActionResponse<Array<EmployeeMapping & { user_name: string; user_email: string }>>
> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('employee_mappings')
      .select(`
        *,
        user:users(id, first_name, last_name, email)
      `)
      .order('created_at', { ascending: true });

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    const mappings = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const user = row.user as { id: string; first_name: string; last_name: string; email: string } | null;
      return {
        ...(row as unknown as EmployeeMapping),
        user_name: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
        user_email: user?.email ?? '',
      };
    });

    return success(mappings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list employee mappings';
    return failure(message, 'UNEXPECTED_ERROR');
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
      return failure('External employee ID is required', 'VALIDATION_ERROR');
    }

    const { data, error } = await supabase
      .from('employee_mappings')
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
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return failure('This user already has a mapping for this provider', 'VALIDATION_ERROR');
      }
      return failure(error.message, 'DB_ERROR');
    }

    return success(data as EmployeeMapping);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create employee mapping';
    return failure(message, 'UNEXPECTED_ERROR');
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
  }
): Promise<ActionResponse<EmployeeMapping>> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const updates: Record<string, unknown> = {};
    if (input.externalId !== undefined) updates.external_id = input.externalId.trim();
    if (input.externalName !== undefined) updates.external_name = input.externalName.trim();
    if (input.isActive !== undefined) updates.is_active = input.isActive;

    if (Object.keys(updates).length === 0) {
      return failure('No fields to update', 'VALIDATION_ERROR');
    }

    const { data, error } = await supabase
      .from('employee_mappings')
      .update(updates)
      .eq('id', mappingId)
      .select()
      .single();

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    if (!data) {
      return failure('Employee mapping not found', 'NOT_FOUND');
    }

    return success(data as EmployeeMapping);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update employee mapping';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

/**
 * Deactivate an employee mapping (soft-disable, not delete).
 */
export async function removeEmployeeMapping(
  mappingId: string
): Promise<ActionResponse<{ deactivated: boolean }>> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('employee_mappings')
      .update({ is_active: false })
      .eq('id', mappingId);

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    return success({ deactivated: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to deactivate employee mapping';
    return failure(message, 'UNEXPECTED_ERROR');
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
  timesheetId: string
): Promise<ActionResponse<Timesheet>> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    // 1. Fetch the timesheet
    const { data: timesheet, error: fetchError } = await supabase
      .from('timesheets')
      .select('*')
      .eq('id', timesheetId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !timesheet) {
      return failure('Timesheet not found', 'NOT_FOUND');
    }

    const typed = timesheet as Timesheet;

    if (typed.status !== 'approved') {
      return failure(
        `Cannot sync a timesheet in '${typed.status}' status. Must be 'approved'.`,
        'VALIDATION_ERROR'
      );
    }

    // 2. Check employee mapping exists
    const { data: mapping, error: mappingError } = await supabase
      .from('employee_mappings')
      .select('*')
      .eq('user_id', typed.user_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (mappingError) {
      return failure(mappingError.message, 'DB_ERROR');
    }

    if (!mapping) {
      return failure(
        'No employee mapping found for this staff member. Configure the mapping in Payroll Settings first.',
        'VALIDATION_ERROR'
      );
    }

    // 3. Check payroll provider is configured
    const { data: settings } = await supabase
      .from('payroll_settings')
      .select('payroll_provider, provider_config')
      .limit(1)
      .maybeSingle();

    if (!settings || !(settings as PayrollSettings).payroll_provider) {
      return failure(
        'No payroll provider configured. Set up Xero or KeyPay in Payroll Settings first.',
        'VALIDATION_ERROR'
      );
    }

    // 4. TODO: Push to Xero/KeyPay via integration client (Phase 9d)
    // const provider = (settings as PayrollSettings).payroll_provider;
    // const config = (settings as PayrollSettings).provider_config;
    // const typedMapping = mapping as EmployeeMapping;
    //
    // if (provider === 'xero') {
    //   const xeroClient = createXeroClient(config);
    //   const result = await xeroClient.pushTimesheet({ ... });
    //   syncReference = result.timesheetId;
    // } else if (provider === 'keypay') {
    //   const keypayClient = createKeyPayClient(config);
    //   const result = await keypayClient.pushTimesheet({ ... });
    //   syncReference = result.timesheetId;
    // }

    // 5. Mark as synced (for now, generates a placeholder reference)
    const syncReference = `STUB-${Date.now()}-${timesheetId.slice(0, 8)}`;

    const { data: updated, error: updateError } = await supabase
      .from('timesheets')
      .update({
        status: 'synced',
        synced_at: new Date().toISOString(),
        sync_reference: syncReference,
      })
      .eq('id', timesheetId)
      .select()
      .single();

    if (updateError) {
      return failure(updateError.message, 'DB_ERROR');
    }

    return success(updated as Timesheet);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to sync timesheet to payroll';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

/**
 * Bulk sync all approved timesheets for a pay period.
 */
export async function bulkSyncTimesheets(
  payPeriodId: string
): Promise<ActionResponse<{ synced: number; failed: number; errors: string[] }>> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    // Get all approved timesheets for this period
    const { data: timesheets, error } = await supabase
      .from('timesheets')
      .select('id')
      .eq('pay_period_id', payPeriodId)
      .eq('status', 'approved')
      .is('deleted_at', null);

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    const ids = ((timesheets ?? []) as Array<{ id: string }>).map((t) => t.id);

    if (ids.length === 0) {
      return failure('No approved timesheets found for this pay period', 'VALIDATION_ERROR');
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
    const message = err instanceof Error ? err.message : 'Failed to bulk sync timesheets';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}