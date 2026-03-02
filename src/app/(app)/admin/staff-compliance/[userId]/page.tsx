import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getStaffComplianceDetail } from "@/lib/actions/staff-compliance";
import { ComplianceProfileForm } from "@/components/domain/staff-compliance/compliance-profile-form";
import { CertificateSection } from "@/components/domain/staff-compliance/certificate-form";
import { ComplianceStatusPill } from "@/components/domain/staff-compliance/compliance-status-pill";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function StaffComplianceDetailPage({ params }: Props) {
  const { userId } = await params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_STAFF_COMPLIANCE) ||
    hasPermission(context, Permissions.MANAGE_STAFF_COMPLIANCE);

  if (!canView) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(context, Permissions.MANAGE_STAFF_COMPLIANCE);

  const result = await getStaffComplianceDetail(userId);

  if (result.error || !result.data) {
    return (
      <div className="p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Staff member not found."}
        </p>
        <Link
          href="/admin/staff-compliance"
          className="mt-2 inline-block text-sm underline"
          style={{ color: "var(--primary)" }}
        >
          Back to compliance dashboard
        </Link>
      </div>
    );
  }

  const { user, profile, certificates, statuses, expiry_details } = result.data;
  const displayName =
    `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email;

  // Determine overall compliance status
  const allStatuses = [
    statuses.wwcc,
    statuses.first_aid,
    statuses.cpr,
    statuses.anaphylaxis,
    statuses.asthma,
    statuses.food_safety,
  ];
  const hasExpired =
    allStatuses.includes("expired") || allStatuses.includes("missing");
  const hasExpiring = allStatuses.includes("expiring_soon");
  const overallStatus = hasExpired || statuses.geccko === "missing"
    ? "non_compliant"
    : hasExpiring
      ? "expiring"
      : "compliant";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Breadcrumb */}
      <nav className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        <Link
          href="/admin/staff-compliance"
          className="hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Staff Compliance
        </Link>
        <span className="mx-1">/</span>
        <span>{displayName}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-4">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold"
            style={{
              backgroundColor: "var(--muted)",
              color: "var(--muted-foreground)",
            }}
          >
            {(user.first_name?.[0] ?? user.email[0]).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {displayName}
            </h1>
            {overallStatus === "compliant" && (
              <ComplianceStatusPill status="valid" />
            )}
            {overallStatus === "expiring" && (
              <ComplianceStatusPill status="expiring_soon" />
            )}
            {overallStatus === "non_compliant" && (
              <ComplianceStatusPill status="expired" />
            )}
          </div>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {user.email}
            {profile?.position_title && ` · ${profile.position_title}`}
          </p>
        </div>
      </div>

      {/* Expiry Summary Bar */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {expiry_details.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            style={{ backgroundColor: "var(--card)" }}
          >
            <span
              className="text-xs font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {item.label}
            </span>
            <div className="flex items-center gap-2">
              {item.days_remaining !== null && (
                <span
                  className="text-xs tabular-nums"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {item.days_remaining <= 0
                    ? "overdue"
                    : `${item.days_remaining}d`}
                </span>
              )}
              <ComplianceStatusPill status={item.status} compact />
            </div>
          </div>
        ))}
      </div>

      {/* Two-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Compliance Profile Form */}
        <div
          className="rounded-lg border border-border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <ComplianceProfileForm
            userId={userId}
            profile={profile}
            canManage={canManage}
          />
        </div>

        {/* Right: Certificates */}
        <div
          className="rounded-lg border border-border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <CertificateSection
            userId={userId}
            certificates={certificates}
            canManage={canManage}
          />
        </div>
      </div>
    </div>
  );
}
