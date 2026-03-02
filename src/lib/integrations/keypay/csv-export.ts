/**
 * src/lib/integrations/keypay/csv-export.ts
 *
 * ============================================================
 * KeyPay CSV Export
 * ============================================================
 * Converts approved timesheets to KeyPay-compatible CSV format
 * with PAYG and superannuation field mapping.
 *
 * Column spec (KeyPay standard):
 * - Employee ID
 * - Start Date
 * - End Date
 * - Regular Hours
 * - Overtime Hours
 * - Leave Hours (broken down by type)
 * - Gross Amount (optional, for verification)
 * - Notes
 */

import type { Timesheet, TimeEntry, PayPeriod } from "@/types/domain";

export interface TimesheetExportRow {
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  regularHours: number;
  overtimeHours: number;
  annualLeaveHours: number;
  sickLeaveHours: number;
  unpaidLeaveHours: number;
  totalLeaveHours: number;
  totalHours: number;
  notes?: string;
}

export interface CSVExportOptions {
  includeGrossAmount?: boolean;
  includePAYGWithheld?: boolean;
  includeSuperannuation?: boolean;
  superannuationPercentage?: number; // e.g., 11.5 for 11.5%
}

/**
 * Map timesheet + entries to CSV export row.
 * Breaks down leave types for detailed reporting.
 */
export function createExportRow(
  timesheet: Timesheet & { user_name?: string },
  entries: TimeEntry[],
  period: PayPeriod,
  employeeId: string
): TimesheetExportRow {
  let annualLeaveHours = 0;
  let sickLeaveHours = 0;
  let unpaidLeaveHours = 0;

  // Break down leave entries by type
  for (const entry of entries) {
    if (entry.entry_type === "annual_leave") {
      annualLeaveHours += Number(entry.total_hours) || 0;
    } else if (entry.entry_type === "sick_leave") {
      sickLeaveHours += Number(entry.total_hours) || 0;
    } else if (entry.entry_type === "unpaid_leave") {
      unpaidLeaveHours += Number(entry.total_hours) || 0;
    }
  }

  const totalLeaveHours =
    annualLeaveHours + sickLeaveHours + unpaidLeaveHours;

  return {
    employeeId,
    employeeName: timesheet.user_name || "Unknown",
    startDate: period.start_date,
    endDate: period.end_date,
    regularHours: Math.round(timesheet.regular_hours * 100) / 100,
    overtimeHours: Math.round(timesheet.overtime_hours * 100) / 100,
    annualLeaveHours: Math.round(annualLeaveHours * 100) / 100,
    sickLeaveHours: Math.round(sickLeaveHours * 100) / 100,
    unpaidLeaveHours: Math.round(unpaidLeaveHours * 100) / 100,
    totalLeaveHours: Math.round(totalLeaveHours * 100) / 100,
    totalHours: Math.round(timesheet.total_hours * 100) / 100,
    notes: `Approved by ${timesheet.approved_by || "System"} on ${timesheet.approved_at ? new Date(timesheet.approved_at).toLocaleDateString() : ""}`,
  };
}

/**
 * Generate CSV content from export rows.
 * Standard format compatible with KeyPay bulk upload.
 */
export function generateCSV(
  rows: TimesheetExportRow[],
  options: CSVExportOptions = {}
): string {
  const headers = [
    "Employee ID",
    "Employee Name",
    "Start Date",
    "End Date",
    "Regular Hours",
    "Overtime Hours",
    "Annual Leave Hours",
    "Sick Leave Hours",
    "Unpaid Leave Hours",
    "Total Leave Hours",
    "Total Hours",
  ];

  if (options.includePAYGWithheld) {
    headers.push("PAYG Withheld (AUD)");
  }

  if (options.includeSuperannuation) {
    headers.push("Superannuation (AUD)");
  }

  headers.push("Notes");

  // Header row
  const csvLines = [headers.map((h) => `"${h}"`).join(",")];

  // Data rows
  for (const row of rows) {
    const values = [
      row.employeeId,
      row.employeeName,
      row.startDate,
      row.endDate,
      row.regularHours.toString(),
      row.overtimeHours.toString(),
      row.annualLeaveHours.toString(),
      row.sickLeaveHours.toString(),
      row.unpaidLeaveHours.toString(),
      row.totalLeaveHours.toString(),
      row.totalHours.toString(),
    ];

    if (options.includePAYGWithheld) {
      // PAYG would typically be calculated based on gross pay
      // For now, leave blank (employer fills in from payroll system)
      values.push("");
    }

    if (options.includeSuperannuation) {
      // Superannuation calculation: gross × percentage
      // For now, leave blank (employer fills in from payroll system)
      values.push("");
    }

    values.push(row.notes || "");

    csvLines.push(values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  }

  return csvLines.join("\n");
}

/**
 * Generate CSV blob for download.
 * Filename: timesheets_[YYYY-MM-DD]_[period-name].csv
 */
export function createCSVBlob(
  csv: string,
  periodName: string
): { blob: Blob; filename: string } {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const filename = `timesheets_${new Date().toISOString().split("T")[0]}_${periodName.replace(/\s+/g, "_")}.csv`;

  return { blob, filename };
}

/**
 * Helper: Download CSV blob in browser.
 * Call from client component.
 */
export function downloadCSV(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
