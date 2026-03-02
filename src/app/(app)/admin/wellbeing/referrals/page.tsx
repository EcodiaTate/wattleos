import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listReferrals } from "@/lib/actions/wellbeing";
import { ReferralStatusBadge } from "@/components/domain/wellbeing/referral-status-badge";
import { REFERRAL_SPECIALTY_CONFIG } from "@/lib/constants/wellbeing";

export const metadata = { title: "Referrals - WattleOS" };

export default async function ReferralsPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_WELLBEING) ||
    hasPermission(context, Permissions.MANAGE_WELLBEING) ||
    hasPermission(context, Permissions.MANAGE_REFERRALS);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_REFERRALS);
  const result = await listReferrals({ per_page: 50 });

  if (result.error) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>{result.error.message}</p>
      </div>
    );
  }

  const referrals = result.data ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Student Referrals
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Internal and external specialist referrals
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/wellbeing"
            className="text-sm font-medium"
            style={{ color: "var(--primary)" }}
          >
            ← Dashboard
          </Link>
          {canManage && (
            <Link
              href="/admin/wellbeing/referrals/new"
              className="active-push touch-target inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              + New Referral
            </Link>
          )}
        </div>
      </div>

      {referrals.length === 0 ? (
        <div
          className="rounded-lg border border-border p-12 text-center"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div
            className="mx-auto mb-3 text-4xl"
            style={{ color: "var(--empty-state-icon)" }}
          >
            📋
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            No referrals
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            Student referrals to specialists will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {referrals.map((ref) => {
            const specCfg = REFERRAL_SPECIALTY_CONFIG[ref.specialty];
            return (
              <Link
                key={ref.id}
                href={`/admin/wellbeing/referrals/${ref.id}`}
                className="card-interactive block rounded-lg border border-border p-4"
                style={{ backgroundColor: "var(--card)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p
                      className="font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {ref.students.preferred_name ||
                        `${ref.students.first_name} ${ref.students.last_name}`}
                    </p>
                    <p
                      className="mt-0.5 text-sm"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {specCfg?.emoji} {specCfg?.label}
                      {ref.referred_to_name ? ` - ${ref.referred_to_name}` : ""}
                      {ref.referred_to_organisation
                        ? ` (${ref.referred_to_organisation})`
                        : ""}
                    </p>
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {ref.referral_type === "internal"
                        ? "Internal"
                        : "External"}{" "}
                      · Created{" "}
                      {new Date(ref.created_at).toLocaleDateString("en-AU")}
                      {ref.follow_up_date
                        ? ` · Follow-up: ${new Date(ref.follow_up_date).toLocaleDateString("en-AU")}`
                        : ""}
                    </p>
                  </div>
                  <ReferralStatusBadge status={ref.status} size="sm" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
