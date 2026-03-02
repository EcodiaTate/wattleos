'use server';

/**
 * src/lib/actions/timesheet-export.ts
 *
 * ============================================================
 * Timesheet Export Server Actions
 * ============================================================
 * Export approved timesheets as CSV for manual upload to
 * KeyPay or other payroll systems.
 */

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createExportRow,
  generateCSV,
  createCSVBlob,
} from "@/lib/integrations/keypay/csv-export";
import type { ActionResponse } from "@/types/api";
import { ErrorCodes, failure, success } from "@/types/api";
import type { PayPeriod, Timesheet, TimeEntry } from "@/types/domain";

/**
 * Export approved timesheets for a pay period as CSV.
 * Returns CSV content as string (can be downloaded from client).
 */
export async function exportTimesheetsAsCSV(
  payPeriodId: string,
  options?: {
    includePAYGWithheld?: boolean;
    includeSuperannuation?: boolean;
  }
): Promise<
  ActionResponse<{
    csv: string;
    filename: string;
    rowCount: number;
  }>
> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // 1. Fetch pay period
    const { data: period, error: periodError } = await supabase
      .from("pay_periods")
      .select("*")
      .eq("id", payPeriodId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (periodError || !period) {
      return failure("Pay period not found", ErrorCodes.NOT_FOUND);
    }

    const typedPeriod = period as PayPeriod;

    // 2. Fetch all approved timesheets for this period
    const { data: timesheets, error: timesheetsError } = await supabase
      .from("timesheets")
      .select(
        `
        *,
        user:users!timesheets_user_id_fkey(id, first_name, last_name),
        mapping:employee_mappings(external_id)
      `
      )
      .eq("pay_period_id", payPeriodId)
      .eq("status", "approved")
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (timesheetsError) {
      return failure(timesheetsError.message, ErrorCodes.DATABASE_ERROR);
    }

    if (!timesheets || timesheets.length === 0) {
      return failure(
        "No approved timesheets found for this pay period",
        ErrorCodes.VALIDATION_ERROR
      );
    }

    type TimesheetRow = Timesheet & {
      user: { first_name: string; last_name: string } | null;
      mapping: { external_id: string }[] | null;
    };

    // 3. Build export rows
    const rows = [];

    for (const ts of timesheets as TimesheetRow[]) {
      const timesheet = ts;

      // Get user name
      const userName = timesheet.user
        ? `${timesheet.user.first_name} ${timesheet.user.last_name}`
        : "Unknown";

      // Get employee ID from mapping (use external ID or user ID as fallback)
      const employeeId =
        timesheet.mapping?.[0]?.external_id ||
        timesheet.user_id.substring(0, 8);

      // Fetch time entries for this timesheet
      const { data: entries } = await supabase
        .from("time_entries")
        .select("*")
        .eq("user_id", timesheet.user_id)
        .eq("pay_period_id", payPeriodId)
        .is("deleted_at", null)
        .order("date", { ascending: true });

      const typedEntries = (entries ?? []) as TimeEntry[];

      // Create export row
      const row = createExportRow(
        { ...timesheet, user_name: userName },
        typedEntries,
        typedPeriod,
        employeeId
      );

      rows.push(row);
    }

    // 4. Generate CSV
    const csv = generateCSV(rows, {
      includePAYGWithheld: options?.includePAYGWithheld || false,
      includeSuperannuation: options?.includeSuperannuation || false,
    });

    // 5. Create filename
    const filename = `timesheets_${new Date().toISOString().split("T")[0]}_${typedPeriod.name.replace(/\s+/g, "_")}.csv`;

    return success({
      csv,
      filename,
      rowCount: rows.length,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to export timesheets";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Get export preview for a pay period (summary without actual file).
 * Shows how many timesheets will be exported, total hours, etc.
 */
export async function getExportPreview(
  payPeriodId: string
): Promise<
  ActionResponse<{
    timesheetCount: number;
    totalHours: number;
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalLeaveHours: number;
    periodName: string;
  }>
> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Fetch period
    const { data: period } = await supabase
      .from("pay_periods")
      .select("name")
      .eq("id", payPeriodId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!period) {
      return failure("Pay period not found", ErrorCodes.NOT_FOUND);
    }

    // Fetch approved timesheets with aggregates
    const { data: timesheets } = await supabase
      .from("timesheets")
      .select("*")
      .eq("pay_period_id", payPeriodId)
      .eq("status", "approved")
      .is("deleted_at", null);

    const typedTimesheets = (timesheets ?? []) as Timesheet[];

    const summary = {
      timesheetCount: typedTimesheets.length,
      totalHours: 0,
      totalRegularHours: 0,
      totalOvertimeHours: 0,
      totalLeaveHours: 0,
      periodName: (period as { name: string }).name,
    };

    for (const ts of typedTimesheets) {
      summary.totalHours += ts.total_hours;
      summary.totalRegularHours += ts.regular_hours;
      summary.totalOvertimeHours += ts.overtime_hours;
      summary.totalLeaveHours += ts.leave_hours;
    }

    // Round to 2 decimals
    summary.totalHours = Math.round(summary.totalHours * 100) / 100;
    summary.totalRegularHours =
      Math.round(summary.totalRegularHours * 100) / 100;
    summary.totalOvertimeHours =
      Math.round(summary.totalOvertimeHours * 100) / 100;
    summary.totalLeaveHours = Math.round(summary.totalLeaveHours * 100) / 100;

    return success(summary);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get export preview";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
