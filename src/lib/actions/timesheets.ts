// src/lib/actions/timesheets.ts
//
// ============================================================
// WattleOS V2 — Timesheet Server Actions
// ============================================================
// Manages the timesheet lifecycle:
//   draft → submitted → approved → synced
//                    ↘ rejected → (resubmit)
//
// A timesheet aggregates a staff member's time_entries for a
// pay period into one reviewable unit.
// ============================================================

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTenantContext, requirePermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import type { ActionResponse } from '@/types/api';
import { success, failure } from '@/types/api';
import type {
  Timesheet,
  TimesheetStatus,
  TimesheetWithEntries,
  TimeEntry,
  TimeEntryType,
} from '@/types/domain';
import { LEAVE_TYPES } from '@/lib/constants/timesheets';

// ============================================================
// Helper: User type from Supabase join
// ============================================================

interface JoinedUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

// ============================================================
// SUBMIT: Aggregate entries → create/update timesheet
// ============================================================

/**
 * Submits a timesheet for a pay period. Aggregates all time_entries
 * for the current user in that period, calculates hour totals,
 * and sets status to 'submitted'.
 *
 * If a draft timesheet already exists, it's updated.
 * If the timesheet was previously rejected, re-submitting resets
 * it to 'submitted'.
 */
export async function submitTimesheet(
  payPeriodId: string
): Promise<ActionResponse<Timesheet>> {
  try {
    const context = await requirePermission(Permissions.LOG_TIME);
    const supabase = await createSupabaseServerClient();

    // 1. Verify the pay period exists and is open
    const { data: period, error: periodError } = await supabase
      .from('pay_periods')
      .select('id, status')
      .eq('id', payPeriodId)
      .is('deleted_at', null)
      .single();

    if (periodError || !period) {
      return failure('Pay period not found', 'NOT_FOUND');
    }

    const typedPeriod = period as { id: string; status: string };

    // Allow submission if period is open (or locked — locked just prevents new entries)
    if (typedPeriod.status === 'processed') {
      return failure('This pay period has already been processed', 'VALIDATION_ERROR');
    }

    // 2. Fetch all time entries for this user + period
    const { data: entries, error: entriesError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', context.user.id)
      .eq('pay_period_id', payPeriodId)
      .is('deleted_at', null);

    if (entriesError) {
      return failure(entriesError.message, 'DB_ERROR');
    }

    const typedEntries = (entries ?? []) as TimeEntry[];

    if (typedEntries.length === 0) {
      return failure('No time entries found for this pay period. Log your hours first.', 'VALIDATION_ERROR');
    }

    // 3. Calculate hour breakdowns
    let regularHours = 0;
    let overtimeHours = 0;
    let leaveHours = 0;

    for (const entry of typedEntries) {
      const hours = Number(entry.total_hours) || 0;
      if (entry.entry_type === 'overtime') {
        overtimeHours += hours;
      } else if (LEAVE_TYPES.includes(entry.entry_type as TimeEntryType)) {
        leaveHours += hours;
      } else {
        regularHours += hours;
      }
    }

    const totalHours = regularHours + overtimeHours + leaveHours;

    // 4. Upsert the timesheet
    const { data: existing } = await supabase
      .from('timesheets')
      .select('id, status')
      .eq('user_id', context.user.id)
      .eq('pay_period_id', payPeriodId)
      .is('deleted_at', null)
      .maybeSingle();

    const typedExisting = existing as { id: string; status: TimesheetStatus } | null;

    // Can only submit if draft or rejected
    if (typedExisting && typedExisting.status !== 'draft' && typedExisting.status !== 'rejected') {
      return failure(
        `Timesheet is already '${typedExisting.status}' and cannot be resubmitted`,
        'VALIDATION_ERROR'
      );
    }

    const timesheetData = {
      total_hours: Math.round(totalHours * 100) / 100,
      regular_hours: Math.round(regularHours * 100) / 100,
      overtime_hours: Math.round(overtimeHours * 100) / 100,
      leave_hours: Math.round(leaveHours * 100) / 100,
      status: 'submitted' as const,
      submitted_at: new Date().toISOString(),
      rejected_at: null,
      rejected_by: null,
      rejection_notes: null,
    };

    let data: unknown;
    let error: { message: string } | null;

    if (typedExisting) {
      const result = await supabase
        .from('timesheets')
        .update(timesheetData)
        .eq('id', typedExisting.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from('timesheets')
        .insert({
          tenant_id: context.tenant.id,
          user_id: context.user.id,
          pay_period_id: payPeriodId,
          ...timesheetData,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    return success(data as Timesheet);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit timesheet';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// GET: My timesheets (staff view — own timesheets)
// ============================================================

export async function getMyTimesheets(): Promise<ActionResponse<Array<Timesheet & { pay_period_name: string }>>> {
  try {
    const context = await requirePermission(Permissions.LOG_TIME);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('timesheets')
      .select(`
        *,
        pay_period:pay_periods(name)
      `)
      .eq('user_id', context.user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    const timesheets = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const pp = row.pay_period as { name: string } | null;
      return {
        ...(row as unknown as Timesheet),
        pay_period_name: pp?.name ?? 'Unknown Period',
      };
    });

    return success(timesheets);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get my timesheets';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// LIST: Pending timesheets (approver view)
// ============================================================

export async function listPendingTimesheets(params?: {
  payPeriodId?: string;
}): Promise<ActionResponse<Array<Timesheet & { user_name: string; pay_period_name: string }>>> {
  try {
    await requirePermission(Permissions.APPROVE_TIMESHEETS);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('timesheets')
      .select(`
        *,
        user:users!timesheets_user_id_fkey(id, first_name, last_name, avatar_url),
        pay_period:pay_periods(name)
      `)
      .eq('status', 'submitted')
      .is('deleted_at', null)
      .order('submitted_at', { ascending: true });

    if (params?.payPeriodId) {
      query = query.eq('pay_period_id', params.payPeriodId);
    }

    const { data, error } = await query;

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    const timesheets = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const user = row.user as JoinedUser | null;
      const pp = row.pay_period as { name: string } | null;
      return {
        ...(row as unknown as Timesheet),
        user_name: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
        pay_period_name: pp?.name ?? 'Unknown Period',
      };
    });

    return success(timesheets);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list pending timesheets';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// LIST: All timesheets for a pay period (admin/approver view)
// ============================================================

export async function listTimesheetsForPeriod(
  payPeriodId: string
): Promise<ActionResponse<Array<Timesheet & { user_name: string; avatar_url: string | null }>>> {
  try {
    await requirePermission(Permissions.APPROVE_TIMESHEETS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('timesheets')
      .select(`
        *,
        user:users!timesheets_user_id_fkey(id, first_name, last_name, avatar_url)
      `)
      .eq('pay_period_id', payPeriodId)
      .is('deleted_at', null)
      .order('submitted_at', { ascending: true });

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    const timesheets = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const user = row.user as JoinedUser | null;
      return {
        ...(row as unknown as Timesheet),
        user_name: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
        avatar_url: user?.avatar_url ?? null,
      };
    });

    return success(timesheets);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list timesheets for period';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// GET: Timesheet detail with all time entries
// ============================================================

export async function getTimesheetDetail(
  timesheetId: string
): Promise<ActionResponse<TimesheetWithEntries>> {
  try {
    // Allow both own timesheets and approver access
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('timesheets')
      .select(`
        *,
        user:users!timesheets_user_id_fkey(id, first_name, last_name, avatar_url),
        pay_period:pay_periods(name, start_date, end_date)
      `)
      .eq('id', timesheetId)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return failure('Timesheet not found', 'NOT_FOUND');
    }

    const row = data as Record<string, unknown>;
    const timesheetUserId = row.user_id as string;

    // Permission check: own timesheet OR approver
    const isOwn = timesheetUserId === context.user.id;
    const isApprover = context.permissions.includes(Permissions.APPROVE_TIMESHEETS);

    if (!isOwn && !isApprover) {
      return failure('You do not have permission to view this timesheet', 'FORBIDDEN');
    }

    // Fetch related time entries
    const { data: entries, error: entriesError } = await supabase
      .from('time_entries')
      .select(`
        *,
        class:classes(name)
      `)
      .eq('user_id', timesheetUserId)
      .eq('pay_period_id', row.pay_period_id as string)
      .is('deleted_at', null)
      .order('date', { ascending: true });

    if (entriesError) {
      return failure(entriesError.message, 'DB_ERROR');
    }

    const user = row.user as JoinedUser;

    const result: TimesheetWithEntries = {
      ...(row as unknown as Timesheet),
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
      },
      time_entries: ((entries ?? []) as Array<Record<string, unknown>>).map((e) => ({
        id: e.id as string,
        tenant_id: e.tenant_id as string,
        user_id: e.user_id as string,
        pay_period_id: e.pay_period_id as string | null,
        date: e.date as string,
        start_time: e.start_time as string,
        end_time: e.end_time as string,
        break_minutes: e.break_minutes as number,
        total_hours: e.total_hours as number,
        entry_type: e.entry_type as TimeEntryType,
        class_id: e.class_id as string | null,
        notes: e.notes as string | null,
      })),
    };

    return success(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get timesheet detail';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// APPROVE: Mark timesheet as approved
// ============================================================

export async function approveTimesheet(
  timesheetId: string
): Promise<ActionResponse<Timesheet>> {
  try {
    const context = await requirePermission(Permissions.APPROVE_TIMESHEETS);
    const supabase = await createSupabaseServerClient();

    // Verify timesheet exists and is in submitted status
    const { data: existing, error: fetchError } = await supabase
      .from('timesheets')
      .select('id, status, user_id')
      .eq('id', timesheetId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return failure('Timesheet not found', 'NOT_FOUND');
    }

    const typedExisting = existing as { id: string; status: string; user_id: string };

    if (typedExisting.status !== 'submitted') {
      return failure(
        `Cannot approve a timesheet in '${typedExisting.status}' status. Must be 'submitted'.`,
        'VALIDATION_ERROR'
      );
    }

    // Cannot approve your own timesheet
    if (typedExisting.user_id === context.user.id) {
      return failure('You cannot approve your own timesheet', 'VALIDATION_ERROR');
    }

    const { data, error } = await supabase
      .from('timesheets')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: context.user.id,
      })
      .eq('id', timesheetId)
      .select()
      .single();

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    return success(data as Timesheet);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to approve timesheet';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// REJECT: Mark timesheet as rejected with notes
// ============================================================

export async function rejectTimesheet(
  timesheetId: string,
  notes: string
): Promise<ActionResponse<Timesheet>> {
  try {
    const context = await requirePermission(Permissions.APPROVE_TIMESHEETS);
    const supabase = await createSupabaseServerClient();

    if (!notes.trim()) {
      return failure('Rejection notes are required', 'VALIDATION_ERROR');
    }

    const { data: existing, error: fetchError } = await supabase
      .from('timesheets')
      .select('id, status, user_id')
      .eq('id', timesheetId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return failure('Timesheet not found', 'NOT_FOUND');
    }

    const typedExisting = existing as { id: string; status: string; user_id: string };

    if (typedExisting.status !== 'submitted') {
      return failure(
        `Cannot reject a timesheet in '${typedExisting.status}' status. Must be 'submitted'.`,
        'VALIDATION_ERROR'
      );
    }

    const { data, error } = await supabase
      .from('timesheets')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: context.user.id,
        rejection_notes: notes.trim(),
      })
      .eq('id', timesheetId)
      .select()
      .single();

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    return success(data as Timesheet);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reject timesheet';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// BATCH APPROVE: Approve multiple submitted timesheets
// ============================================================

export async function batchApproveTimesheets(
  timesheetIds: string[]
): Promise<ActionResponse<{ approved: number; failed: number; errors: string[] }>> {
  try {
    const context = await requirePermission(Permissions.APPROVE_TIMESHEETS);
    const supabase = await createSupabaseServerClient();

    let approved = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const id of timesheetIds) {
      const { data: existing } = await supabase
        .from('timesheets')
        .select('id, status, user_id')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      const typed = existing as { id: string; status: string; user_id: string } | null;

      if (!typed) {
        errors.push(`Timesheet ${id}: not found`);
        failed++;
        continue;
      }

      if (typed.status !== 'submitted') {
        errors.push(`Timesheet ${id}: not in submitted status`);
        failed++;
        continue;
      }

      if (typed.user_id === context.user.id) {
        errors.push(`Timesheet ${id}: cannot approve own timesheet`);
        failed++;
        continue;
      }

      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: context.user.id,
        })
        .eq('id', id);

      if (error) {
        errors.push(`Timesheet ${id}: ${error.message}`);
        failed++;
      } else {
        approved++;
      }
    }

    return success({ approved, failed, errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to batch approve timesheets';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}