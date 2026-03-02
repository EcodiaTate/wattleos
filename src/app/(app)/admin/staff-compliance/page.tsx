import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getComplianceDashboard,
  getExpiringItems,
  getComplianceSettings,
} from "@/lib/actions/staff-compliance";
import { ComplianceDashboardClient } from "@/components/domain/staff-compliance/compliance-dashboard-client";
import { ComplianceSettingsDialog } from "@/components/domain/staff-compliance/compliance-settings-dialog";
import { BulkImportDialog } from "@/components/domain/staff-compliance/bulk-import-dialog";
import { DEFAULT_COMPLIANCE_SETTINGS } from "@/lib/constants/tenant-settings";

export default async function StaffCompliancePage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_STAFF_COMPLIANCE) ||
    hasPermission(context, Permissions.MANAGE_STAFF_COMPLIANCE);

  if (!canView) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(context, Permissions.MANAGE_STAFF_COMPLIANCE);
  const canExport = hasPermission(context, Permissions.EXPORT_WORKER_REGISTER);

  const [dashboardResult, expiringResult, settingsResult] = await Promise.all([
    getComplianceDashboard(),
    getExpiringItems(),
    getComplianceSettings(),
  ]);

  const dashboard = dashboardResult.data;
  const expiringItems = expiringResult.data ?? [];
  const settings = settingsResult.data ?? DEFAULT_COMPLIANCE_SETTINGS;

  if (!dashboard) {
    return (
      <div className="p-6">
        <p style={{ color: "var(--destructive)" }}>
          Failed to load compliance dashboard.{" "}
          {dashboardResult.error?.message}
        </p>
      </div>
    );
  }

  // Build staff list for supervisor select (from dashboard data)
  const staffList = dashboard.staff.map((s) => ({
    id: s.user.id,
    name:
      `${s.user.first_name ?? ""} ${s.user.last_name ?? ""}`.trim() ||
      s.user.email,
  }));

  // Worker Register deadline: 27 Feb 2026
  const workerRegisterDeadline = new Date("2026-02-27T00:00:00+11:00");
  const now = new Date();
  const daysUntilDeadline = Math.ceil(
    (workerRegisterDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  const deadlinePassed = daysUntilDeadline <= 0;

  // Geccko compliance stats
  const gecckoMissing = dashboard.staff.filter(
    (s) => s.geccko_status === "missing",
  );
  const gecckoComplete = dashboard.staff.length - gecckoMissing.length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            Staff Compliance
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Reg 136 (First Aid) · Reg 137 (Anaphylaxis) · Reg 138 (Asthma) · Reg
            145 (WWCC) · Reg 146 (Qualifications)
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <ComplianceSettingsDialog
              settings={settings}
              staffList={staffList}
            />
            <BulkImportDialog />
          </div>
        )}
      </div>

      {/* Worker Register Deadline Alert */}
      {daysUntilDeadline <= 30 && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: deadlinePassed
              ? "var(--attendance-absent-fg, #991b1b)"
              : "var(--attendance-late-fg, #854d0e)",
            backgroundColor: deadlinePassed
              ? "var(--attendance-absent-bg, #fee2e2)"
              : "var(--attendance-late-bg, #fef9c3)",
          }}
        >
          <p
            className="text-sm font-semibold"
            style={{
              color: deadlinePassed
                ? "var(--attendance-absent-fg, #991b1b)"
                : "var(--attendance-late-fg, #854d0e)",
            }}
          >
            {deadlinePassed
              ? "National Early Childhood Worker Register is LIVE"
              : `Worker Register goes live in ${daysUntilDeadline} day${daysUntilDeadline === 1 ? "" : "s"}`}
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {deadlinePassed
              ? "Staff data must now be exportable to NQA ITS. Ensure all profiles have DOB, contact address, and employment dates."
              : "Mandatory child safety training (Geccko) commences 27 February 2026. Ensure all staff profiles are complete for NQA ITS export."}
          </p>
        </div>
      )}

      {/* Geccko Child Safety Training Alert */}
      {gecckoMissing.length > 0 && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: deadlinePassed
              ? "var(--attendance-absent-fg, #991b1b)"
              : "var(--attendance-late-fg, #854d0e)",
            backgroundColor: deadlinePassed
              ? "var(--attendance-absent-bg, #fee2e2)"
              : "var(--attendance-late-bg, #fef9c3)",
          }}
        >
          <div className="flex items-center justify-between">
            <p
              className="text-sm font-semibold"
              style={{
                color: deadlinePassed
                  ? "var(--attendance-absent-fg, #991b1b)"
                  : "var(--attendance-late-fg, #854d0e)",
              }}
            >
              Child Safety Training (Geccko):{" "}
              {gecckoMissing.length} staff without completion
            </p>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: "var(--attendance-present-bg, #dcfce7)",
                color: "var(--attendance-present-fg, #166534)",
              }}
            >
              {gecckoComplete}/{dashboard.staff.length} complete
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {gecckoMissing.slice(0, 10).map((s) => {
              const name =
                `${s.user.first_name ?? ""} ${s.user.last_name ?? ""}`.trim() ||
                s.user.email;
              return (
                <Link
                  key={s.user.id}
                  href={`/admin/staff-compliance/${s.user.id}`}
                  className="rounded-full border border-border px-2 py-0.5 text-xs font-medium transition-colors hover:bg-[var(--muted)]"
                  style={{ color: "var(--foreground)" }}
                >
                  {name}
                </Link>
              );
            })}
            {gecckoMissing.length > 10 && (
              <span
                className="rounded-full px-2 py-0.5 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                +{gecckoMissing.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Expiring Items Alert */}
      {expiringItems.length > 0 && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--attendance-late-fg, #854d0e)",
            backgroundColor: "var(--attendance-late-bg, #fef9c3)",
          }}
        >
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--attendance-late-fg, #854d0e)" }}
          >
            {expiringItems.length} item{expiringItems.length !== 1 ? "s" : ""}{" "}
            expiring within {settings.expiry_warning_days} days
          </p>
          <ul className="mt-2 space-y-1">
            {expiringItems.slice(0, 5).map((item, i) => (
              <li
                key={`${item.user_id}-${item.item_type}-${i}`}
                className="text-xs"
                style={{ color: "var(--foreground)" }}
              >
                <span className="font-medium">{item.user_name}</span> —{" "}
                {item.label}{" "}
                <span
                  className="font-semibold"
                  style={{
                    color:
                      item.days_remaining <= 0
                        ? "var(--attendance-absent-fg, #991b1b)"
                        : "var(--attendance-late-fg, #854d0e)",
                  }}
                >
                  {item.days_remaining <= 0
                    ? "EXPIRED"
                    : `${item.days_remaining} days remaining`}
                </span>
              </li>
            ))}
            {expiringItems.length > 5 && (
              <li
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                … and {expiringItems.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Dashboard Table + Cards */}
      <ComplianceDashboardClient
        data={dashboard}
        canManage={canManage}
        canExport={canExport}
      />
    </div>
  );
}
